from typing import TypedDict, Any, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list[dict], add_messages]
    input: str
    output: str
    channel: str
    thread_id: str
    metadata: dict[str, Any]
    router_decision: str
