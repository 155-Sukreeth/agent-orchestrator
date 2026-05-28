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

    async def process_document(self, integration_id: int, title: str, url_or_path: str, text: str, db: AsyncSession, redis, channel: str) -> int:
        """Process raw text: chunk it, generate embeddings, and store in DB."""
        try:
            # 1. Split into chunks
            chunks = self.split_text(text)
            
            # 2. Create Document
            doc = KnowledgeDocument(
                integration_id=integration_id,
                title=title[:255],
                url_or_path=url_or_path,
                is_active=True,
                metadata_json={"chunks": len(chunks)}
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            
            # 3. Generate Embeddings & Save Chunks
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
            
            # 4. Emit Progress
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
            logger.error(f"Error processing document {title}: {e}")
            return 0

knowledge_service = KnowledgeService()
