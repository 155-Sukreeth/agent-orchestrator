from backend.repositories.base import BaseRepository
from backend.models import Workflow
from backend.schemas.workflow import WorkflowResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self):
        super().__init__(Workflow, dto_class=WorkflowResponse)
        
    async def get_by_id(self, db: AsyncSession, id: int) -> Optional[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(self.model_class).options(selectinload(self.model_class.triggers)).where(self.model_class.id == id))
        return self._map_to_dto(result.scalar_one_or_none())

    async def get_entity_by_id(self, db: AsyncSession, id: int) -> Optional[Workflow]:
        result = await db.execute(select(self.model_class).where(self.model_class.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(self.model_class).options(selectinload(self.model_class.triggers)).offset(skip).limit(limit))
        return [self._map_to_dto(obj) for obj in result.scalars().all()]
        
    async def get_active_workflows(self, db: AsyncSession) -> List[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        result = await db.execute(select(self.model_class).options(selectinload(self.model_class.triggers)).where(self.model_class.is_active == True))
        return [self._map_to_dto(obj) for obj in result.scalars().all()]

    async def create(self, db: AsyncSession, obj_in: dict) -> WorkflowResponse:
        db_obj = self.model_class(**obj_in)
        db.add(db_obj)
        await db.commit()
        return await self.get_by_id(db, db_obj.id)

    async def update(self, db: AsyncSession, db_obj: Workflow, obj_in: dict) -> WorkflowResponse:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        return await self.get_by_id(db, db_obj.id)

workflow_repository = WorkflowRepository()
