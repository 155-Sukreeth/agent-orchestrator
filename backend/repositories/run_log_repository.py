from backend.repositories.base import BaseRepository
from backend.models import RunLog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import insert
from typing import List

class RunLogRepository(BaseRepository[RunLog]):
    def __init__(self):
        super().__init__(RunLog)

    async def bulk_insert(self, db: AsyncSession, logs_data: List[dict]):
        """Inserts multiple run logs efficiently."""
        if not logs_data:
            return
        await db.execute(insert(self.model_class).values(logs_data))
        await db.commit()

run_log_repository = RunLogRepository()
