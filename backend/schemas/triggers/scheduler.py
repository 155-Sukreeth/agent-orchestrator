from pydantic import BaseModel
from datetime import datetime
from typing import Any


class SchedulerTriggerPayload(BaseModel):
    """Fired internally by APScheduler on a cron schedule. No user input."""

    triggered_at: datetime
    cron_expression: str
    metadata: dict[str, Any] = {}
