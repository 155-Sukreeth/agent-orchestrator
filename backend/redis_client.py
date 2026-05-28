import os
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Create a global Redis connection pool
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

async def get_redis():
    return redis_client
