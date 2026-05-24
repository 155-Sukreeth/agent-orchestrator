from agents.compiler.state import AgentState

async def human_pause_node(state: AgentState, config: dict) -> dict:
    return {"output": "Waiting for human input..."}
