import contextlib
from fastapi import FastAPI
from sqlalchemy import text
from backend.database import engine, Base
import backend.models

from backend.routers.webhooks import router as webhooks_router
from backend.routers.agents import router as agents_router
from backend.routers.workflows import router as workflows_router
from backend.routers.runs import router as runs_router
from backend.routers.ws import router as ws_router

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    yield
    await engine.dispose()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Agent Orchestrator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to ["http://localhost:3000", "http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks_router)
app.include_router(agents_router)
app.include_router(workflows_router)
app.include_router(runs_router)
app.include_router(ws_router)

@app.get("/health")
def health():
    return {"status": "ok"}
