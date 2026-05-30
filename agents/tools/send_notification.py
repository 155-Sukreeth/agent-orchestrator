from langchain_core.tools import tool
from agents.config.settings import agent_settings
from agents.clients.http_client import HttpClientManager, with_resiliency
import logging

logger = logging.getLogger(__name__)

@tool
async def send_notification(channel: str, recipient_id: str, text: str, thread_id: str = None) -> str:
    """
    Sends a notification or message to a user through a specific channel.
    
    Args:
        channel: The channel to send the message through. E.g. 'telegram', 'email', 'slack'.
        recipient_id: The ID or address of the recipient. For Telegram, this is the chat_id.
        text: The content of the message to send.
        thread_id: Optional. The specific thread or topic ID to reply to.
        
    Returns:
        A success message or throws an error if it fails.
    """
    logger.info(f"Agent requested to send notification via {channel} to {recipient_id}")
    
    @with_resiliency()
    async def _do_post():
        client = HttpClientManager.get_client()
        response = await client.post(
            f"{agent_settings.BACKEND_API_URL}/api/notifications/send",
            json={
                "channel": channel,
                "recipient_id": recipient_id,
                "thread_id": thread_id,
                "text": text
            },
            timeout=10.0
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
