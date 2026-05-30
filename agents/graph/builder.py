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
    entry_node = graph_definition.get("entry_node")
    
    def make_node(node_def):
        if node_def["type"] in ["agent", "reactAgentNode", "agentNode"]:
            # Use our new BaseNode class for Agent
            return AgentNode(node_id=node_def["id"], config=node_def.get("config", {}))
        elif node_def["type"] in ["router", "routerNode"]:
            async def router_func(state: AgentState):
                return await router_node(state, node_def.get("config", {}))
            return router_func
        elif node_def["type"] == "userMessageNode":
            user_msg_func = build_user_message_node(node_def.get("config", {}))
            async def user_node_func(state: AgentState):
                return await user_msg_func(state)
            return user_node_func
        elif node_def["type"] == "llmNode":
            llm_func = build_llm_node(node_def.get("config", {}))
            async def llm_node_func(state: AgentState):
                return await llm_func(state)
            return llm_node_func
        elif node_def["type"] == "knowledgeNode":
            know_func = build_knowledge_node(node_def.get("config", {}))
            async def know_node_func(state: AgentState):
                return await know_func(state)
            return know_node_func
        elif node_def["type"] == "humanPauseNode":
            pause_func = build_human_pause_node(node_def.get("config", {}))
            async def pause_node_func(state: AgentState):
                return await pause_func(state)
            return pause_node_func
            
        async def fallback_func(state: AgentState):
            return {}
        return fallback_func

    for node in nodes:
        workflow.add_node(node["id"], make_node(node))
        
    conditional_edges = {}
    normal_edges = []
    
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if "condition" in edge and edge["condition"]:
            if source not in conditional_edges:
                conditional_edges[source] = {}
            conditional_edges[source][edge["condition"]] = target
        else:
            normal_edges.append((source, target))
            
    for source, target in normal_edges:
        workflow.add_edge(source, target)
        
    def route(state: AgentState):
        return state.get("router_decision")
        
    for source, path_map in conditional_edges.items():
        # LangGraph syntax: add_conditional_edges(source, router, path_map)
        workflow.add_conditional_edges(source, route, path_map)
            
    if entry_node:
        workflow.set_entry_point(entry_node)
        
    return workflow.compile()
