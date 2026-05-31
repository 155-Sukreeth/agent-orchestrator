import logging
import inspect
from agents.graph.state import AgentState
from agents.tools.registry import get_tool
from agents.graph.tool_executor import build_tool_invoke_payload

logger = logging.getLogger(__name__)

def get_nested(d, key_path, default=None):
    keys = key_path.split('.')
    current = d
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return default
    return current

async def tool_node(state: AgentState, config: dict) -> dict:
    """
    Executes a tool standalone without requiring an LLM to trigger it.
    It reads `tool_name` and `tool_kwargs` mapping from config.
    """
    tool_name = config.get("tool_name")
    if not tool_name:
        logger.warning("ToolNode executed but no tool_name configured in node data.")
        return {}
        
    tool_obj = get_tool(tool_name)
    if not tool_obj:
        logger.error(f"Tool '{tool_name}' not found in registry.")
        return {"output": f"Tool execution failed: '{tool_name}' not found"}

    # Resolve arguments
    # Look at tool args schema
    expected_args = list(tool_obj.args.keys())
    
    # We will build kwargs from state based on UI configuration or metadata
    # The UI will store mapped values in config.get("tool_kwargs", {})
    # e.g., { "recipient_id": "state.metadata.sender_id", "text": "Hello world" }
    
    tool_kwargs_config = config.get("tool_kwargs", {})
    resolved_kwargs = {}
    
    context = {
        "metadata": state.get("metadata", {}),
        "input": state.get("input", ""),
        "output": state.get("output", "")
    }
    
    for arg_name in expected_args:
        # Check if the user mapped this argument in the config
        if arg_name in tool_kwargs_config:
            val = tool_kwargs_config[arg_name]
            if isinstance(val, str) and val.startswith("state."):
                resolved_val = get_nested(context, val[6:])
            else:
                resolved_val = val
            resolved_kwargs[arg_name] = resolved_val
        else:
            # Fallback: check if the argument exists directly in metadata
            if arg_name in context["metadata"]:
                resolved_kwargs[arg_name] = context["metadata"][arg_name]

    tool_input = build_tool_invoke_payload(tool_name, resolved_kwargs, context["metadata"])
    logger.info("Executing standalone tool '%s' input=%s", tool_name, tool_input)

    try:
        result = await tool_obj.ainvoke(tool_input)
        
        # Merge result into metadata for downstream nodes
        metadata = state.get("metadata", {}).copy()
        metadata["tool_result"] = result
        
        return {
            "output": str(result),
            "metadata": metadata
        }
    except Exception as e:
        logger.error(f"Error executing tool '{tool_name}': {e}")
        return {"output": f"Tool execution error: {e}"}
