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
            from backend.repositories.integration_repository import integration_repository
            from backend.repositories.agent_tool_repository import agent_tool_repository
            
            # 1. Update status
            integration = await integration_repository.get_by_id(db, integration_id)
            if not integration:
                return
                
            integration = await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCING})
            
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
                await agent_tool_repository.delete_by_integration_id(db, integration_id)
                
                # 5. Insert new tool
                tool_data = {
                    "organization_id": integration.organization_id,
                    "integration_id": integration_id,
                    "name": tool_name,
                    "description": description,
                    "request_schema": request_schema,
                    "response_schema": response_schema,
                    "is_active": True
                }
                await agent_tool_repository.create(db, tool_data)

            except Exception as e:
                logger.error(f"Error syncing API tool {integration_id}: {e}")
                await db.rollback()
                
                error_event = SyncErrorEvent(integration_id=integration_id, error=str(e))
                await redis.publish(channel, error_event.model_dump_json())
                
                integration = await integration_repository.get_by_id(db, integration_id)
                if integration:
                    await integration_repository.update(db, integration, {"status": IntegrationStatus.ERROR})
                return

            # 6. Finish normally
            if integration:
                integration = await integration_repository.get_by_id(db, integration_id)
                await integration_repository.update(db, integration, {"status": IntegrationStatus.SYNCED, "last_sync": func.now()})
            
            complete_event = SyncCompleteEvent(integration_id=integration_id)
            await redis.publish(channel, complete_event.model_dump_json())

api_tool_service = APIToolService()
