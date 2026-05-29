from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.models import Workflow
from backend.clients.agents_client import AgentsClient
import logging

logger = logging.getLogger(__name__)

class SemanticRouterService:
    async def route_message(self, db: AsyncSession, message: str, channel: str, agents_client: AgentsClient, org_id: int) -> Workflow | None:
        """
        Uses the Agents client to run semantic routing logic over active workflows.
        """
        # Fetch active workflows matching the channel
        # We perform this logic via SQLAlchemy directly, or via repository.
        from backend.repositories.workflow_repository import workflow_repository
        
        # A simple query for all active workflows for now, bypassing repo specific method for speed
        result = await db.execute(
            select(Workflow).where(Workflow.is_active == True, Workflow.organization_id == org_id)
        )
        active_workflows = result.scalars().all()
        
        # Filter by channel if required
        valid_workflows = []
        for wf in active_workflows:
            if not wf.channels or channel in wf.channels:
                valid_workflows.append(wf)
                
        if not valid_workflows:
            return None
            
        if len(valid_workflows) == 1:
            return valid_workflows[0]
            
        # Prepare list of workflows for LLM context
        workflows_list = [
            {"id": str(w.id), "name": w.name, "description": w.description or ""}
            for w in valid_workflows
        ]
        
        # Call Agents microservice
        try:
            selected_id = await agents_client.semantic_route(message, workflows_list)
            if selected_id and selected_id != "NONE":
                for w in valid_workflows:
                    if str(w.id) == selected_id:
                        return w
        except Exception as e:
            logger.error(f"Error during semantic routing call: {e}")
            
        return valid_workflows[0] # Fallback to first

semantic_router_service = SemanticRouterService()
