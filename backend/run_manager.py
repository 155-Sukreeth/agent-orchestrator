import logging
import httpx
from jinja2 import Template
from backend.config.settings import settings
from backend.database import get_db
from backend.models import Workflow
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Dict, Any

logger = logging.getLogger(__name__)
def extract_value_by_path(payload: Dict[str, Any], path: str) -> Any:
    if path.startswith("$."):
        path = path[2:]
    elif path.startswith("$"):
        path = path[1:]
        
    if not path:
        return payload
        
    parts = path.split(".")
    current = payload
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return None
    return current

def apply_input_mapping(payload: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
    state = {}
    for state_key, json_path in mapping.items():
        try:
            value = extract_value_by_path(payload, json_path)
            if value is not None:
                # Assign to state_key, handling nested keys like 'metadata.sender_id'
                parts = state_key.split('.')
                current = state
                for part in parts[:-1]:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
                current[parts[-1]] = value
        except Exception as e:
            logger.warning(f"Failed to map {json_path} to {state_key}: {e}")
    return state

def extract_node_by_type(graph_def: dict, node_type: str) -> dict:
    for node in graph_def.get("nodes", []):
        if node.get("type") == node_type:
            return node.get("data", {})
    return {}

async def execute(workflow_id: str, trigger_context: Any, db: Session = None):
    # Depending on how it's called, we might need a db session
    from backend.database import SessionLocal
    close_db = False
    if not db:
        db = SessionLocal()
        close_db = True
        
    try:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
            
        graph_def = workflow.graph_definition
        start_config = extract_node_by_type(graph_def, "start")
        end_config = extract_node_by_type(graph_def, "end")
        
        # Start: normalize trigger payload → AgentState
        mapping = start_config.get("input_mapping", {})
        if not mapping:
            # fallback
            default_key = start_config.get("default_input_key", "input")
            initial_state = {default_key: trigger_context.payload}
        else:
            initial_state = apply_input_mapping(trigger_context.payload, mapping)
            
        # Create a run in the DB
        from backend.models import Run
        run = Run(
            workflow_id=workflow.id,
            trigger_id=trigger_context.trigger_id if hasattr(trigger_context, 'trigger_id') else None,
            input_data=initial_state,
            status="running"
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        
        # Call agents service synchronously to get final state
        # In a real distributed system, this might be a task queue
        agents_url = f"{settings.AGENTS_SERVICE_URL}/compile_and_run_sync"
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(agents_url, json={
                "run_id": str(run.id),
                "workflow_config": graph_def,
                "input_data": initial_state
            })
            response.raise_for_status()
            result = response.json()
            
        final_state = result.get("final_state", {})
        
        # End: extract output and format
        output_key = end_config.get("output_from", "output")
        output = final_state.get(output_key, "")
        
        if end_config.get("response_template"):
            template = Template(end_config["response_template"])
            output = template.render(**final_state)
            
        # Update Run
        run.output_data = final_state
        run.output_text = str(output)
        run.status = "completed"
        db.commit()
        
        # Deliver via trigger's reply_fn
        if trigger_context.reply_fn:
            await trigger_context.reply_fn(output)
            
        return output
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        # update run status if it exists
        raise e
    finally:
        if close_db:
            db.close()
