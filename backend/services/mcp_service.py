import logging
from sqlalchemy import func, select
from fastmcp.client import Client

from backend.models import Integration, IntegrationStatus, AgentTool
from backend.schemas.integration import SyncStartEvent, SyncCompleteEvent, SyncErrorEvent
from backend.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

class MCPService:
    async def sync_mcp_tools(self, integration_id: int, config: dict, redis):
        """Connects to MCP Server and syncs available tools to the AgentTool table."""
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

            # 3. Connect to MCP and fetch tools
            connection_url = config.get("connection_url")
            # Currently we assume standard SSE transport on the url or HTTP streamable
            # fastmcp Client will automatically choose based on the URL or defaults
            
            if not connection_url:
                error_msg = "No connection URL provided in configuration."
                logger.error(error_msg)
                integration = await integration_repository.update(db, integration, {"status": IntegrationStatus.ERROR})
                error_event = SyncErrorEvent(integration_id=integration_id, error=error_msg)
                await redis.publish(channel, error_event.model_dump_json())
                return

            try:
                # Initialize the FastMCP Client context block
                # We use streamable_http for unauthenticated local servers or SSE if configured
                async with Client(connection_url) as client:
                    tools = await client.list_tools()
                    
                    # 4. Wipe old tools for this integration
                    await agent_tool_repository.delete_by_integration_id(db, integration_id)
                    
                    # 5. Insert new tools
                    for tool in tools:
                        tool_data = {
                            "organization_id": integration.organization_id,
                            "integration_id": integration_id,
                            "name": tool.name,
                            "description": tool.description,
                            "request_schema": tool.inputSchema, # mcp defines inputSchema
                            "is_active": True
                        }
                        await agent_tool_repository.create(db, tool_data)

            except Exception as e:
                logger.error(f"Error syncing MCP server {connection_url}: {e}")
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

mcp_service = MCPService()
