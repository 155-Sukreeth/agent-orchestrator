import json
from backend.database import AsyncSessionLocal
from backend.models import Run, Workflow
from agents.compiler.compiler import compile_graph
from backend.config import settings
from backend.adaptors.registry import get_adaptor
import redis.asyncio as redis

async def execute_run(run_id: int):
    async with AsyncSessionLocal() as db:
        run = await db.get(Run, run_id)
        if not run:
            return
        
        workflow = await db.get(Workflow, run.workflow_id)
        if not workflow or not workflow.graph_definition:
            run.status = "failed"
            await db.commit()
            return

        state = {
            "messages": [{"role": "user", "content": run.input_text}],
            "input": run.input_text,
            "output": "",
            "channel": "telegram",
            "thread_id": run.thread_id,
            "metadata": {},
            "router_decision": ""
        }
        
        graph = compile_graph(workflow.graph_definition)
        redis_client = redis.from_url(settings.REDIS_URL)
        channel = f"run:{run.id}:logs"
        
        try:
            async for s in graph.astream(state, stream_mode="values"):
                await redis_client.publish(channel, json.dumps({"event": "update"}))
                state = s
            
            final_output = state.get("output", "Execution completed.")
            run.output_text = final_output
            run.status = "completed"
            
            adaptor = get_adaptor("telegram")
            if adaptor:
                await adaptor.send_message(run.sender_id, run.thread_id, final_output)
                
        except Exception as e:
            run.status = "failed"
            await redis_client.publish(channel, json.dumps({"event": "error", "error": str(e)}))
        finally:
            await db.commit()
            await redis_client.aclose()
