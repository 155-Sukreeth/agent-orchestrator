from pydantic import BaseModel
from typing import Any


class WebhookTriggerPayload(BaseModel):
    """Fired when an external system POSTs to /webhooks/{workflow_id}."""

    headers: dict[str, str] = {}
    body: dict[str, Any] = {}
    query_params: dict[str, str] = {}
