from pydantic import BaseModel
from typing import Any


class AgentRunPayload(BaseModel):
    """
    The normalized, canonical payload forwarded from the backend to the agents
    service for every run, regardless of trigger type.

    The agents service always receives this exact shape — no guessing,
    no parsing raw strings.
    """

    run_id: str
    workflow_config: dict[str, Any]

    # Primary text input — becomes the first user message in the LLM conversation
    user_message: str

    # Structured data the workflow nodes can reference (e.g. via $.field in mappings)
    context: dict[str, Any] = {}

    # Trigger metadata for observability / conditional logic in the graph
    trigger_meta: dict[str, Any] = {}
