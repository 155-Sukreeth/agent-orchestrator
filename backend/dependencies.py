from backend.clients.agents_client import AgentsClient

agents_client_instance = AgentsClient()

def get_agents_client() -> AgentsClient:
    return agents_client_instance
