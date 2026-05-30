from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from backend.database import get_db
from backend.services.run_service import run_service
from backend.schemas.run import RunResponse, RunDetailResponse
from backend.dependencies import get_agents_client
from backend.clients.agents_client import AgentsClient

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/workflow/{workflow_id}", response_model=List[RunResponse])
async def list_runs_for_workflow(
    workflow_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db)
):
    return await run_service.list_runs_for_workflow(db, workflow_id, skip=skip, limit=limit)

@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await run_service.get_run_with_logs(db, run_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

from pydantic import BaseModel
from typing import Any
from backend.schemas.triggers.manual import ManualTriggerPayload
from backend.mappers.trigger_mapper import trigger_mapper

class RunRequest(BaseModel):
    workflow_id: int
    payload: ManualTriggerPayload
    run_type: str = "test"

@router.post("/")
async def start_run(
    request: RunRequest,
    db: AsyncSession = Depends(get_db),
    agents_client: AgentsClient = Depends(get_agents_client)
):
    # run_id is assigned by the DB inside run_service; pass a placeholder so mapper
    # can build the object — run_service replaces it with the real ID before dispatch.
    agent_payload = trigger_mapper.from_manual(
        payload=request.payload,
        run_id="pending",
        workflow_config={},  # workflow_config is fetched inside run_service
    )
    run_id = await run_service.start_run(
        db, request.workflow_id, agent_payload, agents_client, run_type=request.run_type
    )
    return {"run_id": run_id}

from backend.schemas.run import RunUpdate
from datetime import datetime

@router.patch("/{run_id}", response_model=RunResponse)
async def update_run_status(
    run_id: int,
    update_data: RunUpdate,
    db: AsyncSession = Depends(get_db)
):
    try:
        data = update_data.model_dump(exclude_unset=True)
        # If completing, set completed_at if not provided
        if data.get("status") in ["completed", "failed"] and "completed_at" not in data:
            data["completed_at"] = datetime.utcnow()
            
        updated_run = await run_service.update_run(db, run_id, data)
        return updated_run
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

