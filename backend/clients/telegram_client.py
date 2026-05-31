from backend.clients.http_client import HttpClientManager, with_resiliency
import logging

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramClient:
    """
    Single point of contact for all HTTP interactions with the Telegram Bot API.
    All methods accept bot_token explicitly so the client itself is stateless
    and can serve multiple connections (multi-tenant).
    """

    def _base(self, bot_token: str) -> str:
        return f"{TELEGRAM_API_BASE}/bot{bot_token}"

    @with_resiliency()
    async def send_message(self, bot_token: str, chat_id: str, text: str) -> dict:
        """Send a text message to a chat."""
        url = f"{self._base(bot_token)}/sendMessage"
        client = HttpClientManager.get_client()
        response = await client.post(url, json={"chat_id": chat_id, "text": text})
        response.raise_for_status()
        return response.json()

    @with_resiliency()
    async def get_updates(self, bot_token: str, limit: int = 10) -> list:
        """
        Fetch the most recent updates from Telegram.
        Returns the raw list of Update objects from the Telegram API.
        Raises httpx.HTTPStatusError on API errors (e.g. 401 invalid token,
        409 webhook conflict).
        """
        url = f"{self._base(bot_token)}/getUpdates"
        client = HttpClientManager.get_client()
        response = await client.get(url, params={"limit": limit})
        response.raise_for_status()
        data = response.json()
        return data.get("result", [])


telegram_client = TelegramClient()
