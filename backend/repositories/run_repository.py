from backend.repositories.base import BaseRepository
from backend.models import Run

class RunRepository(BaseRepository[Run]):
    def __init__(self):
        super().__init__(Run)

run_repository = RunRepository()
