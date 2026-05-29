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
            # 1. Update status
            integration = await db.get(Integration, integration_id)
            if not integration:
                return
                
            integration.status = IntegrationStatus.SYNCING
            await db.commit()
            
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
                integration.status = IntegrationStatus.ERROR
                await db.commit()
                error_event = SyncErrorEvent(integration_id=integration_id, error=error_msg)
                await redis.publish(channel, error_event.model_dump_json())
                return

            try:
                # Initialize the FastMCP Client context block
                # We use streamable_http for unauthenticated local servers or SSE if configured
                async with Client(connection_url) as client:
                    tools = await client.list_tools()
                    
                    # 4. Wipe old tools for this integration
                    await db.execute(
                        AgentTool.__table__.delete().where(AgentTool.integration_id == integration_id)
                    )
                    
                    # 5. Insert new tools
                    for tool in tools:
                        db_tool = AgentTool(
                            organization_id=integration.organization_id,
                            integration_id=integration_id,
                            name=tool.name,
                            description=tool.description,
                            request_schema=tool.inputSchema, # mcp defines inputSchema
                            is_active=True
                        )
                        db.add(db_tool)
                        
                    await db.commit()

            except Exception as e:
                logger.error(f"Error syncing MCP server {connection_url}: {e}")
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

mcp_service = MCPService()
