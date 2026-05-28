from agents.graph.state import AgentState

def build_user_message_node(config: dict):
    async def user_message_node(state: AgentState):
        input_text = state.get("input", "")
        input_key = config.get("input_key", "message")
        
        # We store the mapped input in metadata so other nodes can use it if needed
        metadata = state.get("metadata", {})
        metadata[input_key] = input_text
        
        # We also push it to the messages list as a 'user' message
        return {
            "metadata": metadata,
            "messages": [{"role": "user", "content": input_text}]
        }
    return user_message_node
