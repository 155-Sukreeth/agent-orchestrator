from pydantic import BaseModel
from typing import Any


class CompileRunRequest(BaseModel):
    """
    Fixed contract between the backend and the agents service.
    Always populated by the backend's TriggerMapper — never built ad-hoc.
    """

    run_id: str
    workflow_config: dict[str, Any]

    # Primary user-facing message that seeds the LLM conversation
    user_message: str

    # Structured data the workflow can reference
    context: dict[str, Any] = {}

    # Trigger metadata for observability / graph-level conditionals
    trigger_meta: dict[str, Any] = {}
