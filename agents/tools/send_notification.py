from contextvars import ContextVar
from langchain_core.tools import tool
from pydantic import BaseModel, Field

from agents.config.settings import agent_settings
from agents.clients.http_client import HttpClientManager, with_resiliency
import logging

logger = logging.getLogger(__name__)

# Set by tool_executor / tool_node before ainvoke (not visible to the LLM schema)
_run_id_ctx: ContextVar[str | None] = ContextVar("send_notification_run_id", default=None)
_recipient_id_ctx: ContextVar[str | None] = ContextVar("send_notification_recipient_id", default=None)
_thread_id_ctx: ContextVar[str | None] = ContextVar("send_notification_thread_id", default=None)


class SendNotificationInput(BaseModel):
    """Arguments exposed to the LLM."""

    channel: str = Field(description="Channel to send through, e.g. telegram or slack")
    text: str = Field(description="Message body to send")


def set_send_notification_context(
    *,
    run_id: str | None = None,
    recipient_id: str | None = None,
    thread_id: str | None = None,
) -> None:
    _run_id_ctx.set(run_id)
    _recipient_id_ctx.set(recipient_id)
    _thread_id_ctx.set(thread_id)


@tool(args_schema=SendNotificationInput)
async def send_notification(channel: str, text: str) -> str:
    """
    Sends a notification or message to a user through a connected channel.
    Recipient is resolved on the backend from the current run when not specified.
    """
    logger.info("Agent requested to send notification via %s", channel)

    run_id = _run_id_ctx.get()
    recipient_id = _recipient_id_ctx.get()
    thread_id = _thread_id_ctx.get()

    if not run_id:
        return "Error: run_id not found in configuration. Cannot authenticate with backend."

    body: dict = {
        "run_id": str(run_id),
        "channel": channel,
        "text": text,
    }
    if recipient_id is not None:
        body["recipient_id"] = recipient_id
    if thread_id is not None:
        body["thread_id"] = thread_id

    @with_resiliency()
    async def _do_post():
        client = HttpClientManager.get_client()
        response = await client.post(
            f"{agent_settings.BACKEND_API_URL}/api/notifications/send",
            json=body,
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()

    try:
        result = await _do_post()
        return f"Successfully sent notification via {channel}. Response: {result.get('message')}"
    except Exception as e:
        error_msg = f"Failed to send notification via {channel}: {str(e)}"
        logger.error(error_msg)
        return error_msg
