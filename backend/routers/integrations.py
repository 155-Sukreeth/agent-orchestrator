from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import get_db
from backend.models import Integration
from sqlalchemy import delete

router = APIRouter()

@router.delete("/{integration_id}")
async def delete_integration(integration_id: int, db: AsyncSession = Depends(get_db)):
    # Fetch the integration
    integration = await db.get(Integration, integration_id)
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    # Delete the integration
    # Because we added ondelete="CASCADE" to foreign keys,
    # this will automatically hard delete all associated KnowledgeDocuments, AgentTools, and KnowledgeChunks.
    await db.delete(integration)
    await db.commit()
    
    return {"status": "success", "message": f"Integration {integration_id} and all its data have been hard deleted."}
