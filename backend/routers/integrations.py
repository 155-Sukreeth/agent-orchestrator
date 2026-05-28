from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from backend.database import get_db, AsyncSessionLocal
from backend.models import Integration, KnowledgeDocument, IntegrationStatus
from backend.redis_client import get_redis
from backend.schemas.integration import (
    IntegrationCreate, SyncStartEvent, SyncProgressEvent, SyncCompleteEvent, DocumentData
)
from sse_starlette.sse import EventSourceResponse
import asyncio
import json

router = APIRouter()

@router.get("/")
async def get_integrations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Integration).order_by(Integration.created_at.desc()))
    return result.scalars().all()

@router.post("/")
async def create_integration(integration_in: IntegrationCreate, db: AsyncSession = Depends(get_db)):
    db_integration = Integration(
        name=integration_in.name,
        type=integration_in.type,
        category=integration_in.category,
        config=integration_in.config,
        status=IntegrationStatus.PENDING
    )
    db.add(db_integration)
    await db.commit()
    await db.refresh(db_integration)
    return db_integration

@router.get("/{integration_id}/documents")
async def get_integration_documents(integration_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.integration_id == integration_id)
        .order_by(KnowledgeDocument.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/{integration_id}")
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db)):
    integration = await db.get(Integration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    await db.delete(integration)
    await db.commit()
    
    return {"status": "success", "message": f"Integration {integration_id} and all its data have been hard deleted."}

async def simulate_crawl(integration_id: int, redis):
    # Wait to ensure stream is connected
    await asyncio.sleep(2)
    
    channel = f"integration_stream:{integration_id}"
    
    # Send start event
    start_event = SyncStartEvent(integration_id=integration_id)
    if start_event.is_active:
        await redis.publish(channel, start_event.model_dump_json())
        
    async with AsyncSessionLocal() as db:
        # 1. Update status
        integration = await db.get(Integration, integration_id)
        if integration:
            integration.status = IntegrationStatus.SYNCING
            await db.commit()
        
        pages = [
            {"title": "Home Page", "url": "/", "chunks": 10},
            {"title": "About Us", "url": "/about", "chunks": 5},
            {"title": "Pricing", "url": "/pricing", "chunks": 8},
            {"title": "Documentation", "url": "/docs", "chunks": 25},
            {"title": "Contact", "url": "/contact", "chunks": 3},
        ]
        
        for i, page in enumerate(pages):
            await asyncio.sleep(2) # Simulate network/processing delay
            
            doc = KnowledgeDocument(
                integration_id=integration_id,
                title=page["title"],
                url_or_path=page["url"],
                is_active=True,
                metadata_json={"chunks": page["chunks"]}
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            
            progress_event = SyncProgressEvent(
                document=DocumentData(
                    id=doc.id,
                    title=doc.title,
                    url=doc.url_or_path,
                    isActive=doc.is_active,
                    chunks=page["chunks"]
                ),
                progress=f"{i+1}/{len(pages)}"
            )
            if progress_event.is_active:
                await redis.publish(channel, progress_event.model_dump_json())
            
        # Finish
        await asyncio.sleep(1)
        if integration:
            integration.status = IntegrationStatus.SYNCED
            await db.commit()
            
    complete_event = SyncCompleteEvent(integration_id=integration_id)
    if complete_event.is_active:
        await redis.publish(channel, complete_event.model_dump_json())

@router.post("/{integration_id}/crawl")
async def start_crawl(integration_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), redis = Depends(get_redis)):
    integration = await db.get(Integration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    background_tasks.add_task(simulate_crawl, integration_id, redis)
    return {"status": "started"}

@router.get("/{integration_id}/stream")
async def stream_crawl_events(integration_id: int, redis = Depends(get_redis)):
    async def event_generator():
        pubsub = redis.pubsub()
        channel = f"integration_stream:{integration_id}"
        await pubsub.subscribe(channel)
        
        try:
            while True:
                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message:
                        data = message["data"]
                        yield data
                        
                        if '"type": "sync_complete"' in data:
                            break
                    else:
                        await asyncio.sleep(0.5)
                except Exception as e:
                    # Ignore timeouts and continue
                    if "Timeout" in str(type(e)):
                        await asyncio.sleep(0.5)
                        continue
                    print(f"Redis pubsub error: {e}")
                    break
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
            
    return EventSourceResponse(event_generator())
