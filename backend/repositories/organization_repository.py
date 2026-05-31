from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

from backend.repositories.base import BaseRepository
from backend.models import Organization

class OrganizationRepository(BaseRepository[Organization]):
    def __init__(self):
        super().__init__(model_class=Organization)

organization_repository = OrganizationRepository()
