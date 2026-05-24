from langgraph.graph import StateGraph, END
from agents.compiler.state import AgentState
from agents.compiler.nodes.agent_node import build_agent_node
from agents.compiler.nodes.router_node import router_node

def compile_graph(graph_definition: dict):
    workflow = StateGraph(AgentState)
    
    nodes = graph_definition.get("nodes", [])
    edges = graph_definition.get("edges", [])
    entry_node = graph_definition.get("entry_node")
    
    def make_node(node_def):
        if node_def["type"] == "agent":
            agent_func = build_agent_node(node_def.get("config", {}))
            async def node_func(state: AgentState):
                return await agent_func(state)
            return node_func
        elif node_def["type"] == "router":
            async def router_func(state: AgentState):
                return await router_node(state, node_def.get("config", {}))
            return router_func
            
        async def fallback_func(state: AgentState):
            return {}
        return fallback_func

    for node in nodes:
        workflow.add_node(node["id"], make_node(node))
        
    for edge in edges:
        source = edge["source"]
        target = edge["target"]
        if "condition" in edge:
            # It's a conditional edge
            cond_val = edge["condition"]
            def route(state: AgentState):
                return state.get("router_decision")
            
            # Map the condition directly to target, and any other to END for now
            # LangGraph syntax: add_conditional_edges(source, router, path_map)
            workflow.add_conditional_edges(source, route, {cond_val: target, "unmatched": END})
        else:
            workflow.add_edge(source, target)
            
    if entry_node:
        workflow.set_entry_point(entry_node)
        
    return workflow.compile()
