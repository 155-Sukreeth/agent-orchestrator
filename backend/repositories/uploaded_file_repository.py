from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import UploadedFile

class UploadedFileRepository(BaseRepository[UploadedFile]):
    def __init__(self):
        super().__init__(model_class=UploadedFile)

    async def get_by_filename(self, db: AsyncSession, filename: str, org_id: int) -> Optional[UploadedFile]:
        result = await db.execute(
            select(self.model_class).where(
                self.model_class.filename == filename,
                self.model_class.organization_id == org_id
            )
        )
        return result.scalar_one_or_none()

uploaded_file_repository = UploadedFileRepository()
