import contextlib
from fastapi import FastAPI
from knowledge_base.clients.http_client import HttpClientManager
from knowledge_base.routers import upsert, search

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    HttpClientManager.start()
    yield
    await HttpClientManager.stop()

app = FastAPI(title="Knowledge Base Service", version="1.0.0", lifespan=lifespan)

app.include_router(upsert.router, prefix="/v1")
app.include_router(search.router, prefix="/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
