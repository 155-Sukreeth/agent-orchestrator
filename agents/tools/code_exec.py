from langchain_core.tools import tool

@tool
def code_exec(code: str) -> str:
    """Executes arbitrary python code safely."""
    return "Code execution not fully implemented."
