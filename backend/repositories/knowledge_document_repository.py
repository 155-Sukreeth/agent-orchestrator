from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import KnowledgeDocument

class KnowledgeDocumentRepository(BaseRepository[KnowledgeDocument]):
    def __init__(self):
        super().__init__(model_class=KnowledgeDocument)

    async def delete_by_integration_id(self, db: AsyncSession, integration_id: int):
        await db.execute(delete(self.model_class).where(self.model_class.integration_id == integration_id))
        await db.commit()

    async def get_by_url(self, db: AsyncSession, url: str, integration_id: int) -> Optional[KnowledgeDocument]:
        result = await db.execute(
            select(self.model_class).where(
                self.model_class.url_or_path == url,
                self.model_class.integration_id == integration_id
            )
        )
        return result.scalar_one_or_none()

knowledge_document_repository = KnowledgeDocumentRepository()
