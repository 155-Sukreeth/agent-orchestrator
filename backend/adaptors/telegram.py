from backend.models import TelegramConnectionModel
from backend.adaptors.base import BaseAdaptor
from backend.clients.telegram_client import telegram_client


class TelegramAdaptor(BaseAdaptor):
    async def parse_payload(self, request_body: dict) -> dict:
        message = request_body.get("message", {})
        chat = message.get("chat", {})
        return {
            "sender_id": str(chat.get("id")),
            "thread_id": str(chat.get("id")),
            "text": message.get("text", ""),
        }

    async def send_message(self, connection: TelegramConnectionModel, sender_id: str, thread_id: str, text: str):
        bot_token = connection.bot_token
        thread_id = thread_id or connection.default_chat_id
        if not bot_token:
            raise ValueError("Telegram connection is missing bot_token")
        await telegram_client.send_message(bot_token=bot_token, chat_id=thread_id, text=text)

