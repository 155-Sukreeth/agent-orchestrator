import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Run, RunStatus
from backend.config import settings

logger = logging.getLogger(__name__)

async def start_run(db: AsyncSession, workflow_id: str, input_data: str) -> str:
    """
    Creates a run record and delegates execution to the Agents Microservice via HTTP POST.
    """
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
        status=RunStatus.PENDING,
        input_data=input_data
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
                    "workflow_config": workflow.config,
                    "input_data": input_data
                },
                timeout=5.0
            )
            response.raise_for_status()
            
        run.status = RunStatus.RUNNING
        await db.commit()
            
    except Exception as e:
        logger.error(f"Failed to start workflow execution on Agents service: {e}")
        run.status = RunStatus.FAILED
        await db.commit()
        raise e
        
    return run_id_str
