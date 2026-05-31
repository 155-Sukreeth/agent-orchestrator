from langchain_core.tools import tool

@tool
def web_search(query: str) -> str:
    """Searches the web for a given query."""
    return "Web search not fully implemented."
