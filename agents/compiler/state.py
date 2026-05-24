from typing import TypedDict, Any

class AgentState(TypedDict):
    messages: list[dict]
    input: str
    output: str
    channel: str
    thread_id: str
    metadata: dict[str, Any]
    router_decision: str
