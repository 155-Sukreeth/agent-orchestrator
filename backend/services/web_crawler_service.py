import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from backend.models import Integration, IntegrationStatus
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
        
        from backend.services.knowledge_service import knowledge_service
        
        async with AsyncSessionLocal() as db:
            # 1. Update status
            integration = await db.get(Integration, integration_id)
            if integration:
                integration.status = IntegrationStatus.SYNCING
                await db.commit()
                
            # 2. Emit Start Event
            start_event = SyncStartEvent(integration_id=integration_id)
            await redis.publish(channel, start_event.model_dump_json())
    
            # 3. BFS Crawler Queue
            visited = set()
            queue = [(start_url, 0)]
            base_domain = urlparse(start_url).netloc
            
            while queue:
                current_url, depth = queue.pop(0)
                
                if current_url in visited or depth > max_depth:
                    continue
                    
                visited.add(current_url)
                
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
                            
                            # Hand off to knowledge service to chunk and embed
                            await knowledge_service.process_document(
                                integration_id=integration_id,
                                title=title,
                                url_or_path=current_url,
                                text=text,
                                db=db,
                                redis=redis,
                                channel=channel
                            )
                            
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
