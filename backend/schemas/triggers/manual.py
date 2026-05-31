from pydantic import BaseModel
from typing import Any


class ManualTriggerPayload(BaseModel):
    """Fired from the UI 'Test Run' button or direct POST /runs/ API call."""

    message: str | None = None  # primary free-text input (maps to user_message)
    data: dict[str, Any] = {}   # any additional structured data (maps to context)
