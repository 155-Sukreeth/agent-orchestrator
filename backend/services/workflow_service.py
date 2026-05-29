from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.workflow_repository import workflow_repository
from backend.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from typing import List

class WorkflowService:
    async def get_workflow(self, db: AsyncSession, workflow_id: int, org_id: int) -> WorkflowResponse:
        workflow = await workflow_repository.get_by_id(db, workflow_id, org_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        return WorkflowResponse.model_validate(workflow)

    async def list_workflows(self, db: AsyncSession, org_id: int, skip: int = 0, limit: int = 100) -> List[WorkflowResponse]:
        workflows = await workflow_repository.get_all(db, org_id, skip, limit)
        return [WorkflowResponse.model_validate(w) for w in workflows]

    async def create_workflow(self, db: AsyncSession, workflow_in: WorkflowCreate, org_id: int) -> WorkflowResponse:
        workflow_data = workflow_in.model_dump()
        if "description_embedding" not in workflow_data or workflow_data["description_embedding"] is None:
            # Dummy embedding for MVP
            workflow_data["description_embedding"] = [0.0] * 1536 
            
        workflow = await workflow_repository.create(db, workflow_data, org_id)
        return WorkflowResponse.model_validate(workflow)

    async def update_workflow(self, db: AsyncSession, workflow_id: int, workflow_in: WorkflowUpdate, org_id: int) -> WorkflowResponse:
        db_workflow = await workflow_repository.get_by_id(db, workflow_id, org_id)
        if not db_workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        updated_workflow = await workflow_repository.update(db, db_workflow, workflow_in.model_dump(exclude_unset=True))
        return WorkflowResponse.model_validate(updated_workflow)

workflow_service = WorkflowService()
