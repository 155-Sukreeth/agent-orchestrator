import redis.asyncio as redis
import os
import json

class RedisLogClient:
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = redis.from_url(redis_url)

    async def publish_log(self, run_id: str, level: str, message: str, meta: dict = None):
        log_entry = json.dumps({"level": level, "message": message, "meta": meta or {}})
        await self.redis.publish(f"run:{run_id}:logs", log_entry)

    async def set_status(self, run_id: str, status: str):
        await self.redis.set(f"run:{run_id}:status", status)

    async def close(self):
        await self.redis.close()

# Create a factory to allow per-request instantiation or single global instance
def get_redis_client() -> RedisLogClient:
    return RedisLogClient()
