import os
from pydantic_settings import BaseSettings

class AgentSettings(BaseSettings):
    AGENTS_BIFROST_URL: str = os.getenv("AGENTS_BIFROST_URL", "https://gateway.maximai.io/v1")
    AGENTS_BIFROST_API_KEY: str = os.getenv("AGENTS_BIFROST_API_KEY", "")
    AGENTS_DEFAULT_PROVIDER: str = os.getenv("AGENTS_DEFAULT_PROVIDER", "gemini")
    AGENTS_DEFAULT_MODEL: str = os.getenv("AGENTS_DEFAULT_MODEL", "gemini-3.1-flash-lite")

agent_settings = AgentSettings()
