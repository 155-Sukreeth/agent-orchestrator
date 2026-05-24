from fastapi import APIRouter
from agents.schemas.routing import SemanticRouteRequest
from agents.services.semantic_router_service import semantic_router_service

router = APIRouter(tags=["semantic_route"])

@router.post("/semantic_route")
async def semantic_route(req: SemanticRouteRequest):
    workflows_dict = [wf.dict() for wf in req.workflows]
    workflow_id = await semantic_router_service.run_semantic_routing(req.query, workflows_dict)
    return {"workflow_id": workflow_id}
