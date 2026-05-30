from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.database import get_db
from backend.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from backend.services.workflow_service import workflow_service

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await workflow_service.list_workflows(db, skip=skip, limit=limit)

@router.get("/templates", response_model=List[dict])
async def list_templates(db: AsyncSession = Depends(get_db)):
    return await workflow_service.list_templates(db)

@router.post("/", response_model=WorkflowResponse)
async def create_workflow(workflow_in: WorkflowCreate, db: AsyncSession = Depends(get_db)):
    return await workflow_service.create_workflow(db, workflow_in)

@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    return await workflow_service.get_workflow(db, workflow_id)

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: int, workflow_in: WorkflowUpdate, db: AsyncSession = Depends(get_db)):
    return await workflow_service.update_workflow(db, workflow_id, workflow_in)

@router.delete("/{workflow_id}", response_model=dict)
async def delete_workflow(workflow_id: int, db: AsyncSession = Depends(get_db)):
    success = await workflow_service.delete_workflow(db, workflow_id)
    if not success:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "success"}
