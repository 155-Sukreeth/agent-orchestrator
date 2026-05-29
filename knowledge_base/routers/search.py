from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from knowledge_base.database import get_db
from knowledge_base.services.embedding_service import embedding_service
from knowledge_base.services.vector_store import vector_store_service

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    integration_id: Optional[int] = None
    limit: int = 5

@router.post("/search")
async def search_knowledge(req: SearchRequest, db: AsyncSession = Depends(get_db)):
    try:
        query_embeddings = await embedding_service.get_embeddings([req.query])
        if not query_embeddings:
            raise HTTPException(status_code=500, detail="Failed to embed query")
            
        results = await vector_store_service.search(
            session=db,
            query_embedding=query_embeddings[0],
            integration_id=req.integration_id,
            limit=req.limit
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
