import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from backend.models import Integration, IntegrationStatus, KnowledgeDocument
from backend.schemas.integration import SyncStartEvent, SyncCompleteEvent
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
            # 1. Update status
            integration = await db.get(Integration, integration_id)
            if integration:
                integration.status = IntegrationStatus.SYNCING
                await db.commit()
                
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
                            doc = KnowledgeDocument(
                                integration_id=integration_id,
                                title=title[:255],
                                url_or_path=current_url,
                                is_active=True,
                                metadata_json={"chunks": 0}
                            )
                            db.add(doc)
                            await db.commit()
                            await db.refresh(doc)
                            
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
                                doc.metadata_json = {"chunks": chunks_count}
                                db.add(doc)
                                await db.commit()
                                
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
                            
                    except Exception as e:
                        logger.error(f"Error processing URL {current_url}: {e}")
                        
            # 4. Finish
            if integration:
                integration.status = IntegrationStatus.SYNCED
                integration.last_sync = func.now()
                await db.commit()
                
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

web_crawler_service = WebCrawlerService()
