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

    # Fernet encryption key for data-layer credential encryption
    ENCRYPTION_KEY: str = "Wv3aL5n8KpHqM_kU1rX2zY9tV7gT4wS0eC6bN3jM5_E="

    # Auth Settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-replace-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
