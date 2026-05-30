from backend.repositories.base import BaseRepository
from backend.models import WorkflowTrigger
from backend.schemas.workflow import WorkflowTriggerResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

class WorkflowTriggerRepository(BaseRepository[WorkflowTrigger]):
    def __init__(self):
        super().__init__(WorkflowTrigger, dto_class=WorkflowTriggerResponse)

    async def get_by_workflow_id(self, db: AsyncSession, workflow_id: int) -> List[WorkflowTriggerResponse]:
        result = await db.execute(select(self.model_class).where(self.model_class.workflow_id == workflow_id))
        return [self._map_to_dto(obj) for obj in result.scalars().all()]
        
    async def get_entities_by_workflow_id(self, db: AsyncSession, workflow_id: int) -> List[WorkflowTrigger]:
        """Returns raw SQLAlchemy entities, useful for updates and deletes."""
        result = await db.execute(select(self.model_class).where(self.model_class.workflow_id == workflow_id))
        return result.scalars().all()

workflow_trigger_repository = WorkflowTriggerRepository()
