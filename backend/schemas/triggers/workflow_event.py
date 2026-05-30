from pydantic import BaseModel
from typing import Any


class WorkflowEventTriggerPayload(BaseModel):
    """Fired internally when another workflow run completes."""

    source_workflow_id: int
    source_run_id: int
    event_name: str            # e.g. "completed", "failed", or a custom named event
    output: dict[str, Any] = {}
