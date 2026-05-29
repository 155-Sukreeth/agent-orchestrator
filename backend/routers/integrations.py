from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
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

from backend.models import IntegrationType, AgentTool, DOCUMENT_INTEGRATION_TYPES

@router.get("/active/tools")
async def get_active_tools(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentTool).where(AgentTool.is_active == True)
    )
    return result.scalars().all()

@router.get("/active/documents")
async def get_active_document_integrations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Integration)
        .where(Integration.is_active == True)
        .where(Integration.status == IntegrationStatus.SYNCED)
        .where(Integration.type.in_(DOCUMENT_INTEGRATION_TYPES))
    )
    return result.scalars().all()


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

from backend.services.web_crawler_service import web_crawler_service
from backend.services.file_processor_service import file_processor_service
from backend.services.mcp_service import mcp_service
from backend.services.api_tool_service import api_tool_service
from backend.services.api_tool_service import api_tool_service

@router.post("/{integration_id}/crawl")
async def start_crawl(integration_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), redis = Depends(get_redis)):
    integration = await db.get(Integration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    if integration.type == IntegrationType.FILE_UPLOAD:
        background_tasks.add_task(file_processor_service.execute_file_processing, integration_id, integration.config, redis)
    elif integration.type == IntegrationType.MCP:
        background_tasks.add_task(mcp_service.sync_mcp_tools, integration_id, integration.config, redis)
    elif integration.type == IntegrationType.API_TOOL:
        background_tasks.add_task(api_tool_service.sync_api_tool, integration_id, integration.config, redis)
    else:
        background_tasks.add_task(web_crawler_service.execute_web_crawl, integration_id, integration.config, redis)
        
    return {"status": "started"}

@router.get("/{integration_id}/tools")
async def get_integration_tools(integration_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentTool).where(AgentTool.integration_id == integration_id)
    )
    tools = result.scalars().all()
    return tools

@router.put("/tools/{tool_id}/toggle")
async def toggle_tool_active(tool_id: int, db: AsyncSession = Depends(get_db)):
    tool = await db.get(AgentTool, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool.is_active = not tool.is_active
    await db.commit()
    return {"status": "success", "is_active": tool.is_active}

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
