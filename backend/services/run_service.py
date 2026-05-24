from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.run_repository import run_repository
from backend.repositories.workflow_repository import workflow_repository
from backend.clients.agents_client import agents_client
import logging

logger = logging.getLogger(__name__)

class RunService:
    async def start_run(self, db: AsyncSession, workflow_id: int, input_data: str, sender_id: str = None, thread_id: str = None) -> str:
        # Verify workflow exists
        workflow = await workflow_repository.get_by_id(db, workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Create run record
        run_data = {
            "workflow_id": workflow_id,
            "status": "pending",
            "input_text": input_data,
            "sender_id": sender_id,
            "thread_id": thread_id
        }
        run = await run_repository.create(db, run_data)
        run_id_str = str(run.id)

        # Delegate execution
        try:
            await agents_client.compile_and_run(run_id_str, workflow.graph_definition, input_data)
            await run_repository.update(db, run, {"status": "running"})
        except Exception as e:
            logger.error(f"Failed to start workflow execution: {e}")
            await run_repository.update(db, run, {"status": "failed"})
            raise e
            
        return run_id_str

run_service = RunService()
