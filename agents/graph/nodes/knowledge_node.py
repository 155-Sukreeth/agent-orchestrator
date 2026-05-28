from agents.graph.state import AgentState

def build_knowledge_node(config: dict):
    async def knowledge_node(state: AgentState):
        kb_id = config.get("knowledge_base_id", "default_kb")
        top_k = config.get("top_k", 3)
        
        # MOCK RETRIEVAL LOGIC
        # In the future, this will connect to the semantic router / vector DB
        retrieved_context = f"Retrieved {top_k} documents from {kb_id}:\n1. Refund policy: All refunds are processed within 3 days.\n2. General: We value our customers."
        
        metadata = state.get("metadata", {})
        metadata["retrieved_context"] = retrieved_context
        
        # Optionally, inject this into the messages for the next LLM node
        system_msg = {"role": "system", "content": f"Use the following knowledge context:\n{retrieved_context}"}
        
        return {
            "metadata": metadata,
            "messages": [system_msg]
        }
        
    return knowledge_node
