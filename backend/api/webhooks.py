from fastapi import APIRouter, Request, Depends, BackgroundTasks
from backend.adaptors.registry import get_adaptor
from backend.semantic_router import route_message
from backend.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import Run
from backend.run_manager import execute_run

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/telegram")
async def telegram_webhook(request: Request, bg_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    payload = await request.json()
    adaptor = get_adaptor("telegram")
    msg = await adaptor.parse_payload(payload)
    
    if not msg.get("text"):
        return {"status": "ignored"}
        
    workflow = await route_message(db, msg["text"], "telegram")
    if not workflow:
        await adaptor.send_message(msg["sender_id"], msg["thread_id"], "No matching workflow found for your request.")
        return {"status": "no_match"}
        
    run = Run(
        workflow_id=workflow.id,
        sender_id=msg["sender_id"],
        thread_id=msg["thread_id"],
        input_text=msg["text"],
        status="running"
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    
    bg_tasks.add_task(execute_run, run.id)
    return {"status": "accepted"}
