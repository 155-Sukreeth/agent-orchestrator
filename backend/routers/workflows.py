from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database import get_db
from backend.models import Organization
from backend.auth.dependencies import get_current_org
from backend.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from backend.services.workflow_service import workflow_service

router = APIRouter(tags=["workflows"])

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    return await workflow_service.list_workflows(db, current_org.id, skip=skip, limit=limit)

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(workflow_in: WorkflowCreate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    return await workflow_service.create_workflow(db, workflow_in, current_org.id)

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    return await workflow_service.get_workflow(db, workflow_id, current_org.id)

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: int, workflow_in: WorkflowUpdate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    return await workflow_service.update_workflow(db, workflow_id, workflow_in, current_org.id)
