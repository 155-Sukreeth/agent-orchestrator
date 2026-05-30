from backend.repositories.base import BaseRepository
from backend.models import Workflow
from backend.schemas.workflow import WorkflowResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self):
        super().__init__(Workflow, dto_class=WorkflowResponse)
        
    async def get_by_id(self, db: AsyncSession, id: int, org_id: Optional[int] = None) -> Optional[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        query = select(self.model_class).options(selectinload(self.model_class.triggers)).where(self.model_class.id == id)
        if org_id is not None:
            query = query.where(self.model_class.organization_id == org_id)
        result = await db.execute(query)
        return self._map_to_dto(result.scalar_one_or_none())

    async def get_entity_by_id(self, db: AsyncSession, id: int) -> Optional[Workflow]:
        result = await db.execute(select(self.model_class).where(self.model_class.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, org_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        query = select(self.model_class).options(selectinload(self.model_class.triggers))
        if org_id is not None:
            query = query.where(self.model_class.organization_id == org_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return [self._map_to_dto(obj) for obj in result.scalars().all()]
        
    async def get_active_workflows(self, db: AsyncSession, org_id: Optional[int] = None) -> List[WorkflowResponse]:
        from sqlalchemy.orm import selectinload
        query = select(self.model_class).options(selectinload(self.model_class.triggers)).where(self.model_class.is_active == True)
        if org_id is not None:
            query = query.where(self.model_class.organization_id == org_id)
        result = await db.execute(query)
        return [self._map_to_dto(obj) for obj in result.scalars().all()]

    async def create(self, db: AsyncSession, obj_in: dict, org_id: Optional[int] = None) -> WorkflowResponse:
        if org_id is not None:
            obj_in['organization_id'] = org_id
        db_obj = self.model_class(**obj_in)
        db.add(db_obj)
        await db.commit()
        return await self.get_by_id(db, db_obj.id, org_id)

    async def update(self, db: AsyncSession, db_obj: Workflow, obj_in: dict, org_id: Optional[int] = None) -> WorkflowResponse:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        return await self.get_by_id(db, db_obj.id, org_id)

workflow_repository = WorkflowRepository()
