from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from agents.semantic_router import run_semantic_routing
from agents.compiler.compiler import compile_graph
import logging
import json
import redis.asyncio as redis
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agents Runtime API")

class WorkflowDesc(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class SemanticRouteRequest(BaseModel):
    query: str
    workflows: list[WorkflowDesc]

class CompileRunRequest(BaseModel):
    run_id: str
    workflow_config: dict
    input_data: str

@app.post("/semantic_route")
async def semantic_route(req: SemanticRouteRequest):
    workflows_dict = [wf.dict() for wf in req.workflows]
    workflow_id = await run_semantic_routing(req.query, workflows_dict)
    return {"workflow_id": workflow_id}

async def execute_graph_and_log(run_id: str, workflow_config: dict, input_data: str):
    logger.info(f"Starting execution for run {run_id}")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_client = redis.from_url(redis_url)
    
    async def publish_log(level: str, message: str, meta: dict = None):
        log_entry = json.dumps({"level": level, "message": message, "meta": meta or {}})
        await redis_client.publish(f"run:{run_id}:logs", log_entry)

    try:
        await publish_log("INFO", "Compiling workflow graph...")
        graph = await compile_graph(workflow_config)
        
        initial_state = {"input": input_data, "messages": []}
        
        await publish_log("INFO", "Executing workflow...")
        
        async for output in graph.astream(initial_state):
            for node_name, state_update in output.items():
                await publish_log("INFO", f"Node '{node_name}' executed", {"state": str(state_update)})
                
        await publish_log("INFO", "Workflow execution completed successfully")
        await redis_client.set(f"run:{run_id}:status", "completed")
        
    except Exception as e:
        logger.error(f"Execution failed for {run_id}: {e}")
        await publish_log("ERROR", f"Workflow execution failed: {str(e)}")
        await redis_client.set(f"run:{run_id}:status", "failed")
    finally:
        await redis_client.close()

@app.post("/compile_and_run")
async def compile_and_run(req: CompileRunRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(execute_graph_and_log, req.run_id, req.workflow_config, req.input_data)
    return {"status": "started", "run_id": req.run_id}
