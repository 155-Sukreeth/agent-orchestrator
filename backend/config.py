import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PUBLIC_URL: str = "http://localhost:8000"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/orchestrator"
    REDIS_URL: str = "redis://localhost:6379"

    AGENTS_BIFROST_URL: str = "https://gateway.maximai.io/v1"
    AGENTS_BIFROST_API_KEY: str = ""
    AGENTS_DEFAULT_PROVIDER: str = "openai"
    AGENTS_DEFAULT_MODEL: str = "gpt-4o"
    
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    SEMANTIC_SIMILARITY_THRESHOLD: float = 0.72

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
