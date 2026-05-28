import httpx
from typing import List
from knowledge_base.config.settings import settings

class EmbeddingService:
    def __init__(self):
        self.api_key = settings.google_api_key
        self.model = settings.gemini_embedding_model
        # Gemini embedding endpoint
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/{self.model}:batchEmbedContents"

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            raise ValueError("Google API key is missing")
            
        requests = [
            {
                "model": self.model,
                "content": {
                    "parts": [{"text": text}]
                }
            }
            for text in texts
        ]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}?key={self.api_key}",
                json={"requests": requests},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract embeddings from the response
            return [emb["values"] for emb in data.get("embeddings", [])]

embedding_service = EmbeddingService()
