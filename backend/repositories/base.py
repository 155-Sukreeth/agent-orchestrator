from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import TypeVar, Generic, Type, Optional, List, Any

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model_class: Type[T]):
        self.model_class = model_class

    async def get_by_id(self, db: AsyncSession, id: Any, org_id: int) -> Optional[T]:
        result = await db.execute(select(self.model_class).where(self.model_class.id == id, getattr(self.model_class, 'organization_id') == org_id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, org_id: int, skip: int = 0, limit: int = 100) -> List[T]:
        result = await db.execute(select(self.model_class).where(getattr(self.model_class, 'organization_id') == org_id).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: dict, org_id: int) -> T:
        obj_in['organization_id'] = org_id
        db_obj = self.model_class(**obj_in)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: T, obj_in: dict) -> T:
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, id: Any, org_id: int) -> bool:
        obj = await self.get_by_id(db, id, org_id)
        if obj:
            await db.delete(obj)
            await db.commit()
            return True
        return False
