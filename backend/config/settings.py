import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PUBLIC_URL: str = "http://localhost:8000"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/orchestrator"
    REDIS_URL: str = "redis://localhost:6379"

    # API connection to the Agents Microservice
    AGENTS_API_URL: str = "http://localhost:8001"
    
    # Keeping original embedding settings in case needed later, though not used by semantic router now
    OPENAI_API_KEY: str = ""
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    SEMANTIC_SIMILARITY_THRESHOLD: float = 0.72

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
