from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from backend.config.settings import settings

router = APIRouter(tags=["ws"])

@router.websocket("/ws/runs/{run_id}/logs")
async def websocket_endpoint(websocket: WebSocket, run_id: int):
    await websocket.accept()
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
