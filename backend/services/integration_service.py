from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Any
from backend.repositories.integration_repository import integration_repository
from backend.models import Integration

class IntegrationService:
    async def get_integrations(self, db: AsyncSession, org_id: int) -> List[Any]:
        return await integration_repository.get_all_by_org(db, org_id)

    async def get_integration(self, db: AsyncSession, integration_id: int, org_id: int) -> Any:
        integration = await integration_repository.get_by_id(db, integration_id, org_id)
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        return integration

    async def create_integration(self, db: AsyncSession, integration_data: Any, org_id: int) -> Any:
        data_dict = integration_data.model_dump()
        return await integration_repository.create(db, data_dict, org_id=org_id)

    async def delete_integration(self, db: AsyncSession, integration_id: int, org_id: int) -> dict:
        success = await integration_repository.delete(db, integration_id, org_id)
        if not success:
            raise HTTPException(status_code=404, detail="Integration not found")
        return {"message": "Integration deleted"}

    async def get_tools(self, db: AsyncSession, integration_id: int, org_id: int) -> List[Any]:
        await self.get_integration(db, integration_id, org_id) # Ensure it exists
        return await integration_repository.get_tools_by_integration(db, integration_id, org_id)

    async def get_documents(self, db: AsyncSession, integration_id: int, org_id: int) -> List[Any]:
        await self.get_integration(db, integration_id, org_id) # Ensure it exists
        return await integration_repository.get_documents_by_integration(db, integration_id, org_id)
        
    async def toggle_tool(self, db: AsyncSession, tool_id: int, org_id: int) -> Any:
        tool = await integration_repository.get_tool_by_id(db, tool_id, org_id)
        if not tool:
            raise HTTPException(status_code=404, detail="Tool not found")
            
        from backend.repositories.agent_tool_repository import agent_tool_repository
        updated_tool = await agent_tool_repository.update(db, tool, {"is_active": not tool.is_active})
        return updated_tool

    async def get_active_tools(self, db: AsyncSession, org_id: int) -> List[dict]:
        tools_with_integrations = await integration_repository.get_active_tools(db, org_id)
        
        from backend.repositories.default_tool_repository import default_tool_repository
        default_tools = await default_tool_repository.get_active_tools(db)
        
        result = []
        for tool in default_tools:
            result.append({
                "id": f"default_{tool.id}",
                "name": tool.name,
                "description": tool.description,
                "integration_name": "System",
                "request_schema": {"properties": {"channel": {"type": "string"}}} if tool.name == "send_notification" else {} # Hack for now, but should be in DB ideally
            })
            
        for tool, integration_name in tools_with_integrations:
            result.append({
                "id": tool.id,
                "name": tool.name,
                "description": tool.description,
                "integration_name": integration_name,
                "request_schema": tool.request_schema,
                "response_schema": tool.response_schema
            })
            
        return result

    async def get_active_document_integrations(self, db: AsyncSession, org_id: int) -> List[Any]:
        return await integration_repository.get_active_document_integrations(db, org_id)

integration_service = IntegrationService()
