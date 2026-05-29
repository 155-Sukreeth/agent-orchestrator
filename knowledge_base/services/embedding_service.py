import httpx
from typing import List
from knowledge_base.config.settings import settings

class EmbeddingService:
    def __init__(self):
        # We now route through Bifrost gateway for observability and semantic caching
        self.base_url = "http://bifrost:8080/v1/embeddings"
        # Prefix the provider "gemini/" for Bifrost, and strip "models/" if present
        raw_model = settings.gemini_embedding_model.replace("models/", "")
        self.model = f"gemini/{raw_model}"
        # We pass a dummy key since Bifrost manages the real API keys
        self.api_key = "dummy_key"

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        # Using OpenAI-compatible request format for Bifrost
        payload = {
            "model": self.model,
            "input": texts,
            "dimensions": 768
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract embeddings from standard OpenAI response format
            return [item["embedding"] for item in data.get("data", [])]

embedding_service = EmbeddingService()
