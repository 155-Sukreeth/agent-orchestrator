from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from backend.config.settings import settings

router = APIRouter(tags=["ws"])

@router.websocket("/ws/runs/{run_id}/logs")
async def websocket_endpoint(websocket: WebSocket, run_id: int):
    await websocket.accept()
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
