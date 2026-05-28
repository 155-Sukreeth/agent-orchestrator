from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/agentplatform"
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "nomic-embed-text"

    class Config:
        env_file = ".env"

settings = Settings()
