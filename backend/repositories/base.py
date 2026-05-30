from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import TypeVar, Generic, Type, Optional, List, Any

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model_class: Type[T], dto_class: Optional[Type[Any]] = None):
        self.model_class = model_class
        self.dto_class = dto_class

    def _map_to_dto(self, obj: T) -> Any:
        if obj is None:
            return None
        if self.dto_class:
            return self.dto_class.model_validate(obj)
        return obj

    async def get_by_id(self, db: AsyncSession, id: Any) -> Optional[Any]:
        result = await db.execute(select(self.model_class).where(self.model_class.id == id))
        return self._map_to_dto(result.scalar_one_or_none())

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Any]:
        result = await db.execute(select(self.model_class).offset(skip).limit(limit))
        return [self._map_to_dto(obj) for obj in result.scalars().all()]

    async def create(self, db: AsyncSession, obj_in: dict) -> Any:
        db_obj = self.model_class(**obj_in)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self._map_to_dto(db_obj)

    async def update(self, db: AsyncSession, db_obj: T, obj_in: dict) -> Any:
        # Note: db_obj MUST be the SQLAlchemy entity, not the DTO.
        for field, value in obj_in.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return self._map_to_dto(db_obj)

    async def delete(self, db: AsyncSession, id: Any) -> bool:
        obj = await self.get_by_id(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
            return True
        return False
