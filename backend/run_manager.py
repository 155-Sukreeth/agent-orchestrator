import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Run
from backend.config import settings

logger = logging.getLogger(__name__)

async def start_run(db: AsyncSession, workflow_id: int, input_data: str, sender_id: str = None, thread_id: str = None) -> str:
    from sqlalchemy.future import select
    from backend.models import Workflow
    
    # Verify workflow exists
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    if not workflow:
        raise ValueError(f"Workflow {workflow_id} not found")

    # Create run record
    run = Run(
        workflow_id=workflow_id,
        status="pending",
        input_text=input_data,
        sender_id=sender_id,
        thread_id=thread_id
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    run_id_str = str(run.id)

    # Make HTTP request to Agents Microservice to trigger execution
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.AGENTS_API_URL}/compile_and_run",
                json={
                    "run_id": run_id_str,
                    "workflow_config": workflow.graph_definition,
                    "input_data": input_data
                },
                timeout=5.0
            )
            response.raise_for_status()
            
        run.status = "running"
        await db.commit()
            
    except Exception as e:
        logger.error(f"Failed to start workflow execution on Agents service: {e}")
        run.status = "failed"
        await db.commit()
        raise e
        
    return run_id_str
