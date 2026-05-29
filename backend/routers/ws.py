from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import redis.asyncio as redis
from jose import jwt, JWTError
from backend.config.settings import settings
from backend.database import AsyncSessionLocal
from sqlalchemy.future import select
from backend.models import User, Run

router = APIRouter(tags=["ws"])

@router.websocket("/ws/runs/{run_id}/logs")
async def websocket_endpoint(websocket: WebSocket, run_id: int, token: str = Query(None)):
    await websocket.accept()
    
    if not token:
        await websocket.send_text('{"level": "ERROR", "message": "Authentication token missing."}')
        await websocket.close(code=1008)
        return
        
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        
        async with AsyncSessionLocal() as db:
            user = await db.get(User, user_id)
            if not user or not user.organization_id:
                raise ValueError("Invalid user")
                
            run = await db.get(Run, run_id)
            if not run or run.organization_id != user.organization_id:
                await websocket.send_text('{"level": "ERROR", "message": "Run not found or access denied."}')
                await websocket.close(code=1008)
                return
    except (JWTError, ValueError):
        await websocket.send_text('{"level": "ERROR", "message": "Invalid authentication token."}')
        await websocket.close(code=1008)
        return

    redis_client = redis.from_url(settings.REDIS_URL)
    pubsub = redis_client.pubsub()
    channel = f"run:{run_id}:logs"
    await pubsub.subscribe(channel)
    
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data'].decode('utf-8')
                await websocket.send_text(data)
    except WebSocketDisconnect:
        await pubsub.unsubscribe(channel)
        await redis_client.aclose()
