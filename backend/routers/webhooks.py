from fastapi import APIRouter, Request, Depends, BackgroundTasks
from backend.adaptors.registry import get_adaptor
from backend.services.semantic_router_service import semantic_router_service
from backend.services.run_service import run_service
from backend.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

from backend.dependencies import get_agents_client
from backend.clients.agents_client import AgentsClient

@router.post("/telegram")
async def telegram_webhook(
    request: Request, 
    bg_tasks: BackgroundTasks, 
    db: AsyncSession = Depends(get_db),
    agents_client: AgentsClient = Depends(get_agents_client)
):
    payload = await request.json()
    adaptor = get_adaptor("telegram")
    msg = await adaptor.parse_payload(payload)
    
    if not msg.get("text"):
        return {"status": "ignored"}
        
    workflow = await semantic_router_service.route_message(db, msg["text"], "telegram", agents_client)
    if not workflow:
        await adaptor.send_message(msg["sender_id"], msg["thread_id"], "No matching workflow found for your request.")
        return {"status": "no_match"}
        
    await run_service.start_run(db, workflow.id, msg["text"], agents_client, msg["sender_id"], msg["thread_id"])
    return {"status": "accepted"}
