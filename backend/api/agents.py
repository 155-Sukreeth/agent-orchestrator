from fastapi import APIRouter

router = APIRouter(prefix="/agents", tags=["agents"])

@router.get("/")
async def list_agents():
    return []

@router.post("/")
async def create_agent():
    return {"status": "created"}
