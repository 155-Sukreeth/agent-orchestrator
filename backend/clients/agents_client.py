import httpx
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

class AgentsClient:
    def __init__(self):
        self.base_url = settings.AGENTS_API_URL

    async def compile_and_run(self, run_id: str, workflow_config: dict, input_data: str) -> bool:
        """Triggers the execution of a workflow in the Agents microservice."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/compile_and_run",
                    json={
                        "run_id": run_id,
                        "workflow_config": workflow_config,
                        "input_data": input_data
                    },
                    timeout=5.0
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to call Agents Microservice compile_and_run: {e}")
            raise e

    async def semantic_route(self, query: str, workflows: list) -> str:
        """Calls the Agents microservice to use an LLM for semantic routing."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/semantic_route",
                    json={
                        "query": query,
                        "workflows": workflows
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                return data.get("workflow_id")
        except Exception as e:
            logger.error(f"Failed to call Agents Microservice semantic_route: {e}")
            raise e

agents_client = AgentsClient()
