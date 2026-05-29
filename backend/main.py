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
from backend.routers.integrations import router as integrations_router
from backend.routers.files import router as files_router
from backend.routers.connections import router as connections_router
from backend.routers.auth import router as auth_router

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    yield
    await engine.dispose()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Agent Orchestrator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev only, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(webhooks_router)
app.include_router(agents_router, prefix="/api/agents")
app.include_router(workflows_router, prefix="/api/workflows")
app.include_router(runs_router, prefix="/api/runs")
app.include_router(ws_router)
app.include_router(integrations_router, prefix="/api/integrations")
app.include_router(files_router, prefix="/api/files")
app.include_router(connections_router, prefix="/api/connections")

@app.get("/health")
def health():
    return {"status": "ok"}
