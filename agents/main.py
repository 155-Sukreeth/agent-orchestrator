import contextlib
from fastapi import FastAPI
import logging
from agents.clients.http_client import HttpClientManager

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    HttpClientManager.start()
    yield
    await HttpClientManager.stop()

from agents.routers.semantic_router import router as semantic_router
from agents.routers.compiler import router as compiler_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agents Runtime API", lifespan=lifespan)

app.include_router(semantic_router)
app.include_router(compiler_router)

@app.get("/health")
def health():
    return {"status": "ok"}
