from agents.compiler.state import AgentState
from agents.bifrost import call_llm

async def agent_node(state: AgentState, config: dict) -> dict:
    """Executes an LLM agent."""
    messages = state.get("messages", [])
    if not messages:
        sys_prompt = config.get("system_prompt", "You are a helpful assistant.")
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": state["input"]}
        ]
        
    provider = config.get("provider")
    model = config.get("model")
    
    response = await call_llm(messages, provider=provider, model=model)
    
    new_messages = messages + [response]
    return {
        "messages": new_messages,
        "output": response.get("content", "")
    }
