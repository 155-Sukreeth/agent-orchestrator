from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.templates import render

from agents.config.llm_params import LLMConfig
from agents.config.constants import ModelNames

async def router_node(state: AgentState, config: dict) -> dict:
    condition_type = config.get("condition_type")
    llm_config = LLMConfig(**config.get("llm_params", {"primary_model": ModelNames.GPT_4O_MINI}))
    
    if condition_type == "llm_judge":
        prompt = render("llm_judge", section="full", condition=config.get("condition"), message=state["input"])
        
        client = bifrost_client.client
        
        response = await client.chat.completions.create(
            model=llm_config.primary_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=llm_config.max_output_tokens or 10,
            temperature=llm_config.temperature
        )
        content = response.choices[0].message.content.strip().upper()
        if "YES" in content:
            return {"router_decision": "true_branch"}
        return {"router_decision": "false_branch"}
        
    elif condition_type == "contains_keyword":
        keyword = config.get("keyword", "")
        if keyword.lower() in state["input"].lower():
            return {"router_decision": "true_branch"}
        return {"router_decision": "false_branch"}
        
    return {"router_decision": "false_branch"}
