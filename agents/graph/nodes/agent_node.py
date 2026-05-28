import logging
from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.config.llm_params import llm_params_registry

logger = logging.getLogger(__name__)

def build_messages(state: AgentState, system_prompt: str) -> list[dict]:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    for msg in state.get("messages", []):
        messages.append(msg)
        
    return messages

def build_agent_node(config: dict):
    llm_config = llm_params_registry.AGENT_DEFAULT.model_copy(update=config.get("llm_params", {}))
    client = bifrost_client.client
    
    tools_list = config.get("tools", [])
    system_prompt = config.get("system_prompt", "You are a helpful assistant.")

    async def agent_node(state: AgentState) -> dict:
        try:
            provider, model = llm_config.primary_model.split("/")
        except ValueError:
            provider, model = llm_params_registry.AGENT_DEFAULT.primary_model.split("/")
            
        resolved_model = bifrost_client.resolve_model(provider, model)
        
        payload = {
            "model": resolved_model,
            "messages": build_messages(state, system_prompt),
            "max_tokens": llm_config.get_max_tokens(),
            "temperature": llm_config.temperature,
        }
        
        extra_body = {}
        if llm_config.secondary_models:
            extra_body["fallbacks"] = llm_config.secondary_models
        if llm_config.enable_prompt_caching:
            extra_body["enable_prompt_caching"] = True
            
        if extra_body:
            payload["extra_body"] = extra_body
            
        if llm_config.response_format:
            payload["response_format"] = llm_config.response_format
            
        if llm_config.tools:
            payload["tools"] = llm_config.tools

        response = await client.chat.completions.create(**payload, timeout=llm_config.timeout)
        
        actual_provider = "unknown"
        if hasattr(response, "model_extra") and response.model_extra:
            actual_provider = response.model_extra.get("provider", "unknown")

        msg_obj = response.choices[0].message
        msg_dict = {"role": "assistant", "content": msg_obj.content or ""}
        if getattr(msg_obj, "tool_calls", None):
            msg_dict["tool_calls"] = [tc.model_dump() for tc in msg_obj.tool_calls]

        return {
            "messages": [msg_dict],
            "output": msg_obj.content,
            "metadata": {**state.get("metadata", {}), "provider_used": actual_provider}
        }

    return agent_node
