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
    result = await db.execute(select(Integration).where(Integration.organization_id == current_org.id).order_by(Integration.created_at.desc()))
    return result.scalars().all()

@router.post("/")
async def create_integration(integration_in: IntegrationCreate, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    db_integration = Integration(
        organization_id=current_org.id,
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

from backend.models import IntegrationType, AgentTool, DefaultTool, DOCUMENT_INTEGRATION_TYPES

@router.get("/active/tools")
async def get_active_tools(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(
        select(AgentTool, Integration.name.label("integration_name"))
        .join(Integration, AgentTool.integration_id == Integration.id)
        .where(AgentTool.is_active == True, AgentTool.organization_id == current_org.id)
    )
    tools = []
    for tool, integration_name in result.all():
        tool_dict = {column.name: getattr(tool, column.name) for column in tool.__table__.columns}
        tool_dict["integration_name"] = integration_name
        tools.append(tool_dict)
        
    default_result = await db.execute(
        select(DefaultTool).where(DefaultTool.is_active == True)
    )
    
    try:
        from agents.tools.registry import get_tool
    except ImportError:
        get_tool = None
        
    for d_tool in default_result.scalars().all():
        d_tool_dict = {column.name: getattr(d_tool, column.name) for column in d_tool.__table__.columns}
        d_tool_dict["integration_name"] = "System Default"
        
        if get_tool:
            t_obj = get_tool(d_tool.name)
            if t_obj:
                # Convert langchains tool args to JSON schema format
                properties = {}
                required = []
                for arg_name, arg_info in t_obj.args.items():
                    properties[arg_name] = {
                        "type": arg_info.get("type", "string"),
                        "description": arg_info.get("description", "")
                    }
                    if "default" not in arg_info:
                        required.append(arg_name)
                
                d_tool_dict["request_schema"] = {
                    "type": "object",
                    "properties": properties,
                    "required": required
                }
                
        tools.append(d_tool_dict)
        
    return tools

@router.get("/active/documents")
async def get_active_document_integrations(db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(
        select(Integration)
        .where(Integration.organization_id == current_org.id)
        .where(Integration.is_active == True)
        .where(Integration.status == IntegrationStatus.SYNCED)
        .where(Integration.type.in_(DOCUMENT_INTEGRATION_TYPES))
    )
    return result.scalars().all()


@router.get("/{integration_id}/documents")
async def get_integration_documents(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(
        select(KnowledgeDocument)
        .where(KnowledgeDocument.integration_id == integration_id, KnowledgeDocument.organization_id == current_org.id)
        .order_by(KnowledgeDocument.created_at.desc())
    )
    return result.scalars().all()

@router.delete("/{integration_id}")
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(Integration).where(Integration.id == integration_id, Integration.organization_id == current_org.id))
    integration = result.scalars().first()
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
async def start_crawl(integration_id: int, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), redis = Depends(get_redis), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(Integration).where(Integration.id == integration_id, Integration.organization_id == current_org.id))
    integration = result.scalars().first()
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
async def get_integration_tools(integration_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(
        select(AgentTool).where(AgentTool.integration_id == integration_id, AgentTool.organization_id == current_org.id)
    )
    tools = result.scalars().all()
    return tools

@router.put("/tools/{tool_id}/toggle")
async def toggle_tool_active(tool_id: int, db: AsyncSession = Depends(get_db), current_org: Organization = Depends(get_current_org)):
    result = await db.execute(select(AgentTool).where(AgentTool.id == tool_id, AgentTool.organization_id == current_org.id))
    tool = result.scalars().first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool.is_active = not tool.is_active
    await db.commit()
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
