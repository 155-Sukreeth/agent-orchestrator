from openai import AsyncOpenAI
from agents.config import agent_settings
import logging

logger = logging.getLogger(__name__)

async def run_semantic_routing(query: str, workflows: list[dict]) -> str | None:
    if not workflows:
        return None
        
    if len(workflows) == 1:
        return workflows[0]["id"]
        
    workflow_descriptions = []
    for wf in workflows:
        desc = wf.get("description") or "No description provided."
        workflow_descriptions.append(f"ID: {wf['id']}\nName: {wf['name']}\nDescription: {desc}")
        
    workflows_text = "\n\n".join(workflow_descriptions)
    
    system_prompt = f"""You are an intelligent semantic routing agent for a multi-agent orchestration platform. 
You are given a user query and a list of available workflows.
Your job is to determine which workflow is the BEST match for handling the user's query based on the workflow descriptions.
If none of the workflows are a relevant match, respond with 'NONE'.
Otherwise, respond ONLY with the exact UUID of the matching workflow. Do not include any formatting, markdown, or other text.

Available Workflows:
{workflows_text}
"""
    
    try:
        client = AsyncOpenAI(
            base_url=agent_settings.AGENTS_BIFROST_URL,
            api_key=agent_settings.AGENTS_BIFROST_API_KEY or "dummy",
        )
        
        model_id = f"{agent_settings.AGENTS_DEFAULT_PROVIDER}/{agent_settings.AGENTS_DEFAULT_MODEL}"
        
        response = await client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            max_tokens=50,
            temperature=0.0
        )
        
        output = response.choices[0].message.content.strip()
        logger.info(f"Agents Semantic Router classified query -> {output}")
        
        if output == "NONE":
            return None
            
        return output
        
    except Exception as e:
        logger.error(f"Agents Semantic router LLM call failed: {e}")
        return None
