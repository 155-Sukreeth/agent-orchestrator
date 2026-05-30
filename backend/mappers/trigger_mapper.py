import json
from typing import Any

from backend.schemas.agent_run_payload import AgentRunPayload
from backend.schemas.triggers.manual import ManualTriggerPayload
from backend.schemas.triggers.webhook import WebhookTriggerPayload
from backend.schemas.triggers.scheduler import SchedulerTriggerPayload
from backend.schemas.triggers.workflow_event import WorkflowEventTriggerPayload
from backend.schemas.triggers.semantic import SemanticTriggerPayload


class TriggerMapper:
    """
    Maps each typed trigger payload to the canonical AgentRunPayload.

    Every entry point (router, scheduler job, event hook) calls the
    appropriate from_* method. The agents service always receives AgentRunPayload.
    """

    def from_manual(
        self,
        payload: ManualTriggerPayload,
        run_id: str,
        workflow_config: dict[str, Any],
    ) -> AgentRunPayload:
        return AgentRunPayload(
            run_id=run_id,
            workflow_config=workflow_config,
            user_message=payload.message or "",
            context=payload.data,
            trigger_meta={"trigger_type": "manual"},
        )

    def from_webhook(
        self,
        payload: WebhookTriggerPayload,
        run_id: str,
        workflow_config: dict[str, Any],
    ) -> AgentRunPayload:
        # Prefer explicit message/text fields; fall back to full JSON body
        user_message = (
            payload.body.get("message")
            or payload.body.get("text")
            or json.dumps(payload.body)
        )
        return AgentRunPayload(
            run_id=run_id,
            workflow_config=workflow_config,
            user_message=user_message,
            context=payload.body,
            trigger_meta={
                "trigger_type": "webhook",
                "headers": payload.headers,
                "query_params": payload.query_params,
            },
        )

    def from_scheduler(
        self,
        payload: SchedulerTriggerPayload,
        run_id: str,
        workflow_config: dict[str, Any],
    ) -> AgentRunPayload:
        return AgentRunPayload(
            run_id=run_id,
            workflow_config=workflow_config,
            user_message=f"Scheduled run triggered at {payload.triggered_at.isoformat()}",
            context=payload.metadata,
            trigger_meta={
                "trigger_type": "scheduler",
                "cron_expression": payload.cron_expression,
                "triggered_at": payload.triggered_at.isoformat(),
            },
        )

    def from_workflow_event(
        self,
        payload: WorkflowEventTriggerPayload,
        run_id: str,
        workflow_config: dict[str, Any],
    ) -> AgentRunPayload:
        return AgentRunPayload(
            run_id=run_id,
            workflow_config=workflow_config,
            user_message=payload.event_name,
            context=payload.output,
            trigger_meta={
                "trigger_type": "workflow_event",
                "source_workflow_id": payload.source_workflow_id,
                "source_run_id": payload.source_run_id,
                "event_name": payload.event_name,
            },
        )

    def from_semantic(
        self,
        payload: SemanticTriggerPayload,
        run_id: str,
        workflow_config: dict[str, Any],
    ) -> AgentRunPayload:
        return AgentRunPayload(
            run_id=run_id,
            workflow_config=workflow_config,
            user_message=payload.message,
            context={"attachments": payload.attachments},
            trigger_meta={
                "trigger_type": "semantic",
                "channel": payload.channel,
                "sender_id": payload.sender_id,
                "thread_id": payload.thread_id,
            },
        )


trigger_mapper = TriggerMapper()
