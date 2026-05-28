from agents.graph.state import AgentState

def build_human_pause_node(config: dict):
    async def human_pause_node(state: AgentState):
        approval_prompt = config.get("approval_prompt", "Waiting for human approval...")
        
        # In a real LangGraph setup with checkpointers, this would raise a NodeInterrupt.
        # For now, we simulate the pause by injecting a message and setting a status flag in metadata.
        
        metadata = state.get("metadata", {})
        metadata["status"] = "paused_for_human"
        
        return {
            "metadata": metadata,
            "messages": [{"role": "assistant", "content": f"[HUMAN IN THE LOOP]: {approval_prompt}"}],
            "output": f"Workflow paused. {approval_prompt}"
        }
        
    return human_pause_node
