from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from knowledge_base.database import get_db
from knowledge_base.services.chunking_service import chunking_service
from knowledge_base.services.embedding_service import embedding_service
from knowledge_base.services.vector_store import vector_store_service
from backend.models import KnowledgeDocument, Integration
from sqlalchemy import select

router = APIRouter()

class UpsertRequest(BaseModel):
    document_id: int
    content: str
    content_type: str = "text" # text, html, markdown

async def process_upsert(document_id: int, content: str, content_type: str, session: AsyncSession):
    # Fetch document metadata
    doc = await session.get(KnowledgeDocument, document_id)
    if not doc:
        return 0
        
    integration_id = doc.integration_id
    
    # 1. Chunk content
    chunks = chunking_service.chunk_content(content, content_type)
    if not chunks:
        return 0
        
    # 2. Get Embeddings
    embeddings = await embedding_service.get_embeddings(chunks)
        
    # 3. Clear old chunks (simplest way to handle deduplication without unique constraints)
    from backend.models import KnowledgeChunk
    from sqlalchemy import delete
    await session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id))
    
    # 4. Upsert new chunks
    await vector_store_service.upsert_chunks(
        session=session,
        document_id=document_id,
        integration_id=integration_id,
        chunks=chunks,
        embeddings=embeddings,
        is_active=doc.is_active
    )
    
    return len(chunks)

@router.post("/upsert")
async def upsert_document(req: UpsertRequest, db: AsyncSession = Depends(get_db)):
    try:
        chunks_count = await process_upsert(req.document_id, req.content, req.content_type, db)
        return {"status": "success", "chunks": chunks_count}
    except Exception as e:
        import logging
        logging.error(f"Error during upsert: {e}")
        raise HTTPException(status_code=500, detail=str(e))
