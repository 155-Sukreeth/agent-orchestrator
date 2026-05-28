import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import KnowledgeDocument, KnowledgeChunk, Integration, IntegrationStatus
from backend.schemas.integration import SyncStartEvent, SyncProgressEvent, SyncCompleteEvent, DocumentData
import logging
from sqlalchemy import func

logger = logging.getLogger(__name__)

class KnowledgeService:
    def __init__(self):
        self.ollama_url = "http://ollama:11434/api/embeddings"
        self.embedding_model = "nomic-embed-text"
        
    def split_text(self, text: str, chunk_size: int = 1000, chunk_overlap: int = 100) -> list[str]:
        """Simple recursive character text splitter."""
        if not text:
            return []
            
        chunks = []
        i = 0
        while i < len(text):
            chunk = text[i:i + chunk_size]
            chunks.append(chunk)
            i += chunk_size - chunk_overlap
            
        return chunks

    async def get_embedding(self, text: str) -> list[float]:
        """Fetch embedding from Ollama."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.ollama_url,
                    json={
                        "model": self.embedding_model,
                        "prompt": text
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return data.get("embedding", [])
            except Exception as e:
                logger.error(f"Error generating embedding: {e}")
                return []

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

    async def process_url(self, url: str, integration_id: int, db: AsyncSession, redis, channel: str) -> int:
        """Fetch a single URL, extract text, chunk, embed, and store in DB. Returns chunk count."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                html = response.text
                
                # 1. Extract Text
                text = self.extract_text_from_html(html)
                soup = BeautifulSoup(html, "html.parser")
                title = soup.title.string if soup.title else url
                
                # 2. Split into chunks
                chunks = self.split_text(text)
                
                # 3. Create Document
                doc = KnowledgeDocument(
                    integration_id=integration_id,
                    title=title[:255],
                    url_or_path=url,
                    is_active=True,
                    metadata_json={"chunks": len(chunks)}
                )
                db.add(doc)
                await db.commit()
                await db.refresh(doc)
                
                # 4. Generate Embeddings & Save Chunks
                for i, chunk_text in enumerate(chunks):
                    embedding = await self.get_embedding(chunk_text)
                    if embedding:
                        chunk_record = KnowledgeChunk(
                            document_id=doc.id,
                            integration_id=integration_id,
                            content=chunk_text,
                            chunk_index=i,
                            embedding=embedding,
                            embedding_model=self.embedding_model,
                            is_active=True
                        )
                        db.add(chunk_record)
                
                await db.commit()
                
                # 5. Emit Progress
                progress_event = SyncProgressEvent(
                    document=DocumentData(
                        id=doc.id,
                        title=doc.title,
                        url=doc.url_or_path,
                        isActive=doc.is_active,
                        chunks=len(chunks)
                    ),
                    progress="Processing..."
                )
                await redis.publish(channel, progress_event.model_dump_json())
                
                return len(chunks)
                
            except Exception as e:
                logger.error(f"Error processing URL {url}: {e}")
                return 0

    async def execute_web_crawl(self, integration_id: int, config: dict, redis):
        """BFS Web Crawler implementation."""
        start_url = config.get("url")
        max_depth = config.get("depth", 2)
        
        if not start_url:
            return

        channel = f"integration_stream:{integration_id}"
        
        from backend.database import AsyncSessionLocal
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
                            soup = BeautifulSoup(response.text, "html.parser")
                            for link in soup.find_all("a", href=True):
                                next_url = urljoin(current_url, link["href"])
                                # Only crawl within the same domain
                                if urlparse(next_url).netloc == base_domain and next_url not in visited:
                                    queue.append((next_url, depth + 1))
                    except Exception as e:
                        logger.error(f"Error fetching links from {current_url}: {e}")
                        
                # Process the actual page content
                await self.process_url(current_url, integration_id, db, redis, channel)
                
            # 4. Finish
            if integration:
                integration.status = IntegrationStatus.SYNCED
                integration.last_sync = func.now()
                await db.commit()
                
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

knowledge_service = KnowledgeService()
