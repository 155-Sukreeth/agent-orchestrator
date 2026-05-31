from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import AgentTool

class AgentToolRepository(BaseRepository[AgentTool]):
    def __init__(self):
        super().__init__(model_class=AgentTool)

    async def delete_by_integration_id(self, db: AsyncSession, integration_id: int):
        await db.execute(delete(self.model_class).where(self.model_class.integration_id == integration_id))
        await db.commit()

agent_tool_repository = AgentToolRepository()
