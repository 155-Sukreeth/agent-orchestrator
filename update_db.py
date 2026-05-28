import asyncio
import json
from sqlalchemy import text
from backend.database import AsyncSessionLocal

async def update_db():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT id, graph_definition FROM workflows"))
        workflows = result.fetchall()
        
        for w_id, graph_json in workflows:
            if not graph_json:
                continue
            
            graph = graph_json if isinstance(graph_json, dict) else json.loads(graph_json)
            nodes = graph.get("nodes", [])
            modified = False
            
            for node in nodes:
                config = node.get("config", {})
                
                # Check if it has legacy flat config
                if "provider_model" in config:
                    if "llm_params" not in config:
                        config["llm_params"] = {}
                        
                    # Map google/ back to gemini/ since we are restoring gemini strings
                    p_model = config["provider_model"]
                    p_model = p_model.replace("google/", "gemini/")
                    
                    config["llm_params"]["primary_model"] = p_model
                    if "temperature" in config:
                        config["llm_params"]["temperature"] = config["temperature"]
                        del config["temperature"]
                        
                    del config["provider_model"]
                    modified = True
                    
            if modified:
                new_json = json.dumps(graph)
                await session.execute(
                    text("UPDATE workflows SET graph_definition = :g WHERE id = :id"),
                    {"g": new_json, "id": w_id}
                )
                
        await session.commit()
        print("Database migration for llm_params completed successfully.")

if __name__ == "__main__":
    asyncio.run(update_db())
