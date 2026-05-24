import numpy as np
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Workflow
import httpx
from backend.config import settings

async def get_embedding(text: str) -> list[float]:
    url = "https://api.openai.com/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "input": text,
        "model": settings.EMBEDDING_MODEL
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()["data"][0]["embedding"]

def cosine_similarity(a: list[float], b: list[float]) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

async def route_message(db: AsyncSession, text: str, channel: str) -> Workflow | None:
    embedding = await get_embedding(text)
    
    result = await db.execute(select(Workflow).where(Workflow.is_active == True))
    workflows = result.scalars().all()
    
    best_workflow = None
    highest_score = -1.0
    
    for wf in workflows:
        if channel not in wf.channels:
            continue
        
        if wf.description_embedding is None:
            continue
            
        score = cosine_similarity(embedding, wf.description_embedding)
        if score > highest_score:
            highest_score = score
            best_workflow = wf
            
    if highest_score >= settings.SEMANTIC_SIMILARITY_THRESHOLD:
        return best_workflow
    
    return None
