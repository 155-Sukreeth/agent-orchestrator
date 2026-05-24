from fastapi import APIRouter, BackgroundTasks
from agents.schemas.execution import CompileRunRequest
from agents.services.compiler_service import compiler_service

router = APIRouter(tags=["compiler"])

@router.post("/compile_and_run")
async def compile_and_run(req: CompileRunRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        compiler_service.execute_graph_and_log, 
        req.run_id, 
        req.workflow_config, 
        req.input_data
    )
    return {"status": "started", "run_id": req.run_id}
