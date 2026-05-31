from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from backend.repositories.base import BaseRepository
from backend.models import Integration, AgentTool, KnowledgeDocument

class IntegrationRepository(BaseRepository[Integration]):
    def __init__(self):
        super().__init__(model_class=Integration)

    async def get_all_by_org(self, db: AsyncSession, org_id: int) -> List[Integration]:
        result = await db.execute(
            select(self.model_class)
            .where(self.model_class.organization_id == org_id)
            .order_by(self.model_class.created_at.desc())
        )
        return result.scalars().all()

    async def get_tools_by_integration(self, db: AsyncSession, integration_id: int, org_id: int) -> List[AgentTool]:
        result = await db.execute(
            select(AgentTool)
            .where(AgentTool.integration_id == integration_id, AgentTool.organization_id == org_id)
        )
        return result.scalars().all()

    async def get_documents_by_integration(self, db: AsyncSession, integration_id: int, org_id: int) -> List[KnowledgeDocument]:
        result = await db.execute(
            select(KnowledgeDocument)
            .where(KnowledgeDocument.integration_id == integration_id, KnowledgeDocument.organization_id == org_id)
        )
        return result.scalars().all()

    async def get_tool_by_id(self, db: AsyncSession, tool_id: int, org_id: int) -> Optional[AgentTool]:
        result = await db.execute(
            select(AgentTool).where(AgentTool.id == tool_id, AgentTool.organization_id == org_id)
        )
        return result.scalar_one_or_none()

    async def get_active_tools(self, db: AsyncSession, org_id: int):
        # Join with integrations to fetch integration name
        result = await db.execute(
            select(AgentTool, Integration.name.label("integration_name"))
            .join(Integration, AgentTool.integration_id == Integration.id)
            .where(
                AgentTool.organization_id == org_id,
                AgentTool.is_active == True,
                Integration.is_active == True
            )
        )
        return result.all()
        
    async def get_active_document_integrations(self, db: AsyncSession, org_id: int) -> List[Integration]:
        from backend.models import DOCUMENT_INTEGRATION_TYPES, IntegrationStatus
        result = await db.execute(
            select(Integration).where(
                Integration.organization_id == org_id,
                Integration.is_active == True,
                Integration.status == IntegrationStatus.SYNCED,
                Integration.type.in_(DOCUMENT_INTEGRATION_TYPES)
            )
        )
        return result.scalars().all()

integration_repository = IntegrationRepository()
