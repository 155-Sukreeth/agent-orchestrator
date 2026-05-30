from agents.graph.state import AgentState
from langgraph.prebuilt import ToolNode
from agents.tools.registry import tools_registry

# Create a singleton ToolNode populated with all registered tools
_prebuilt_tool_node = ToolNode(list(tools_registry.values()))

async def tool_node(state: AgentState, config: dict) -> dict:
    """
    Executes tool calls requested by the LLM.
    Wraps the standard langgraph.prebuilt.ToolNode.
    """
    # The prebuilt ToolNode takes a state dict and returns an update dict
    # containing a list of ToolMessages to append to the messages array.
    return await _prebuilt_tool_node.ainvoke(state)
