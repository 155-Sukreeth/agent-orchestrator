import httpx
from backend.adaptors.base import BaseAdaptor
from backend.config.settings import settings
from backend.clients.http_client import HttpClientManager, with_resiliency

class TelegramAdaptor(BaseAdaptor):
    async def parse_payload(self, request_body: dict) -> dict:
        message = request_body.get("message", {})
        chat = message.get("chat", {})
        text = message.get("text", "")
        
        return {
            "sender_id": str(chat.get("id")),
            "thread_id": str(chat.get("id")),
            "text": text
        }

    @with_resiliency()
    async def send_message(self, sender_id: str, thread_id: str, text: str):
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": sender_id,
            "text": text
        }
        client = HttpClientManager.get_client()
        await client.post(url, json=payload)
