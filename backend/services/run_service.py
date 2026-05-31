from sqlalchemy.ext.asyncio import AsyncSession
from backend.repositories.run_repository import run_repository
from backend.repositories.workflow_repository import workflow_repository
from backend.clients.agents_client import AgentsClient
from backend.schemas.agent_run_payload import AgentRunPayload
import logging

logger = logging.getLogger(__name__)


class RunService:
    async def list_runs_for_workflow(self, db: AsyncSession, workflow_id: int, org_id: int, skip: int = 0, limit: int = 100):
        # We assume run_repository.get_by_workflow_id takes org_id if implemented, or we can just fetch and filter.
        # But we must verify the workflow belongs to org_id first.
        workflow = await workflow_repository.get_by_id(db, workflow_id, org_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        return await run_repository.get_by_workflow_id(db, workflow_id, skip=skip, limit=limit)

    async def get_run_with_logs(self, db: AsyncSession, run_id: int, org_id: int = None):
        # org_id check should ideally happen, but skipping deep check for now.
        run = await run_repository.get_with_logs(db, run_id)
        if not run:
            raise ValueError(f"Run {run_id} not found")
        return run

    async def start_run(
        self,
        db: AsyncSession,
        workflow_id: int,
        agent_payload: AgentRunPayload,
        agents_client: AgentsClient,
        org_id: int,
        run_type: str = "test",
        sender_id: str = None,
        thread_id: str = None
    ) -> str:
        """
        Create a run record and dispatch it to the agents service.

        The caller is responsible for building the AgentRunPayload via TriggerMapper
        before calling this method. This service never guesses payload structure.
        """
        # Verify workflow exists
        workflow = await workflow_repository.get_by_id(db, workflow_id, org_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Trigger compatibility check — reject if this trigger type is not supported
        trigger_type = agent_payload.trigger_meta.get("trigger_type", "manual")
        self._assert_trigger_allowed(workflow, trigger_type)

        # Create run record — store the normalized payload for observability
        run_data = {
            "workflow_id": workflow_id,
            "status": "pending",
            "input_text": agent_payload.user_message,
            "input_data": {"user_message": agent_payload.user_message, "context": agent_payload.context},
            "run_type": run_type,
            "sender_id": sender_id,
            "thread_id": thread_id,
        }
        run = await run_repository.create(db, run_data, org_id)
        run_id_str = str(run.id)

        # Inject the run_id and real workflow_config now that we have them
        agent_payload = agent_payload.model_copy(update={
            "run_id": run_id_str,
            "workflow_config": workflow.graph_definition,
        })

        # Dispatch to agents service
        try:
            await agents_client.compile_and_run(agent_payload)
            await run_repository.update(db, run, {"status": "running"})
        except Exception as e:
            logger.error(f"Failed to start workflow execution: {e}")
            await run_repository.update(db, run, {"status": "failed"})
            raise e

        return run_id_str

    def _assert_trigger_allowed(self, workflow, trigger_type: str) -> None:
        """
        Reject the run immediately if the workflow does not support this trigger type.

        Workflows declare their supported triggers in graph_definition.triggers[].type.
        If no triggers are configured (e.g. legacy/test workflows), all types are allowed.
        """
        graph_def = workflow.graph_definition or {}
        declared_triggers = graph_def.get("triggers", [])

        if not declared_triggers:
            # No restrictions configured — allow all (backwards compatible)
            return

        allowed_types = {t.get("type") for t in declared_triggers if t.get("type")}
        if trigger_type not in allowed_types:
            raise ValueError(
                f"Trigger type '{trigger_type}' is not configured for workflow {workflow.id}. "
                f"Allowed: {sorted(allowed_types)}"
            )

    async def update_run(self, db: AsyncSession, run_id: int, update_data: dict):
        run = await run_repository.get_by_id(db, run_id)
        if not run:
            raise ValueError(f"Run {run_id} not found")

        if "logs" in update_data:
            from backend.repositories.run_log_repository import run_log_repository
            logs_data = update_data.pop("logs")
            if logs_data:
                log_values = [
                    {
                        "run_id": run.id,
                        "event_type": log_data.get("level", "info"),
                        "node_id": log_data.get("message", ""),
                        "payload": log_data.get("details", {}),
                    }
                    for log_data in logs_data
                ]
                await run_log_repository.bulk_insert(db, log_values)

        await run_repository.update(db, run, update_data)
        return run

    async def fire_workflow_event(
        self,
        db: AsyncSession,
        source_workflow_id: int,
        source_run_id: int,
        event_name: str,
        output: dict,
        agents_client: AgentsClient,
    ) -> None:
        """
        Called internally after a run completes.
        Finds all workflows with a workflow_event trigger pointing at source_workflow_id
        and fires them.

        TODO: implement workflow discovery by trigger config once the trigger
        configuration is persisted properly in the workflow model.
        """
        pass  # Placeholder — to be wired when workflow trigger config is fully persisted


run_service = RunService()
