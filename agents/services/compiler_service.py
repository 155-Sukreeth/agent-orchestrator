import logging
from agents.graph.builder import compile_graph
from agents.clients.redis_client import get_redis_client

logger = logging.getLogger(__name__)

class CompilerService:
    async def execute_graph_and_log(self, run_id: str, workflow_config: dict, input_data: str):
        logger.info(f"Starting execution for run {run_id}")
        redis_client = get_redis_client()
        
        try:
            await redis_client.publish_log(run_id, "INFO", "Compiling workflow graph...")
            graph = compile_graph(workflow_config)
            
            initial_state = {"input": input_data, "messages": []}
            
            await redis_client.publish_log(run_id, "INFO", "Executing workflow...")
            
            async for chunk, mode in graph.astream(initial_state, stream_mode=["custom", "updates"]):
                if mode == "custom":
                    # This is an event yielded by our BaseNode StreamWriter
                    await redis_client.publish_log(
                        run_id, 
                        "EVENT", 
                        f"Custom Event: {chunk.get('type')}", 
                        chunk
                    )
                elif mode == "updates":
                    # This is a standard LangGraph state update at the end of a node
                    for node_name, state_update in chunk.items():
                        await redis_client.publish_log(
                            run_id, 
                            "INFO", 
                            f"Node '{node_name}' finished", 
                            {"state": str(state_update)}
                        )
                    
            await redis_client.publish_log(run_id, "INFO", "Workflow execution completed successfully")
            await redis_client.set_status(run_id, "completed")
            
        except Exception as e:
            logger.error(f"Execution failed for {run_id}: {e}")
            await redis_client.publish_log(run_id, "ERROR", f"Workflow execution failed: {str(e)}")
            await redis_client.set_status(run_id, "failed")
        finally:
            await redis_client.close()

compiler_service = CompilerService()
