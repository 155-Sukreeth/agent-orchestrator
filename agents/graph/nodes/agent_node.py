from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.config.settings import agent_settings

def build_messages(state: AgentState, system_prompt: str) -> list[dict]:
    messages = state.get("messages", [])
    if not messages:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": state.get("input", "")}
        ]
    return messages

from agents.config.llm_params import LLMConfig

def build_agent_node(config: dict):
    llm_config = LLMConfig(**config.get("llm_params", {}))
    client = bifrost_client.client

    system_prompt = config.get("system_prompt", "You are a helpful assistant.")

    async def agent_node(state: AgentState) -> dict:
        payload = {
            "model": llm_config.primary_model,
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

        return {
            "messages": [response.choices[0].message],
            "output": response.choices[0].message.content,
            "metadata": {**state.get("metadata", {}), "provider_used": actual_provider}
        }

    return agent_node
