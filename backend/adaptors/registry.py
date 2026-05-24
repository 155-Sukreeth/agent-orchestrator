from backend.adaptors.telegram import TelegramAdaptor

adaptors = {
    "telegram": TelegramAdaptor()
}

def get_adaptor(channel: str):
    return adaptors.get(channel)
