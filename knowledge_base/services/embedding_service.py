import httpx
from typing import List
from knowledge_base.config.settings import settings

class EmbeddingService:
    def __init__(self):
        self.api_key = settings.huggingface_api_key
        self.model = settings.embedding_model
        self.base_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.model}"

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=headers,
                json={"inputs": texts},
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Hugging Face usually returns a list of embeddings directly
            return data

embedding_service = EmbeddingService()
