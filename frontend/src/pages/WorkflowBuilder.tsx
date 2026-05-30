import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  ReactFlowProvider,
  Node
} from 'reactflow';
import { useParams, useNavigate, Link } from 'react-router-dom';
import 'reactflow/dist/style.css';
import AgentNode from '../components/nodes/AgentNode';
import RouterNode from '../components/nodes/RouterNode';
import ToolNode from '../components/nodes/ToolNode';
import UserMessageNode from '../components/nodes/UserMessageNode';
import LLMNode from '../components/nodes/LLMNode';
import ReActAgentNode from '../components/nodes/ReActAgentNode';
import KnowledgeNode from '../components/nodes/KnowledgeNode';
import HumanPauseNode from '../components/nodes/HumanPauseNode';
import NodeConfigSidebar from '../components/NodeConfigSidebar';
import { Network, Save, Plus, Maximize, Minimize, Settings2, PlaySquare, Workflow as WorkflowIcon, ChevronRight } from 'lucide-react';
import { createWorkflow, fetchWorkflow, updateWorkflow, fetchWorkflows } from '../api';

const initialNodes: Node[] = [];
let idCounter = 0;
const getId = (type: string) => `${type}-${idCounter++}`;

const WorkflowBuilderContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Workspace State
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'executions'>('editor');
  const [isImmersive, setIsImmersive] = useState(false);
  const [isActiveStatus, setIsActiveStatus] = useState(false);
  const [workflowName, setWorkflowName] = useState("New Workflow Draft");
  
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkflowsList();
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      loadWorkflow(id);
    } else {
      setNodes(initialNodes);
      setEdges([]);
      setWorkflowName("New Workflow Draft");
      setIsActiveStatus(false);
    }
  }, [id]);

  // Auto-save drafts every 15 seconds if there are nodes and it's not active
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isActiveStatus && nodes.length > 0 && id && id !== 'new') {
        handleDeploy(false, true); // true = silent save
      }
    }, 15000);
    
    return () => clearInterval(autoSaveInterval);
  }, [nodes, edges, workflowName, isActiveStatus, id]);

  const loadWorkflowsList = async () => {
    try {
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (e) {
      console.error("Failed to load workflows list", e);
    }
  };

  const loadWorkflow = async (workflowId: string) => {
    try {
      const data = await fetchWorkflow(workflowId);
      if (data) {
        setWorkflowName(data.name);
        setIsActiveStatus(data.is_active);
        
        if (data.graph_definition) {
          // Map backend schema to React Flow schema
          const loadedNodes = data.graph_definition.nodes.map((n: any, index: number) => {
            let uiType = n.type;
            if (n.type === 'agent') uiType = 'agentNode'; // Fallback
            if (n.type === 'router') uiType = 'routerNode';
            if (n.type === 'tool') uiType = 'toolNode';
            
            return {
              id: n.id,
              type: uiType,
              position: n.position || { x: 250 + (index * 200), y: 150 + (index % 2 === 0 ? 0 : 100) },
              data: { ...n.config }
            };
          });

          const loadedEdges = data.graph_definition.edges.map((e: any, index: number) => ({
            id: `e${index}-${e.source}-${e.target}`,
            source: e.source,
            target: e.target,
            label: e.condition || '',
            animated: true,
            style: { stroke: '#8b5cf6' }
          }));

          setNodes(loadedNodes);
          setEdges(loadedEdges);
        }
      }
    } catch (e) {
      console.error("Failed to load workflow:", e);
    }
  };

  const nodeTypes = useMemo(() => ({ 
    agentNode: AgentNode, // Legacy fallback
    routerNode: RouterNode,
    toolNode: ToolNode,
    userMessageNode: UserMessageNode,
    llmNode: LLMNode,
    reactAgentNode: ReActAgentNode,
    knowledgeNode: KnowledgeNode,
    humanPauseNode: HumanPauseNode
  }), []);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#8b5cf6' } }, eds)),
    []
  );

  const handleAddNode = (type: string, label: string) => {
    if (!reactFlowInstance || !reactFlowWrapper.current) return;
    
    // Add to center of current view
    const center = reactFlowInstance.project({
      x: reactFlowWrapper.current.clientWidth / 2,
      y: reactFlowWrapper.current.clientHeight / 2,
    });
    
    const newNode: Node = {
      id: getId(type),
      type,
      position: center,
      data: { label },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleUpdateNode = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          n.data = { ...newData };
        }
        return n;
      })
    );
  };

  const handleDeploy = async (saveAsActive: boolean, silent: boolean = false) => {
    try {
      const graphDefinition = {
        nodes: nodes.map(n => {
          let backendType = n.type;
          if (n.type === 'agentNode') backendType = 'agent';
          if (n.type === 'routerNode') backendType = 'router';
          if (n.type === 'toolNode') backendType = 'tool';
          
          return {
            id: n.id,
            type: backendType,
            position: n.position,
            config: { ...n.data }
          };
        }),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          condition: e.label || undefined
        })),
        entry_node: 'start'
      };

      if (id && id !== 'new') {
        await updateWorkflow(id, {
          name: workflowName,
          is_active: saveAsActive,
          graph_definition: graphDefinition
        });
        setIsActiveStatus(saveAsActive);
        if (!silent) {
          loadWorkflowsList();
          alert("Workflow saved successfully!");
        }
      } else {
        const result = await createWorkflow({
          name: workflowName,
          description: "Created from visual builder",
          graph_definition: graphDefinition,
          channels: ["telegram"],
          is_active: saveAsActive,
          is_template: false
        });
        setIsActiveStatus(saveAsActive);
        loadWorkflowsList();
        if (!silent) navigate(`/workflows/${result.id}`);
      }
    } catch (e: any) {
      if (!silent) alert("Failed to save: " + e.message);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const deployedWorkflows = workflows.filter(w => w.is_active);
  const draftedWorkflows = workflows.filter(w => !w.is_active);

  return (
    <div className="h-full w-full flex bg-gray-950 text-gray-200 overflow-hidden">
      {/* Left Pane: Workspace Navigator */}
      <div 
        className={`w-64 border-r border-white/5 bg-gray-950/50 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-20 ${
          isImmersive ? '-ml-64' : 'ml-0'
        }`}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-semibold text-gray-200 flex items-center">
            <WorkflowIcon className="w-4 h-4 mr-2 text-indigo-400" />
            Workspace
          </h2>
          <button 
            onClick={() => navigate('/workflows/new')}
            className="p-1 hover:bg-white/10 rounded" title="New Draft"
          >
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Drafts</h3>
            {draftedWorkflows.length === 0 ? (
              <p className="text-xs text-gray-600 px-2">No drafts</p>
            ) : (
              <div className="space-y-1">
                {draftedWorkflows.map(w => (
                  <Link 
                    key={w.id} 
                    to={`/workflows/${w.id}`}
                    className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${id === w.id.toString() ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    {w.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Deployed</h3>
            {deployedWorkflows.length === 0 ? (
              <p className="text-xs text-gray-600 px-2">No deployed workflows</p>
            ) : (
              <div className="space-y-1">
                {deployedWorkflows.map(w => (
                  <Link 
                    key={w.id} 
                    to={`/workflows/${w.id}`}
                    className={`block px-2 py-1.5 text-sm rounded-md transition-colors ${id === w.id.toString() ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    {w.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-gray-950">
        
        {/* Top Header */}
        <div 
          className={`absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gray-950/80 backdrop-blur-sm border-b border-white/5 transition-transform duration-300 ${
            isImmersive ? '-translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="flex items-center space-x-6">
            <input 
              type="text" 
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-xl font-bold text-white placeholder-gray-600 p-0"
              placeholder="Workflow Name"
            />
            
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
              <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'editor' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center"><Settings2 className="w-4 h-4 mr-2" /> Editor</div>
              </button>
              <button 
                onClick={() => setActiveTab('executions')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'executions' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center"><PlaySquare className="w-4 h-4 mr-2" /> Executions</div>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Active/Inactive Toggle */}
            <div className="flex items-center space-x-2 mr-2">
              <span className={`text-sm font-medium ${!isActiveStatus ? 'text-gray-300' : 'text-gray-600'}`}>Draft</span>
              <button 
                onClick={() => handleDeploy(!isActiveStatus)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActiveStatus ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActiveStatus ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-sm font-medium ${isActiveStatus ? 'text-emerald-400' : 'text-gray-600'}`}>Active</span>
            </div>
            
            <button 
              onClick={() => handleDeploy(isActiveStatus)}
              className="bg-primary hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
            <button 
              onClick={() => setIsImmersive(true)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
              title="Enter Immersive Mode"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Immersive Mode Exit Button */}
        {isImmersive && (
          <button 
            onClick={() => setIsImmersive(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-gray-800 hover:bg-gray-700 border border-white/10 rounded-lg text-gray-300 shadow-xl transition-colors"
            title="Exit Immersive Mode"
          >
            <Minimize className="w-4 h-4" />
          </button>
        )}

        {/* Tab Content */}
        {activeTab === 'editor' ? (
          <div className="flex-1 flex relative w-full h-full pt-16" ref={reactFlowWrapper}>
            <ReactFlow 
              nodes={nodes} 
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-transparent"
            >
              <Background color="#374151" gap={16} size={1.5} />
              <Controls className="react-flow__controls border-gray-800 shadow-2xl" />
            </ReactFlow>

            {/* Categorized Node Palette (Floating Left) */}
            <div className={`absolute top-24 left-4 flex flex-col space-y-4 w-48 transition-opacity duration-300 ${isImmersive ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
              
              <div className="glass-card rounded-xl border border-white/10 overflow-hidden shadow-xl">
                <div className="bg-white/5 px-3 py-2 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Legacy / Core
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => handleAddNode('userMessageNode', 'Input')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" /> Input
                  </button>
                  <button onClick={() => handleAddNode('llmNode', 'LLM')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> LLM
                  </button>
                  <button onClick={() => handleAddNode('reactAgentNode', 'ReAct Agent')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> ReAct Agent
                  </button>
                  <button onClick={() => handleAddNode('routerNode', 'Router')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> Router
                  </button>
                  <button onClick={() => handleAddNode('knowledgeNode', 'Knowledge')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2" /> Knowledge
                  </button>
                  <button onClick={() => handleAddNode('toolNode', 'Tool')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2" /> Tool
                  </button>
                  <button onClick={() => handleAddNode('humanPauseNode', 'Human Pause')} className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-md transition-colors flex items-center">
                    <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" /> Human Pause
                  </button>
                </div>
              </div>
              
              {/* Note: New categories will be added here in Phase 2 */}
            </div>

            {selectedNode && (
              <NodeConfigSidebar 
                node={selectedNode} 
                onClose={() => setSelectedNodeId(null)}
                onUpdate={handleUpdateNode}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center pt-16">
            <div className="text-center">
              <PlaySquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Execution History</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md">
                This tab will display past runs and their outputs for this workflow. 
                (UI placeholder for now)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const WorkflowBuilder: React.FC = () => (
  <ReactFlowProvider>
    <WorkflowBuilderContent />
  </ReactFlowProvider>
);

export default WorkflowBuilder;
