import httpx
from agents.config import agent_settings

async def call_llm(messages: list[dict], provider: str = None, model: str = None, tools: list[dict] = None) -> dict:
    """Execute LLM call through Bifrost Gateway."""
    provider = provider or agent_settings.AGENTS_DEFAULT_PROVIDER
    model = model or agent_settings.AGENTS_DEFAULT_MODEL
    
    model_id = f"{provider}/{model}" if "/" not in model else model
    
    url = f"{agent_settings.AGENTS_BIFROST_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {agent_settings.AGENTS_BIFROST_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_id,
        "messages": messages
    }
    if tools:
        payload["tools"] = tools
        
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]
