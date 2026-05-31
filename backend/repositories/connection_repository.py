from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import AppConnection

class ConnectionRepository(BaseRepository[AppConnection]):
    def __init__(self):
        super().__init__(model_class=AppConnection)

    async def get_by_name(self, db: AsyncSession, name: str, org_id: int) -> Optional[AppConnection]:
        result = await db.execute(
            select(self.model_class).where(
                self.model_class.name == name,
                self.model_class.organization_id == org_id
            )
        )
        return result.scalar_one_or_none()

    async def get_active_channels(self, db: AsyncSession, org_id: int) -> List[str]:
        result = await db.execute(
            select(self.model_class.type)
            .where(
                self.model_class.organization_id == org_id,
                self.model_class.is_active == True
            )
            .distinct()
        )
        return [conn_type.value for conn_type in result.scalars().all()]

connection_repository = ConnectionRepository()
