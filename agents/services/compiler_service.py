import logging
from agents.graph.builder import compile_graph
from agents.clients.redis_client import get_redis_client
from agents.clients.http_client import with_resiliency

logger = logging.getLogger(__name__)

class CompilerService:
    @with_resiliency()
    async def _update_backend_status(self, run_id: str, status: str, output_text: str = None, output_data: dict = None, logs: list = None):
        import httpx
        from agents.config.settings import agent_settings
        from agents.clients.http_client import HttpClientManager
        try:
            client = HttpClientManager.get_client()
            await client.patch(
                f"{agent_settings.BACKEND_API_URL}/api/runs/{run_id}",
                json={
                    "status": status,
                    "output_text": output_text,
                    "output_data": output_data,
                    "logs": logs or []
                },
                timeout=5.0
            )
        except Exception as e:
            logger.error(f"Failed to sync status to backend: {e}")
            raise e

    async def execute_graph_and_log(
        self,
        run_id: str,
        workflow_config: dict,
        user_message: str,
        context: dict = None,
        trigger_meta: dict = None,
    ):
        logger.info(f"Starting execution for run {run_id}")
        redis_client = get_redis_client()
        final_state = None
        collected_logs = []
        
        async def _log(level: str, message: str, meta: dict = None):
            await redis_client.publish_log(run_id, level, message, meta)
            collected_logs.append({"level": level, "message": message, "details": meta})
            
        try:
            await _log("INFO", "Compiling workflow graph...")
            graph = compile_graph(workflow_config)
            
            initial_state = {
                "input": user_message,
                "messages": [{"role": "user", "content": user_message}],
                "metadata": {**(context or {}), "trigger": trigger_meta or {}},
            }
            
            await _log("INFO", "Executing workflow...")
            
            async for mode, chunk in graph.astream(initial_state, stream_mode=["custom", "updates"]):
                if mode == "custom":
                    await _log("EVENT", f"Custom Event: {chunk.get('type')}", chunk)
                elif mode == "updates":
                    for node_name, state_update in chunk.items():
                        final_state = state_update
                        await _log("INFO", f"Node '{node_name}' finished", {"state": str(state_update)})
                    
            await _log("INFO", "Workflow execution completed successfully")
            await redis_client.set_status(run_id, "completed")
            
            # Sync to backend
            output_text = "Completed"
            if final_state and "messages" in final_state and final_state["messages"]:
                last_msg = final_state["messages"][-1]
                if isinstance(last_msg, dict):
                    output_text = last_msg.get("content", str(last_msg))
                else:
                    output_text = getattr(last_msg, "content", str(last_msg))
                
            await self._update_backend_status(run_id, "completed", output_text=output_text, output_data=final_state, logs=collected_logs)
            
        except Exception as e:
            logger.error(f"Execution failed for {run_id}: {e}")
            await _log("ERROR", f"Workflow execution failed: {str(e)}")
            await redis_client.set_status(run_id, "failed")
            await self._update_backend_status(run_id, "failed", output_text=str(e), logs=collected_logs)
        finally:
            await redis_client.close()

compiler_service = CompilerService()
