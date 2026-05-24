from abc import ABC, abstractmethod

class BaseAdaptor(ABC):
    @abstractmethod
    async def parse_payload(self, request_body: dict) -> dict:
        """Parse incoming webhook payload into a standardized message dict:
           { 'sender_id': str, 'text': str, 'thread_id': str }"""
        pass

    @abstractmethod
    async def send_message(self, sender_id: str, thread_id: str, text: str):
        """Send a message back to the user through the channel."""
        pass
