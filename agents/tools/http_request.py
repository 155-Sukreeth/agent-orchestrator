from langchain_core.tools import tool

@tool
def http_request(url: str, method: str) -> str:
    """Makes an HTTP request to a URL."""
    return "HTTP request not fully implemented."
