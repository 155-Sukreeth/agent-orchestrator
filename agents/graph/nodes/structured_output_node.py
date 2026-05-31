import json
import logging
from agents.graph.state import AgentState
from agents.clients.bifrost_client import bifrost_client
from agents.config.llm_params import llm_params_registry

logger = logging.getLogger(__name__)

def build_structured_output_node(config: dict):
    async def structured_output_node(state: AgentState) -> dict:
        llm_config = llm_params_registry.AGENT_DEFAULT.model_copy(update=config.get("llm_params", {}))
        schema_str = config.get("schema", "{}")
        system_prompt = config.get("system_prompt", "You are a helpful assistant.")
        
        # Append schema requirements to system prompt
        system_prompt += f"\n\nYou MUST output valid JSON matching the following schema:\n{schema_str}"
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history
        for msg in state.get("messages", []):
            if hasattr(msg, "type"):
                role = "assistant" if msg.type == "ai" else ("user" if msg.type == "human" else msg.type)
                messages.append({"role": role, "content": getattr(msg, "content", "")})
            elif isinstance(msg, dict):
                messages.append(msg)
                
        try:
            provider, model = llm_config.primary_model.split("/", 1)
        except ValueError:
            provider, model = llm_params_registry.AGENT_DEFAULT.primary_model.split("/", 1)
            
        resolved_model = bifrost_client.resolve_model(provider, model)
        client = bifrost_client.client
        
        payload = {
            "model": resolved_model,
            "messages": messages,
            "max_tokens": llm_config.get_max_tokens(),
            "temperature": llm_config.temperature,
            "response_format": {"type": "json_object"}
        }
        
        extra_body = {}
        if llm_config.secondary_models:
            extra_body["fallbacks"] = llm_config.secondary_models
        if extra_body:
            payload["extra_body"] = extra_body
            
        response = await client.chat.completions.create(**payload, timeout=llm_config.timeout)
        content = response.choices[0].message.content or "{}"
        
        actual_provider = "unknown"
        if hasattr(response, "model_extra") and response.model_extra:
            actual_provider = response.model_extra.get("provider", "unknown")
            
        try:
            parsed_json = json.loads(content)
        except json.JSONDecodeError:
            logger.error("Structured output failed to parse JSON")
            parsed_json = {}
            
        # Merge structured output into metadata
        metadata = state.get("metadata", {})
        metadata["structured_output"] = parsed_json
        metadata["provider_used"] = actual_provider
        
        msg_dict = {"role": "assistant", "content": content}
        
        return {
            "messages": [msg_dict],
            "metadata": metadata,
            "output": content
        }
    
    return structured_output_node
