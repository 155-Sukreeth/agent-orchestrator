from langgraph.graph import StateGraph, END
from agents.graph.state import AgentState
from agents.graph.nodes.agent_node import AgentNode
from agents.graph.nodes.router_node import router_node
from agents.graph.nodes.user_message_node import build_user_message_node
from agents.graph.nodes.llm_node import build_llm_node
from agents.graph.nodes.knowledge_node import build_knowledge_node
from agents.graph.nodes.human_pause_node import build_human_pause_node

def compile_graph(graph_definition: dict):
    workflow = StateGraph(AgentState)
    
    nodes = graph_definition.get("nodes", [])
    edges = graph_definition.get("edges", [])
    
    # Identify start and end nodes
    start_node_id = None
    end_node_id = None
    
    for node in nodes:
        if node.get("type") == "start":
            start_node_id = node.get("id")
        elif node.get("type") == "end":
            end_node_id = node.get("id")
            
    # Filter them out
    langgraph_nodes = [n for n in nodes if n.get("type") not in ["start", "end"]]
    
    def make_node(node_def):
        if node_def["type"] in ["agent", "reactAgentNode", "agentNode"]:
            return AgentNode(node_id=node_def["id"], config=node_def.get("data", {}))
        elif node_def["type"] in ["router", "routerNode"]:
            async def router_func(state: AgentState):
                return await router_node(state, node_def.get("data", {}))
            return router_func
        elif node_def["type"] == "userMessageNode":
            user_msg_func = build_user_message_node(node_def.get("data", {}))
            async def user_node_func(state: AgentState):
                return await user_msg_func(state)
            return user_node_func
        elif node_def["type"] == "llmNode":
            llm_func = build_llm_node(node_def.get("data", {}))
            async def llm_node_func(state: AgentState):
                return await llm_func(state)
            return llm_node_func
        elif node_def["type"] == "knowledgeNode":
            know_func = build_knowledge_node(node_def.get("data", {}))
            async def know_node_func(state: AgentState):
                return await know_func(state)
            return know_node_func
        elif node_def["type"] == "humanPauseNode":
            pause_func = build_human_pause_node(node_def.get("data", {}))
            async def pause_node_func(state: AgentState):
                return await pause_func(state)
            return pause_node_func
        elif node_def["type"] in ["tool", "toolNode"]:
            from agents.graph.nodes.tool_node import tool_node as tool_node_func
            async def wrapped_tool_node(state: AgentState):
                return await tool_node_func(state, node_def.get("data", {}))
            return wrapped_tool_node
        elif node_def["type"] in ["stateTransform", "stateTransformNode"]:
            from agents.graph.nodes.state_transform_node import build_state_transform_node
            state_transform_func = build_state_transform_node(node_def.get("data", {}))
            async def state_transform_node_wrapper(state: AgentState):
                return await state_transform_func(state)
            return state_transform_node_wrapper
        elif node_def["type"] in ["structuredOutput", "structuredOutputNode"]:
            from agents.graph.nodes.structured_output_node import build_structured_output_node
            structured_output_func = build_structured_output_node(node_def.get("data", {}))
            async def structured_output_node_wrapper(state: AgentState):
                return await structured_output_func(state)
            return structured_output_node_wrapper
            
        async def fallback_func(state: AgentState):
            return {}
        return fallback_func

    for node in langgraph_nodes:
        workflow.add_node(node["id"], make_node(node))
        
    conditional_edges = {}
    normal_edges = []
    entry_node = None
    
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        
        # Determine actual target (map frontend 'end' to LangGraph 'END')
        actual_target = END if target == end_node_id else target
        
        if source == start_node_id:
            entry_node = actual_target
            continue
            
        if "condition" in edge and edge["condition"]:
            if source not in conditional_edges:
                conditional_edges[source] = {}
            conditional_edges[source][edge["condition"]] = actual_target
        else:
            normal_edges.append((source, actual_target))
            
    for source, target in normal_edges:
        workflow.add_edge(source, target)
        
    def route(state: AgentState):
        return state.get("router_decision")
        
    for source, path_map in conditional_edges.items():
        workflow.add_conditional_edges(source, route, path_map)
            
    if entry_node:
        workflow.set_entry_point(entry_node)
    elif graph_definition.get("entry_node"):
        workflow.set_entry_point(graph_definition.get("entry_node"))
        
    return workflow.compile()
