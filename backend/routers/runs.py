from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database import get_db
from backend.services.run_service import run_service

router = APIRouter(prefix="/runs", tags=["runs"])

from backend.dependencies import get_agents_client
from backend.clients.agents_client import AgentsClient

@router.post("/")
async def start_run(
    workflow_id: int, 
    input_data: str, 
    db: AsyncSession = Depends(get_db),
    agents_client: AgentsClient = Depends(get_agents_client)
):
    run_id = await run_service.start_run(db, workflow_id, input_data, agents_client)
    return {"run_id": run_id}
