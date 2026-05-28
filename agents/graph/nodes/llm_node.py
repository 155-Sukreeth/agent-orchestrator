from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.config.llm_params import llm_params_registry

def build_llm_node(config: dict):
    llm_config = llm_params_registry.LLM_NODE_DEFAULT.model_copy(update=config.get("llm_params", {}))
    
    async def llm_node(state: AgentState):
        system_prompt = config.get("system_prompt", "")
        
        try:
            provider, model = llm_config.primary_model.split("/")
        except ValueError:
            provider, model = llm_params_registry.LLM_NODE_DEFAULT.primary_model.split("/")
            
        resolved_model = bifrost_client.resolve_model(provider, model)
        client = bifrost_client.client
        
        # Prepare messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
            
        # Append existing state messages
        for msg in state.get("messages", []):
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        extra_body = {}
        if llm_config.secondary_models:
            extra_body["fallbacks"] = llm_config.secondary_models
            
        # Call Bifrost
        try:
            response = await client.chat.completions.create(
                model=resolved_model,
                messages=messages,
                max_tokens=llm_config.get_max_tokens(),
                temperature=llm_config.temperature,
                extra_body=extra_body,
                timeout=llm_config.timeout
            )
            output_content = response.choices[0].message.content
            
            return {
                "messages": [{"role": "assistant", "content": output_content}],
                "output": output_content
            }
        except Exception as e:
            return {
                "messages": [{"role": "assistant", "content": f"Error calling LLM: {str(e)}"}],
                "output": f"Error: {str(e)}"
            }
            
    return llm_node
