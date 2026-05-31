from backend.adaptors.base import BaseAdaptor
from backend.adaptors.telegram import TelegramAdaptor

adaptors = {
    "telegram": TelegramAdaptor()
}

def get_adaptor(channel: str) -> BaseAdaptor:
    return adaptors.get(channel)
