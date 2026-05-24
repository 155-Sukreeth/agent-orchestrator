from backend.repositories.base import BaseRepository
from backend.models import Workflow

class WorkflowRepository(BaseRepository[Workflow]):
    def __init__(self):
        super().__init__(Workflow)

workflow_repository = WorkflowRepository()
