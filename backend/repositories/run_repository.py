from backend.repositories.base import BaseRepository
from backend.models import Run
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

class RunRepository(BaseRepository[Run]):
    def __init__(self):
        super().__init__(Run)

    async def get_by_workflow_id(self, db: AsyncSession, workflow_id: int, skip: int = 0, limit: int = 100) -> List[Run]:
        stmt = select(self.model_class).filter(self.model_class.workflow_id == workflow_id).order_by(self.model_class.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_with_logs(self, db: AsyncSession, run_id: int) -> Run | None:
        stmt = select(self.model_class).options(selectinload(self.model_class.logs)).filter(self.model_class.id == run_id)
        result = await db.execute(stmt)
        return result.scalars().first()

run_repository = RunRepository()
