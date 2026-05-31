from pydantic import BaseModel


class SemanticTriggerPayload(BaseModel):
    """Fired internally by a channel adaptor when a message matches this workflow."""

    channel: str               # e.g. "telegram", "slack"
    sender_id: str
    message: str               # the user's raw message text (maps to user_message)
    thread_id: str | None = None
    attachments: list[dict] = []
