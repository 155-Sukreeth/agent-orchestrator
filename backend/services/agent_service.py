from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.agent_repository import agent_repository
from backend.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from typing import List

class AgentService:
    async def get_agent(self, db: AsyncSession, agent_id: int, org_id: int) -> AgentResponse:
        agent = await agent_repository.get_by_id(db, agent_id, org_id)
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        return AgentResponse.model_validate(agent)

    async def list_agents(self, db: AsyncSession, org_id: int, skip: int = 0, limit: int = 100) -> List[AgentResponse]:
        agents = await agent_repository.get_all(db, org_id, skip, limit)
        return [AgentResponse.model_validate(a) for a in agents]

    async def create_agent(self, db: AsyncSession, agent_in: AgentCreate, org_id: int) -> AgentResponse:
        agent = await agent_repository.create(db, agent_in.model_dump(), org_id)
        return AgentResponse.model_validate(agent)

    async def update_agent(self, db: AsyncSession, agent_id: int, agent_in: AgentUpdate, org_id: int) -> AgentResponse:
        db_agent = await agent_repository.get_by_id(db, agent_id, org_id)
        if not db_agent:
            raise ValueError(f"Agent {agent_id} not found")
        updated_agent = await agent_repository.update(db, db_agent, agent_in.model_dump(exclude_unset=True))
        return AgentResponse.model_validate(updated_agent)

agent_service = AgentService()
