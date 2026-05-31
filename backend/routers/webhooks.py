from fastapi import APIRouter, Request, Depends, BackgroundTasks, HTTPException
from backend.adaptors.registry import get_adaptor
from backend.services.semantic_router_service import semantic_router_service
from backend.services.run_service import run_service
from backend.database import get_db
from backend.dependencies import get_agents_client
from backend.clients.agents_client import AgentsClient
from backend.schemas.triggers.webhook import WebhookTriggerPayload
from backend.schemas.triggers.semantic import SemanticTriggerPayload
from backend.mappers.trigger_mapper import trigger_mapper
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/{workflow_id}")
async def trigger_workflow_via_webhook(
    workflow_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    agents_client: AgentsClient = Depends(get_agents_client),
):
    """
    External webhook endpoint. Any external system can POST here to trigger
    a workflow. The raw request is normalized into WebhookTriggerPayload and
    mapped to AgentRunPayload before dispatch.
    """
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass  # body may not be JSON (e.g. form data) — treat as empty

    query_params = dict(request.query_params)
    headers = dict(request.headers)

    webhook_payload = WebhookTriggerPayload(
        headers=headers,
        body=body,
        query_params=query_params,
    )
    agent_payload = trigger_mapper.from_webhook(
        payload=webhook_payload,
        run_id="pending",
        workflow_config={},
    )
    from backend.repositories.workflow_repository import workflow_repository
    # We must fetch the workflow first to determine which org it belongs to
    # because webhooks are external and unauthenticated by default.
    workflow = await workflow_repository.get_entity_by_id(db, workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    try:
        run_id = await run_service.start_run(db, workflow_id, agent_payload, agents_client, org_id=workflow.organization_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "accepted", "run_id": run_id}


@router.post("/telegram")
async def telegram_webhook(
    request: Request,
    bg_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    agents_client: AgentsClient = Depends(get_agents_client),
):
    """
    Telegram channel adaptor entry point. Parses the Telegram payload,
    runs semantic routing to find the right workflow, then fires via
    SemanticTriggerPayload.
    """
    payload = await request.json()
    adaptor = get_adaptor("telegram")
    msg = await adaptor.parse_payload(payload)

    if not msg.get("text"):
        return {"status": "ignored"}
    # TODO: Extract org_id dynamically from the incoming webhook URL/token or connection mapping
    SYSTEM_ORG_ID = 1 
    
    workflow = await semantic_router_service.route_message(db, msg["text"], "telegram", agents_client, SYSTEM_ORG_ID)
    if not workflow:
        await adaptor.send_message(msg["sender_id"], msg["thread_id"], "No matching workflow found for your request.")
        return {"status": "no_match"}

    semantic_payload = SemanticTriggerPayload(
        channel="telegram",
        sender_id=msg["sender_id"],
        message=msg["text"],
        thread_id=msg.get("thread_id"),
    )
    agent_payload = trigger_mapper.from_semantic(
        payload=semantic_payload,
        run_id="pending",
        workflow_config={},
    )
    await run_service.start_run(
        db=db, 
        workflow_id=workflow.id, 
        agent_payload=agent_payload, 
        agents_client=agents_client, 
        org_id=workflow.organization_id,
        sender_id=msg["sender_id"],
        thread_id=msg.get("thread_id")
    )
    return {"status": "accepted"}
