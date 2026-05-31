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
            from backend.repositories.user_repository import user_repository
            from backend.repositories.run_repository import run_repository
            
            user = await user_repository.get_by_id(db, user_id)
            if not user or not user.organization_id:
                raise ValueError("Invalid user")
                
            run = await run_repository.get_by_id(db, run_id)
            if not run or run.organization_id != user.organization_id:
                await websocket.send_text('{"level": "ERROR", "message": "Run not found or access denied."}')
                await websocket.close(code=1008)
                return
    except (JWTError, ValueError):
        await websocket.send_text('{"level": "ERROR", "message": "Invalid authentication token."}')
        await websocket.close(code=1008)
        return

    redis_client = redis.from_url(
        settings.REDIS_URL, 
        decode_responses=True,
        socket_timeout=None,
        socket_keepalive=True
    )
    pubsub = redis_client.pubsub()
    channel = f"run:{run_id}:logs"
    await pubsub.subscribe(channel)
    
    import asyncio
    from redis.exceptions import TimeoutError as RedisTimeoutError
    
    try:
        while True:
            try:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message is not None and message['type'] == 'message':
                    await websocket.send_text(message['data'])
                await asyncio.sleep(0.1)
            except RedisTimeoutError:
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket Error: {e}")
                break
    finally:
        await pubsub.unsubscribe(channel)
        await redis_client.aclose()
