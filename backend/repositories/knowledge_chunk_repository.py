from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import KnowledgeChunk

class KnowledgeChunkRepository(BaseRepository[KnowledgeChunk]):
    def __init__(self):
        super().__init__(model_class=KnowledgeChunk)

    async def delete_by_document_id(self, db: AsyncSession, document_id: int):
        await db.execute(delete(self.model_class).where(self.model_class.document_id == document_id))
        await db.commit()

knowledge_chunk_repository = KnowledgeChunkRepository()
