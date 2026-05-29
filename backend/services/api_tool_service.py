import logging
import json
from sqlalchemy import func
from backend.models import Integration, IntegrationStatus, AgentTool
from backend.schemas.integration import SyncStartEvent, SyncCompleteEvent, SyncErrorEvent
from backend.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class APIToolService:
    async def sync_api_tool(self, integration_id: int, config: dict, redis):
        """Processes a custom API Tool integration and syncs it to the AgentTool table."""
        channel = f"integration_stream:{integration_id}"
        
        async with AsyncSessionLocal() as db:
            # 1. Update status
            integration = await db.get(Integration, integration_id)
            if not integration:
                return
                
            integration.status = IntegrationStatus.SYNCING
            await db.commit()
            
            # 2. Emit Start Event
            start_event = SyncStartEvent(integration_id=integration_id)
            await redis.publish(channel, start_event.model_dump_json())

            try:
                # 3. Parse tool config
                tool_name = config.get("tool_name", "custom_api_tool")
                description = config.get("description", "A custom API tool.")
                
                request_schema_str = config.get("request_args", "{}")
                response_schema_str = config.get("response_schema", "{}")
                
                request_schema = {}
                response_schema = {}
                
                try:
                    if request_schema_str:
                        request_schema = json.loads(request_schema_str)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON for request schema in integration {integration_id}")
                    
                try:
                    if response_schema_str:
                        response_schema = json.loads(response_schema_str)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON for response schema in integration {integration_id}")
                
                # 4. Wipe old tools for this integration
                await db.execute(
                    AgentTool.__table__.delete().where(AgentTool.integration_id == integration_id)
                )
                
                # 5. Insert new tool
                db_tool = AgentTool(
                    organization_id=integration.organization_id,
                    integration_id=integration_id,
                    name=tool_name,
                    description=description,
                    request_schema=request_schema,
                    response_schema=response_schema,
                    is_active=True
                )
                db.add(db_tool)
                    
                await db.commit()

            except Exception as e:
                logger.error(f"Error syncing API tool {integration_id}: {e}")
                await db.rollback()
                
                error_event = SyncErrorEvent(integration_id=integration_id, error=str(e))
                await redis.publish(channel, error_event.model_dump_json())
                
                integration = await db.get(Integration, integration_id)
                if integration:
                    integration.status = IntegrationStatus.ERROR
                    await db.commit()
                return

            # 6. Finish normally
            integration.status = IntegrationStatus.SYNCED
            integration.last_sync = func.now()
            await db.commit()
            
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

api_tool_service = APIToolService()
