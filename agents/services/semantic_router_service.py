import logging
from typing import List
from agents.clients.bifrost_client import bifrost_client
from agents.templates import render
from agents.config.settings import agent_settings

from agents.config.llm_params import llm_params_registry

logger = logging.getLogger(__name__)

class SemanticRouterService:
    async def run_semantic_routing(self, query: str, workflows: List[dict]) -> str:
        if not workflows:
            return "NONE"

        # Check if any workflow keyword matches
        for wf in workflows:
            if wf.get("name", "").lower() in query.lower():
                return wf["id"]

        # Prepare context for LLM
        context = ""
        for wf in workflows:
            context += f"ID: {wf['id']}\nName: {wf['name']}\nDescription: {wf.get('description', '')}\n\n"

        prompt = render("semantic_router", section="full", context=context, query=query)

        try:
            llm_config = llm_params_registry.SEMANTIC_ROUTER
            try:
                provider, model = llm_config.primary_model.split("/", 1)
            except ValueError:
                provider, model = llm_params_registry.SEMANTIC_ROUTER.primary_model.split("/", 1)
            
            resolved_model = bifrost_client.resolve_model(provider, model)
            
            extra_body = {}
            if llm_config.secondary_models:
                extra_body["fallbacks"] = llm_config.secondary_models
                
            response = await bifrost_client.client.chat.completions.create(
                model=resolved_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=llm_config.get_max_tokens(),
                temperature=llm_config.temperature,
                extra_body=extra_body,
                timeout=llm_config.timeout
            )
            content = response.choices[0].message.content.strip()
            
            # Simple parsing: find the ID in the response
            for wf in workflows:
                if wf["id"] in content:
                    return wf["id"]
                    
            return "NONE"
            
        except Exception as e:
            logger.error(f"Semantic routing failed: {e}")
            return "NONE"

semantic_router_service = SemanticRouterService()
