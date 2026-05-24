import httpx
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Workflow
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

async def route_message(db: AsyncSession, text: str, channel: str) -> Workflow | None:
    # 1. Fetch all active workflows that support the channel
    result = await db.execute(select(Workflow).where(Workflow.is_active == True))
    all_workflows = result.scalars().all()
    
    workflows = [wf for wf in all_workflows if wf.channels and channel in wf.channels]
    
    if not workflows:
        return None
        
    if len(workflows) == 1:
        return workflows[0]
        
    # 2. Build HTTP Request to Agents Server
    workflow_payload = [
        {"id": str(wf.id), "name": wf.name, "description": wf.description or ""} 
        for wf in workflows
    ]
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.AGENTS_API_URL}/semantic_route",
                json={
                    "query": text,
                    "workflows": workflow_payload
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            output_id = data.get("workflow_id")
            
            if output_id == "NONE" or not output_id:
                return None
                
            # Find and return the matched workflow
            for wf in workflows:
                if str(wf.id) == output_id:
                    return wf
                    
            logger.warning(f"Semantic router returned unrecognized workflow ID: {output_id}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to contact Agents Semantic Router: {e}")
        return None
