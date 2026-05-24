from openai import AsyncOpenAI
from agents.config import agent_settings

SUPPORTED_PROVIDERS = ["openai", "anthropic", "google", "mistral"]

def get_bifrost_client() -> AsyncOpenAI:
    """
    Single OpenAI-compatible client pointed at Bifrost.
    All provider routing, retries, and fallbacks are handled by Bifrost.
    The api_key here is irrelevant for provider auth — Bifrost manages
    all provider keys internally. Pass a non-empty dummy or a Bifrost
    virtual key if governance is enabled.
    """
    return AsyncOpenAI(
        base_url=agent_settings.AGENTS_BIFROST_URL,
        api_key=agent_settings.AGENTS_BIFROST_API_KEY,
    )

def resolve_model(provider: str, model: str) -> str:
    """
    Bifrost expects "provider/model" format.
    e.g. "anthropic/claude-sonnet-4-20250514"
         "google/gemini-2.0-flash"
         "openai/gpt-4o"
         "mistral/mistral-large-latest"
    """
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(
            f"Provider '{provider}' not supported. "
            f"Must be one of: {SUPPORTED_PROVIDERS}"
        )
    return f"{provider}/{model}"
