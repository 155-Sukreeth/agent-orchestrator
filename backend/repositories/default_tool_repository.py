from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import DefaultTool

class DefaultToolRepository(BaseRepository[DefaultTool]):
    def __init__(self):
        super().__init__(model_class=DefaultTool)

    async def get_active_tools(self, db: AsyncSession) -> List[DefaultTool]:
        result = await db.execute(select(self.model_class).where(self.model_class.is_active == True))
        return result.scalars().all()

default_tool_repository = DefaultToolRepository()
