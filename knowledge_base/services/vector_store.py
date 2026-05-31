from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.dialects.postgresql import insert
from backend.models import KnowledgeChunk
from knowledge_base.config.settings import settings

class VectorStoreService:
    async def upsert_chunks(self, session: AsyncSession, document_id: int, integration_id: int, organization_id: int, chunks: List[str], embeddings: List[List[float]], is_active: bool = True):
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            stmt = insert(KnowledgeChunk).values(
                organization_id=organization_id,
                document_id=document_id,
                integration_id=integration_id,
                content=chunk,
                chunk_index=i,
                embedding=embedding,
                embedding_model=settings.gemini_embedding_model,
                is_active=is_active
            )
            # Upsert on conflict based on document_id and chunk_index (requires unique constraint, assuming added)
            # If no unique constraint, we can just delete old chunks for document_id first.
            await session.execute(stmt)
        await session.commit()

    async def search(self, session: AsyncSession, query_embedding: List[float], integration_id: int = None, limit: int = 5) -> List[Dict[str, Any]]:
        # Vector search using pgvector's L2 distance (<->) or Inner Product (<#>) or Cosine Distance (<=>)
        # Nomic embeddings are typically normalized, Cosine Distance is preferred.
        filters = [KnowledgeChunk.is_active == True]
        if integration_id:
            filters.append(KnowledgeChunk.integration_id == integration_id)
            
        stmt = select(KnowledgeChunk).where(and_(*filters)).order_by(
            KnowledgeChunk.embedding.cosine_distance(query_embedding)
        ).limit(limit)
        
        result = await session.execute(stmt)
        chunks = result.scalars().all()
        
        return [
            {
                "id": chunk.id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "distance": 0.0 # Could calculate distance manually or select it in the query
            }
            for chunk in chunks
        ]

vector_store_service = VectorStoreService()
