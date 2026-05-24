from agents.clients.backend_client import BackendServiceClient
from agents.clients.bifrost_client import BifrostClient

backend_client_instance = BackendServiceClient()
bifrost_client_instance = BifrostClient()

def get_backend_client() -> BackendServiceClient:
    return backend_client_instance

def get_bifrost_client() -> BifrostClient:
    return bifrost_client_instance
