from backend.repositories.base import BaseRepository
from backend.models import User

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

class UserRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(model_class=User)

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[User]:
        result = await db.execute(select(self.model_class).where(self.model_class.email == email))
        return result.scalar_one_or_none()

user_repository = UserRepository()
