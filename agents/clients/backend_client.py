import httpx
import logging
from agents.clients.http_client import HttpClientManager, with_resiliency

logger = logging.getLogger(__name__)

class BackendServiceClient:
    """Client for the Agents microservice to communicate with the Backend microservice."""
    
    def __init__(self):
        # By default, use the docker-compose internal network URL for the backend
        self.base_url = "http://backend:8000"

    @with_resiliency()
    async def get_workflow_definition(self, workflow_id: str) -> dict:
        """Fetches a workflow definition from the backend."""
        try:
            client = HttpClientManager.get_client()
            response = await client.get(
                f"{self.base_url}/workflows/{workflow_id}",
                timeout=5.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch workflow {workflow_id} from backend: {e}")
            raise e

backend_client = BackendServiceClient()
