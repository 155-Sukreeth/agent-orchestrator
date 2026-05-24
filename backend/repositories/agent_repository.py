from backend.repositories.base import BaseRepository
from backend.models import Agent

class AgentRepository(BaseRepository[Agent]):
    def __init__(self):
        super().__init__(Agent)

agent_repository = AgentRepository()
