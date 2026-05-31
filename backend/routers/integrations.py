from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from backend.database import get_db, AsyncSessionLocal
from backend.models import Integration, KnowledgeDocument, IntegrationStatus, Organization
from backend.redis_client import get_redis
from backend.auth.dependencies import get_current_org
from backend.schemas.integration import (
    IntegrationCreate, SyncStartEvent, SyncProgressEvent, SyncCompleteEvent, DocumentData
)
from sse_starlette.sse import EventSourceResponse
from fastapi import Query
from jose import jwt, JWTError
from backend.config.settings import settings
import asyncio
import json

router = APIRouter()

@router.get("/")
async def get_integrations(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.get_integrations(db, current_org.id)

@router.post("/")
async def create_integration(integration_in: IntegrationCreate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.create_integration(db, integration_in, current_org.id)

from backend.models import IntegrationType, AgentTool, DefaultTool, DOCUMENT_INTEGRATION_TYPES

@router.get("/active/tools")
async def get_active_tools(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.get_active_tools(db, current_org.id)

@router.get("/active/documents")
async def get_active_document_integrations(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.get_active_document_integrations(db, current_org.id)

@router.get("/{integration_id}/documents")
async def get_integration_documents(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.get_documents(db, integration_id, current_org.id)

@router.delete("/{integration_id}")
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.delete_integration(db, integration_id, current_org.id)

from backend.services.web_crawler_service import web_crawler_service
from backend.services.file_processor_service import file_processor_service
from backend.services.mcp_service import mcp_service
from backend.services.api_tool_service import api_tool_service

@router.post("/{integration_id}/crawl")
async def start_crawl(integration_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), redis = Depends(get_redis), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    integration = await integration_service.get_integration(db, integration_id, current_org.id)
        
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
async def get_integration_tools(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    return await integration_service.get_tools(db, integration_id, current_org.id)

@router.put("/tools/{tool_id}/toggle")
async def toggle_tool_active(tool_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    from backend.services.integration_service import integration_service
    tool = await integration_service.toggle_tool(db, tool_id, current_org.id)
    return {"status": "success", "is_active": tool.is_active}

@router.get("/{integration_id}/stream")
async def stream_crawl_events(integration_id: int, token: str = Query(None), redis = Depends(get_redis)):
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        # Verify access in generator context if needed, but for now we just verify the JWT is valid
        # A more robust check would verify the Integration belongs to the user_id's organization
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

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
                        try:
                            parsed = json.loads(data)
                            if parsed.get("type") in ["sync_complete", "sync_error"]:
                                break
                        except json.JSONDecodeError:
                            pass
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
