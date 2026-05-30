from pydantic import BaseModel, Field
from typing import Optional

class NotificationRequest(BaseModel):
    channel: str = Field(..., description="The channel to send the notification through (e.g. 'telegram', 'email', 'slack')")
    recipient_id: str = Field(..., description="The ID or address of the recipient")
    thread_id: Optional[str] = Field(None, description="The specific thread or chat ID to reply to, if applicable")
    text: str = Field(..., description="The message content to send")
