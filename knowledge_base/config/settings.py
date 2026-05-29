from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/agentplatform"
    google_api_key: str | None = None
    gemini_embedding_model: str = "models/gemini-embedding-2"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
