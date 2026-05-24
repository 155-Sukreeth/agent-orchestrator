from agents.compiler.state import AgentState
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

def build_agent_node(config: dict):
    provider = config.get("provider", agent_settings.AGENTS_DEFAULT_PROVIDER)
    model = config.get("model", agent_settings.AGENTS_DEFAULT_MODEL)
    client = bifrost_client.client
    model_name = bifrost_client.resolve_model(provider, model)

    # Optional fallback chain from node config
    fallback_configs = config.get("fallbacks", [])
    fallbacks = [f"{f['provider']}/{f['model']}" for f in fallback_configs]
    
    system_prompt = config.get("system_prompt", "You are a helpful assistant.")

    async def agent_node(state: AgentState) -> dict:
        payload = {
            "model": model_name,
            "messages": build_messages(state, system_prompt),
            "max_tokens": 1000,
        }
        if fallbacks:
            # We use extra_body to pass custom parameters like fallbacks to the gateway via the OpenAI SDK
            payload["extra_body"] = {"fallbacks": fallbacks}

        response = await client.chat.completions.create(**payload)
        
        # Check actual provider used (if gateway returns it)
        actual_provider = provider
        if hasattr(response, "model_extra") and response.model_extra:
            actual_provider = response.model_extra.get("provider", provider)

        return {
            "messages": [response.choices[0].message],
            "output": response.choices[0].message.content,
            "metadata": {**state.get("metadata", {}), "provider_used": actual_provider}
        }

    return agent_node
