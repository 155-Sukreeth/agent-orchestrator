from fastapi import FastAPI
from knowledge_base.routers import upsert, search

app = FastAPI(title="Knowledge Base Service", version="1.0.0")

app.include_router(upsert.router, prefix="/v1")
app.include_router(search.router, prefix="/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
