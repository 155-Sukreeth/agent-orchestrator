from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.templates import render

from agents.config.llm_params import LLMConfig, llm_params_registry
from agents.config.constants import ModelNames

async def router_node(state: AgentState, config: dict) -> dict:
    condition_type = config.get("condition_type")
    llm_config = llm_params_registry.LLM_JUDGE.model_copy(update=config.get("llm_params", {}))
    
    if condition_type == "llm_judge":
        prompt = render("llm_judge", section="full", condition=config.get("condition"), message=state["input"])
        
        try:
            provider, model = llm_config.primary_model.split("/")
        except ValueError:
            provider, model = llm_params_registry.LLM_JUDGE.primary_model.split("/")
            
        resolved_model = bifrost_client.resolve_model(provider, model)
        client = bifrost_client.client
        
        extra_body = {}
        if llm_config.secondary_models:
            extra_body["fallbacks"] = llm_config.secondary_models
            
        response = await client.chat.completions.create(
            model=resolved_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=llm_config.get_max_tokens(),
            temperature=llm_config.temperature,
            extra_body=extra_body,
            timeout=llm_config.timeout
        )
        content = response.choices[0].message.content.strip().upper()
        if "YES" in content:
            return {"router_decision": "yes"}
        return {"router_decision": "no"}
        
    elif condition_type == "contains_keyword":
        keyword = config.get("keyword", "")
        if keyword.lower() in state["input"].lower():
            return {"router_decision": "yes"}
        return {"router_decision": "no"}
        
    return {"router_decision": "no"}
