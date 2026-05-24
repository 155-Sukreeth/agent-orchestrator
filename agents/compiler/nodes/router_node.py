from agents.compiler.state import AgentState
from agents.bifrost import call_llm
from agents.templates import render

async def router_node(state: AgentState, config: dict) -> dict:
    condition_type = config.get("condition_type")
    
    if condition_type == "llm_judge":
        prompt = render("llm_judge", section="full", condition=config.get("condition"), message=state["input"])
        messages = [{"role": "user", "content": prompt}]
        response = await call_llm(messages)
        content = response.get("content", "").strip().upper()
        if "YES" in content:
            return {"router_decision": "true_branch"}
        return {"router_decision": "false_branch"}
        
    elif condition_type == "contains_keyword":
        keyword = config.get("keyword", "")
        if keyword.lower() in state["input"].lower():
            return {"router_decision": "true_branch"}
        return {"router_decision": "false_branch"}
        
    return {"router_decision": "false_branch"}
