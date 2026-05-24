from fastapi import APIRouter

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/")
async def list_workflows():
    return []

@router.post("/")
async def create_workflow():
    return {"status": "created"}
