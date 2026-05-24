from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database import get_db
from backend.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from backend.services.agent_service import agent_service

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("/", response_model=List[AgentResponse])
async def list_agents(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await agent_service.list_agents(db, skip=skip, limit=limit)

@router.post("/", response_model=AgentResponse)
async def create_agent(agent_in: AgentCreate, db: AsyncSession = Depends(get_db)):
    return await agent_service.create_agent(db, agent_in)

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    return await agent_service.get_agent(db, agent_id)

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: int, agent_in: AgentUpdate, db: AsyncSession = Depends(get_db)):
    return await agent_service.update_agent(db, agent_id, agent_in)
