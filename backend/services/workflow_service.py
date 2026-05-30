from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.workflow_repository import workflow_repository
from backend.repositories.workflow_trigger_repository import workflow_trigger_repository
from backend.repositories.workflow_template_repository import workflow_template_repository
from backend.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from typing import List

class WorkflowService:
    async def get_workflow(self, db: AsyncSession, workflow_id: int) -> WorkflowResponse:
        workflow_dto = await workflow_repository.get_by_id(db, workflow_id)
        if not workflow_dto:
            raise ValueError(f"Workflow {workflow_id} not found")
        return workflow_dto

    async def list_workflows(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[WorkflowResponse]:
        return await workflow_repository.get_all(db, skip, limit)

    async def list_templates(self, db: AsyncSession) -> List[dict]:
        templates = await workflow_template_repository.get_all(db)
        return [t.model_dump() for t in templates]

    async def create_workflow(self, db: AsyncSession, workflow_in: WorkflowCreate) -> WorkflowResponse:
        workflow_data = workflow_in.model_dump()
        if "description_embedding" not in workflow_data or workflow_data["description_embedding"] is None:
            # Dummy embedding for MVP
            workflow_data["description_embedding"] = [0.0] * 1536 
            
        workflow_dto = await workflow_repository.create(db, workflow_data)
        
        # Refetch to eager-load relationships (like triggers) for Pydantic validation
        return await workflow_repository.get_by_id(db, workflow_dto.id)

    async def update_workflow(self, db: AsyncSession, workflow_id: int, workflow_in: WorkflowUpdate) -> WorkflowResponse:
        db_workflow = await workflow_repository.get_entity_by_id(db, workflow_id)
        
        if not db_workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        update_data = workflow_in.model_dump(exclude_unset=True)
        triggers_data = update_data.pop("triggers", None)
        
        # Update workflow base fields
        await workflow_repository.update(db, db_workflow, update_data)
        
        # Handle triggers upsert
        if triggers_data is not None:
            existing_triggers = await workflow_trigger_repository.get_entities_by_workflow_id(db, workflow_id)
            existing_dict = {str(t.id): t for t in existing_triggers}
            
            incoming_ids = set()
            
            for t_data in triggers_data:
                t_id = t_data.get("id")
                if t_id and str(t_id) in existing_dict:
                    # Update
                    t_obj = existing_dict[str(t_id)]
                    await workflow_trigger_repository.update(db, t_obj, {k: v for k, v in t_data.items() if k != "id" and v is not None})
                    incoming_ids.add(str(t_id))
                else:
                    # Insert
                    new_t_data = {
                        "workflow_id": workflow_id,
                        "type": t_data["type"],
                        "enabled": t_data.get("enabled", True),
                        "config": t_data.get("config", {})
                    }
                    await workflow_trigger_repository.create(db, new_t_data)
                    
            # Delete triggers not in the incoming list
            for ext_id, t_obj in existing_dict.items():
                if ext_id not in incoming_ids:
                    await workflow_trigger_repository.delete(db, t_obj.id)
            
        return await workflow_repository.get_by_id(db, workflow_id)

    async def delete_workflow(self, db: AsyncSession, workflow_id: int) -> bool:
        # Business logic: could check if workflow has active runs, etc.
        return await workflow_repository.delete(db, workflow_id)

workflow_service = WorkflowService()
