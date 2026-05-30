from backend.repositories.base import BaseRepository
from backend.models import Workflow
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self):
        super().__init__(Workflow)
        
    async def get_by_id(self, db: AsyncSession, id: int) -> Optional[Workflow]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(self.model_class).options(selectinload(self.model_class.triggers)).where(self.model_class.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Workflow]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(self.model_class).options(selectinload(self.model_class.triggers)).offset(skip).limit(limit))
        return result.scalars().all()

workflow_repository = WorkflowRepository()
