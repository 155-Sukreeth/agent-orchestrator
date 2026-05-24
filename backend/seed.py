import asyncio
from backend.database import AsyncSessionLocal
from backend.models import Agent, Workflow
from sqlalchemy.future import select

async def seed():
    async with AsyncSessionLocal() as session:
        # Seed Agents
        agents_data = [
            {
                "name": "Customer Support Agent",
                "role": "Support",
                "provider": "openai",
                "model": "gpt-4o",
                "system_prompt": "You are a helpful customer support agent.",
            },
            {
                "name": "Data Analyst",
                "role": "Analytics",
                "provider": "anthropic",
                "model": "claude-3-5-sonnet-20240620",
                "system_prompt": "You are a data analyst that helps interpret metrics.",
            }
        ]

        for agent_data in agents_data:
            result = await session.execute(select(Agent).where(Agent.name == agent_data["name"]))
            if not result.scalars().first():
                session.add(Agent(**agent_data))
                print(f"Added agent: {agent_data['name']}")

        # Seed Workflow
        graph_def = {
            "nodes": [
                {
                    "id": "support_agent",
                    "type": "agent",
                    "config": {
                        "provider": "openai",
                        "model": "gpt-4o",
                        "system_prompt": "You are a helpful support agent."
                    }
                }
            ],
            "edges": [],
            "entry_node": "support_agent"
        }

        workflow_data = {
            "name": "General Support Workflow",
            "description": "A workflow that handles basic customer support queries.",
            "description_embedding": [0.0] * 1536, # Dummy embedding vector for testing
            "graph_definition": graph_def,
            "is_active": True
        }

        result = await session.execute(select(Workflow).where(Workflow.name == workflow_data["name"]))
        if not result.scalars().first():
            session.add(Workflow(**workflow_data))
            print(f"Added workflow: {workflow_data['name']}")

        await session.commit()
        print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed())
