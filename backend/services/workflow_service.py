from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.workflow_repository import workflow_repository
from backend.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from typing import List

class WorkflowService:
    async def get_workflow(self, db: AsyncSession, workflow_id: int) -> WorkflowResponse:
        workflow = await workflow_repository.get_by_id(db, workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        return WorkflowResponse.model_validate(workflow)

    async def list_workflows(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[WorkflowResponse]:
        workflows = await workflow_repository.get_all(db, skip, limit)
        return [WorkflowResponse.model_validate(w) for w in workflows]

    async def list_templates(self, db: AsyncSession) -> List[dict]:
        from backend.models import DefaultWorkflowTemplate
        from sqlalchemy import select
        result = await db.execute(select(DefaultWorkflowTemplate))
        return [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "graph_definition": t.graph_definition,
                "created_at": t.created_at
            }
            for t in result.scalars().all()
        ]

    async def create_workflow(self, db: AsyncSession, workflow_in: WorkflowCreate) -> WorkflowResponse:

        workflow_data = workflow_in.model_dump()
        if "description_embedding" not in workflow_data or workflow_data["description_embedding"] is None:
            # Dummy embedding for MVP
            workflow_data["description_embedding"] = [0.0] * 1536 
            
        workflow = await workflow_repository.create(db, workflow_data)
        
        # Refetch to eager-load relationships (like triggers) for Pydantic validation
        workflow_with_rels = await workflow_repository.get_by_id(db, workflow.id)
        
        return WorkflowResponse.model_validate(workflow_with_rels)

    async def update_workflow(self, db: AsyncSession, workflow_id: int, workflow_in: WorkflowUpdate) -> WorkflowResponse:
        db_workflow = await workflow_repository.get_by_id(db, workflow_id)
        if not db_workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        update_data = workflow_in.model_dump(exclude_unset=True)
        triggers_data = update_data.pop("triggers", None)
        
        # Update workflow base fields
        updated_workflow = await workflow_repository.update(db, db_workflow, update_data)
        
        # Handle triggers upsert
        if triggers_data is not None:
            from backend.models import WorkflowTrigger
            from sqlalchemy.future import select
            
            # Get existing triggers
            result = await db.execute(select(WorkflowTrigger).where(WorkflowTrigger.workflow_id == workflow_id))
            existing_triggers = {str(t.id): t for t in result.scalars().all()}
            
            incoming_ids = set()
            
            for t_data in triggers_data:
                t_id = t_data.get("id")
                if t_id and str(t_id) in existing_triggers:
                    # Update
                    t_obj = existing_triggers[str(t_id)]
                    for k, v in t_data.items():
                        if k != "id" and v is not None:
                            setattr(t_obj, k, v)
                    incoming_ids.add(str(t_id))
                else:
                    # Insert
                    new_t = WorkflowTrigger(
                        workflow_id=workflow_id,
                        type=t_data["type"],
                        enabled=t_data.get("enabled", True),
                        config=t_data.get("config", {})
                    )
                    db.add(new_t)
                    
            # Delete triggers not in the incoming list
            for ext_id, t_obj in existing_triggers.items():
                if ext_id not in incoming_ids:
                    await db.delete(t_obj)
                    
            await db.commit()
            await db.refresh(updated_workflow)
            
        return WorkflowResponse.model_validate(updated_workflow)

workflow_service = WorkflowService()
