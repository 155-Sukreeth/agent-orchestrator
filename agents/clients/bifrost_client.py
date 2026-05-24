from openai import AsyncOpenAI
from agents.config.settings import agent_settings

SUPPORTED_PROVIDERS = ["openai", "anthropic", "google", "mistral"]

class BifrostClient:
    def __init__(self):
        self._client = AsyncOpenAI(
            base_url=agent_settings.AGENTS_BIFROST_URL,
            api_key=agent_settings.AGENTS_BIFROST_API_KEY or "dummy_key_for_bifrost",
        )

    @property
    def client(self) -> AsyncOpenAI:
        return self._client

    def resolve_model(self, provider: str, model: str) -> str:
        """
        Bifrost expects "provider/model" format.
        """
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Provider '{provider}' not supported. "
                f"Must be one of: {SUPPORTED_PROVIDERS}"
            )
        return f"{provider}/{model}"

bifrost_client = BifrostClient()
