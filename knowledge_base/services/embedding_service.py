import httpx
from typing import List
from knowledge_base.config.settings import settings

class EmbeddingService:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.model = settings.embedding_model

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        async with httpx.AsyncClient() as client:
            # Note: Ollama /api/embeddings currently expects one prompt at a time,
            # so we iterate. Alternatively, if batching is supported, we can send all.
            for text in texts:
                response = await client.post(
                    f"{self.base_url}/api/embeddings",
                    json={
                        "model": self.model,
                        "prompt": text
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                embeddings.append(data["embedding"])
        
        return embeddings

embedding_service = EmbeddingService()
