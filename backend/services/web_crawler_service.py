import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from backend.models import Integration, IntegrationStatus, KnowledgeDocument
from backend.schemas.integration import SyncStartEvent, SyncCompleteEvent, SyncErrorEvent
from backend.database import AsyncSessionLocal
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

class WebCrawlerService:
    def extract_text_from_html(self, html: str) -> str:
        """Extract main text content from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        text = soup.get_text(separator="\n")
        
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = "\n".join(chunk for chunk in chunks if chunk)
        
        return text

    async def execute_web_crawl(self, integration_id: int, config: dict, redis):
        """BFS Web Crawler implementation."""
        start_url = config.get("url")
        max_depth = config.get("depth", 2)
        
        if not start_url:
            return

        channel = f"integration_stream:{integration_id}"
        
        
        async with AsyncSessionLocal() as db:
            from backend.repositories.integration_repository import integration_repository
            from backend.repositories.knowledge_document_repository import knowledge_document_repository
            
            # 1. Update status
            integration = await integration_repository.get_by_id(db, integration_id)
            if integration:
                integration = await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCING})
                
            # 2. Emit Start Event
            start_event = SyncStartEvent(integration_id=integration_id)
            await redis.publish(channel, start_event.model_dump_json())
    
            # 3. BFS Crawler Queue & robots.txt parsing
            import urllib.robotparser
            import asyncio
            
            parsed_start = urlparse(start_url)
            base_url = f"{parsed_start.scheme}://{parsed_start.netloc}"
            base_domain = parsed_start.netloc
            
            rp = urllib.robotparser.RobotFileParser()
            rp.set_url(f"{base_url}/robots.txt")
            
            async with httpx.AsyncClient() as client:
                try:
                    robots_resp = await client.get(f"{base_url}/robots.txt", timeout=5.0)
                    if robots_resp.status_code == 200:
                        rp.parse(robots_resp.text.splitlines())
                except Exception as e:
                    logger.warning(f"Could not fetch robots.txt for {base_domain}: {e}")
            
            visited = set()
            queue = [(start_url, 0)]
            
            while queue:
                current_url, depth = queue.pop(0)
                
                if current_url in visited or depth > max_depth:
                    continue
                    
                if not rp.can_fetch("*", current_url):
                    logger.info(f"Skipping {current_url} due to robots.txt restrictions")
                    continue
                    
                visited.add(current_url)
                
                delay = rp.crawl_delay("*")
                if delay:
                    await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(0.5) # Polite default delay
                
                # Extract links and process
                async with httpx.AsyncClient() as client:
                    try:
                        response = await client.get(current_url, timeout=10.0)
                        if response.status_code == 200:
                            html = response.text
                            soup = BeautifulSoup(html, "html.parser")
                            
                            # Add links to queue
                            for link in soup.find_all("a", href=True):
                                next_url = urljoin(current_url, link["href"])
                                # Only crawl within the same domain
                                if urlparse(next_url).netloc == base_domain and next_url not in visited:
                                    queue.append((next_url, depth + 1))
                                    
                            # Process the actual page content
                            text = self.extract_text_from_html(html)
                            title = soup.title.string if soup.title else current_url
                            
                            # Create Document
                            doc_data = {
                                "organization_id": integration.organization_id if integration else None,
                                "integration_id": integration_id,
                                "title": title[:255],
                                "url_or_path": current_url,
                                "is_active": True,
                                "metadata_json": {"chunks": 0}
                            }
                            doc = await knowledge_document_repository.create(db, doc_data)
                            
                            # Hand off to knowledge_base microservice to chunk and embed
                            try:
                                upsert_resp = await client.post(
                                    "http://knowledge_base:8002/v1/upsert",
                                    json={
                                        "document_id": doc.id,
                                        "content": text,
                                        "content_type": "text"
                                    },
                                    timeout=60.0
                                )
                                upsert_resp.raise_for_status()
                                chunks_count = upsert_resp.json().get("chunks", 0)
                                
                                # Update chunks count
                                doc = await knowledge_document_repository.update(db, doc, {"metadata_json": {"chunks": chunks_count}})
                                
                                # Emit Progress
                                from backend.schemas.integration import SyncProgressEvent, DocumentData
                                progress_event = SyncProgressEvent(
                                    document=DocumentData(
                                        id=doc.id,
                                        title=doc.title,
                                        url=doc.url_or_path,
                                        isActive=doc.is_active,
                                        chunks=chunks_count
                                    ),
                                    progress="Processing..."
                                )
                                await redis.publish(channel, progress_event.model_dump_json())
                            except Exception as e:
                                logger.error(f"Error calling knowledge_base for {current_url}: {e}")
                                await db.rollback()
                                
                                doc = await knowledge_document_repository.get_by_id(db, doc.id)
                                if doc:
                                    await knowledge_document_repository.update(db, doc, {"metadata_json": {"error": str(e), "chunks": 0}})
                                
                                integration = await integration_repository.get_by_id(db, integration_id)
                                if integration:
                                    await integration_repository.update(db, integration, {"status": IntegrationStatus.ERROR})
                                # Abort the entire crawl on fatal error (e.g. API keys invalid, DB down)
                                error_event = SyncErrorEvent(integration_id=integration_id, error=str(e))
                                await redis.publish(channel, error_event.model_dump_json())
                                return
                                
                    except Exception as e:
                        logger.error(f"Error processing URL {current_url}: {e}")
                        
            # 4. Finish normally
            if integration:
                integration = await integration_repository.get_by_id(db, integration_id)
                await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCED, "last_sync": func.now()})
                
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

web_crawler_service = WebCrawlerService()
