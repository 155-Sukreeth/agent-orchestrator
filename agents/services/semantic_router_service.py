import logging
from typing import List
from agents.clients.bifrost_client import bifrost_client
from agents.templates import render

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
            model_name = bifrost_client.resolve_model("openai", "gpt-4o")
            response = await bifrost_client.client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=20
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
