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
import { SemanticTriggerNode, WebhookTriggerNode, SchedulerTriggerNode, WorkflowEventTriggerNode } from '../components/nodes/trigger/TriggerNodes';
import { AgentNode, PromptBuilderNode, StructuredOutputNode, StateTransformNode } from '../components/nodes/transform/TransformNodes';
import { RouterNode, LoopNode, ParallelSplitNode, MergeNode, HumanPauseNode, StartNode, EndNode } from '../components/nodes/control/ControlNodes';
import { ToolNode, KnowledgeNode } from '../components/nodes/integrate/IntegrateNodes';
import NodeConfigSidebar from '../components/NodeConfigSidebar';
import TriggersPanel from '../components/workflow/TriggersPanel';
import { Save, Plus, Maximize, Minimize, Settings2, PlaySquare, Workflow as WorkflowIcon, X, Search, Zap, Cpu, GitBranch, Blocks, MessageSquare, Globe, Clock, FileText, Code, Settings, RefreshCw, GitCommit, GitMerge, PauseCircle, Wrench, Database, Pin, PinOff, User, Flag } from 'lucide-react';
import { createWorkflow, fetchWorkflow, updateWorkflow, fetchWorkflows } from '../api';

const initialNodes: Node[] = [];
let idCounter = 0;
const getId = (type: string) => `${type}-${idCounter++}`;

const nodeTypes = { 
  semanticTriggerNode: SemanticTriggerNode,
  webhookTriggerNode: WebhookTriggerNode,
  schedulerTriggerNode: SchedulerTriggerNode,
  workflowEventTriggerNode: WorkflowEventTriggerNode,
  agentNode: AgentNode,
  promptBuilderNode: PromptBuilderNode,
  structuredOutputNode: StructuredOutputNode,
  stateTransformNode: StateTransformNode,
  routerNode: RouterNode,
  start: StartNode,
  end: EndNode,
  loopNode: LoopNode,
  parallelSplitNode: ParallelSplitNode,
  mergeNode: MergeNode,
  humanPauseNode: HumanPauseNode,
  toolNode: ToolNode,
  knowledgeNode: KnowledgeNode
};

const WorkflowBuilderContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'json' | 'executions'>('editor');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [triggers, setTriggers] = useState<any[]>([]);
  const [isTriggersPanelOpen, setIsTriggersPanelOpen] = useState(false);
  
  // Workspace State
  const [workflows, setWorkflows] = useState<any[]>([]);

  const [isImmersive, setIsImmersive] = useState(false);
  const [isActiveStatus, setIsActiveStatus] = useState(false);
  const [workflowName, setWorkflowName] = useState("New Workflow Draft");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState("");
  const [isNodePalettePinned, setIsNodePalettePinned] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(256);
  const isResizingLeft = useRef(false);
  
  const [workspacePanelWidth, setWorkspacePanelWidth] = useState(256);
  const isResizingWorkspace = useRef(false);

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

  // Toggle immersive mode class on body for global Layout styles
  useEffect(() => {
    if (isImmersive) {
      document.body.classList.add('immersive-mode');
    } else {
      document.body.classList.remove('immersive-mode');
    }
    return () => document.body.classList.remove('immersive-mode');
  }, [isImmersive]);

  // Auto-save drafts every 15 seconds if there are nodes and it's not active
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (!isActiveStatus && nodes.length > 0 && id && id !== 'new') {
        handleDeploy(false, true); // true = silent save
      }
    }, 15000);
    
    return () => clearInterval(autoSaveInterval);
  }, [nodes, edges, workflowName, isActiveStatus, id]);

  // Handle Left Panel Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeft.current) return;
      setLeftPanelWidth(prev => {
        const newWidth = prev + e.movementX;
        return Math.min(Math.max(newWidth, 200), 600);
      });
    };
    const handleMouseUp = () => {
      if (isResizingLeft.current) {
        isResizingLeft.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle Workspace Panel Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingWorkspace.current) return;
      setWorkspacePanelWidth(prev => {
        const newWidth = prev + e.movementX;
        return Math.min(Math.max(newWidth, 200), 600);
      });
    };
    const handleMouseUp = () => {
      if (isResizingWorkspace.current) {
        isResizingWorkspace.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Command Palette Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        setTriggers(data.triggers || []);
        
        if (data.graph_definition) {
          // Map backend schema to React Flow schema
          const loadedNodes = data.graph_definition.nodes.map((n: any, index: number) => {
            let uiType = n.type;
            if (n.type === 'agent') uiType = 'agentNode'; // Fallback
            if (n.type === 'router') uiType = 'routerNode';
            if (n.type === 'tool') uiType = 'toolNode';
            
            if (n.type && n.type.includes('_')) {
                uiType = n.type.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase()) + 'Node';
            } else if (n.type && !n.type.endsWith('Node')) {
                uiType = n.type + 'Node';
            }
            
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
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const center = reactFlowInstance.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    
    const newNode: Node = {
      id: getId(type),
      type,
      position: center,
      data: { label },
      selected: true,
    };

    setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNode));
    setSelectedNodeId(newNode.id);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (deleted.some((n) => n.id === selectedNodeId)) {
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId]
  );

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleUpdateNode = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...newData } };
        }
        return n;
      })
    );
  };

  const handleDeploy = async (saveAsActive: boolean, silent: boolean = false) => {
    try {
      const convertTypeToSnakeCase = (type: string) => {
        const stripped = type.endsWith('Node') ? type.slice(0, -4) : type;
        return stripped.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      };

      const triggerNode = nodes.find(n => n.type.toLowerCase().includes('trigger') || n.type === 'startNode');
      const entry_node = triggerNode ? triggerNode.id : (nodes.length > 0 ? nodes[0].id : '');

      const graphDefinition = {
        nodes: nodes.map(n => {
          let backendType = convertTypeToSnakeCase(n.type);
          if (n.type === 'agentNode') backendType = 'agent'; // legacy fallback mapping
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
        entry_node
      };

      if (id && id !== 'new') {
        await updateWorkflow(id, {
          name: workflowName,
          is_active: saveAsActive,
          graph_definition: graphDefinition,
          triggers
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
          is_template: false,
          triggers
        });
        setIsActiveStatus(saveAsActive);
        loadWorkflowsList();
        if (!silent) navigate(`/workflows/${result.id}`);
      }
    } catch (e: any) {
      if (!silent) alert("Failed to save: " + e.message);
    }
  };

  const [activeSidebarNode, setActiveSidebarNode] = useState<any>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (selectedNode) {
      setActiveSidebarNode(selectedNode);
      setIsSidebarVisible(true);
    } else {
      setIsSidebarVisible(false);
      const timer = setTimeout(() => setActiveSidebarNode(null), 500); // Wait for transition
      return () => clearTimeout(timer);
    }
  }, [selectedNodeId, nodes]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const deployedWorkflows = workflows.filter(w => w.is_active);
  const draftedWorkflows = workflows.filter(w => !w.is_active);

  return (
    <div className="h-full w-full flex bg-gray-950 text-gray-200 overflow-hidden">
      {/* Left Pane: Workspace Navigator */}
      <div 
        style={{ 
          width: isImmersive ? undefined : workspacePanelWidth, 
          marginLeft: isImmersive ? -workspacePanelWidth : 0 
        }}
        className={`relative border-r border-white/5 bg-gray-950/50 flex flex-col shrink-0 transition-all duration-500 ease-in-out z-20`}
      >
        {/* Resize Handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); isResizingWorkspace.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        />

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
          className={`absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gray-950/80 backdrop-blur-sm border-b border-white/5 transition-transform duration-500 ${
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
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'editor' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center"><Settings2 className="w-4 h-4 mr-2" /> Visual Editor</div>
              </button>
              <button 
                onClick={() => {
                  if (activeTab !== 'json' && reactFlowInstance) {
                    setJsonInput(JSON.stringify(reactFlowInstance.toObject(), null, 2));
                  }
                  setActiveTab('json');
                }}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'json' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center"><Code className="w-4 h-4 mr-2" /> JSON Editor</div>
              </button>
              <button 
                onClick={() => setActiveTab('executions')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'executions' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
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
        {activeTab === 'editor' && (
          <div className="flex-1 flex relative w-full h-full pt-16" ref={reactFlowWrapper}>
            
            {/* Pinned Node Palette Sidebar */}
            {isNodePalettePinned && (
              <div style={{ width: leftPanelWidth }} className="relative border-r border-gray-800 bg-[#0a0a0a] flex flex-col z-20 shrink-0 h-full shadow-2xl transition-all duration-500 ease-in-out">
                {/* Resize Handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
                />
                
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/40 backdrop-blur-md">
                  <h3 className="font-semibold text-white text-sm">Node Library</h3>
                  <button 
                    onClick={() => setIsNodePalettePinned(false)} 
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                    title="Unpin"
                  >
                    <PinOff className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-gray-800 bg-black/20">
                  <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-2.5 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Search nodes..."
                      value={paletteSearchQuery}
                      onChange={(e) => setPaletteSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-white text-xs w-full py-2 pl-2 placeholder-gray-600"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                  {/* Flow Control */}
                  <div className={paletteSearchQuery && !['start', 'end'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                    <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center">
                      <Zap className="w-3 h-3 mr-1.5" />
                      Flow
                    </h4>
                    <div className="space-y-1">
                      <button onClick={() => handleAddNode('start', 'Start')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 group">
                        <PlaySquare className="w-3.5 h-3.5 mr-2 text-rose-500/50 group-hover:text-rose-400 transition-colors" /> Start
                      </button>
                      <button onClick={() => handleAddNode('end', 'End')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 group">
                        <Flag className="w-3.5 h-3.5 mr-2 text-rose-500/50 group-hover:text-rose-400 transition-colors" /> End
                      </button>
                    </div>
                  </div>

                  {/* Transform */}
                  <div className={paletteSearchQuery && !['agent', 'prompt', 'structured', 'state'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center">
                      <Cpu className="w-3 h-3 mr-1.5" />
                      Transform
                    </h4>
                    <div className="space-y-1">
                      <button onClick={() => handleAddNode('agentNode', 'Agent')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20 group">
                        <Cpu className="w-3.5 h-3.5 mr-2 text-blue-500/50 group-hover:text-blue-400 transition-colors" /> Agent
                      </button>
                      <button onClick={() => handleAddNode('promptBuilderNode', 'Prompt Builder')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20 group">
                        <FileText className="w-3.5 h-3.5 mr-2 text-blue-500/50 group-hover:text-blue-400 transition-colors" /> Prompt Builder
                      </button>
                      <button onClick={() => handleAddNode('structuredOutputNode', 'Structured Output')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20 group">
                        <Code className="w-3.5 h-3.5 mr-2 text-blue-500/50 group-hover:text-blue-400 transition-colors" /> Structured Output
                      </button>
                      <button onClick={() => handleAddNode('stateTransformNode', 'State Transform')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20 group">
                        <Settings className="w-3.5 h-3.5 mr-2 text-blue-500/50 group-hover:text-blue-400 transition-colors" /> State Transform
                      </button>
                    </div>
                  </div>

                  {/* Control */}
                  <div className={paletteSearchQuery && !['router', 'loop', 'split', 'merge', 'pause'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                    <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center">
                      <GitBranch className="w-3 h-3 mr-1.5" />
                      Control
                    </h4>
                    <div className="space-y-1">
                      <button onClick={() => handleAddNode('routerNode', 'Router')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 group">
                        <GitBranch className="w-3.5 h-3.5 mr-2 text-amber-500/50 group-hover:text-amber-400 transition-colors" /> Router
                      </button>
                      <button onClick={() => handleAddNode('loopNode', 'Loop')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 group">
                        <RefreshCw className="w-3.5 h-3.5 mr-2 text-amber-500/50 group-hover:text-amber-400 transition-colors" /> Loop
                      </button>
                      <button onClick={() => handleAddNode('parallelSplitNode', 'Parallel Split')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 group">
                        <GitCommit className="w-3.5 h-3.5 mr-2 text-amber-500/50 group-hover:text-amber-400 transition-colors" /> Parallel Split
                      </button>
                      <button onClick={() => handleAddNode('mergeNode', 'Merge')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 group">
                        <GitMerge className="w-3.5 h-3.5 mr-2 text-amber-500/50 group-hover:text-amber-400 transition-colors" /> Merge
                      </button>
                      <button onClick={() => handleAddNode('humanPauseNode', 'Human Pause')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20 group">
                        <PauseCircle className="w-3.5 h-3.5 mr-2 text-amber-500/50 group-hover:text-amber-400 transition-colors" /> Human Pause
                      </button>
                    </div>
                  </div>

                  {/* Integrate */}
                  <div className={paletteSearchQuery && !['tool', 'knowledge'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center">
                      <Blocks className="w-3 h-3 mr-1.5" />
                      Integrate
                    </h4>
                    <div className="space-y-1">
                      <button onClick={() => handleAddNode('toolNode', 'Tool Execution')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20 group">
                        <Wrench className="w-3.5 h-3.5 mr-2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" /> Tool Execution
                      </button>
                      <button onClick={() => handleAddNode('knowledgeNode', 'Knowledge Retrieval')} className="w-full flex items-center px-2 py-2 text-xs text-gray-300 hover:text-white hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20 group">
                        <Database className="w-3.5 h-3.5 mr-2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" /> Knowledge Retrieval
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex-1 flex relative w-full h-full">
              <ReactFlow 
              nodes={nodes} 
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onNodesDelete={onNodesDelete}
              nodeTypes={nodeTypes}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              fitViewOptions={{ maxZoom: 1, padding: 0.5 }}
              className="bg-transparent"
            >
              <Background color="#374151" gap={16} size={1.5} />
              <Controls className="react-flow__controls border-gray-800 shadow-2xl" />
            </ReactFlow>

            </div>

            {/* Floating Add Node Button */}
            {!isNodePalettePinned && (
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className={`absolute top-20 left-6 z-10 bg-gray-900/90 backdrop-blur-md hover:bg-gray-800 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl transition-all flex items-center group ${isImmersive ? 'opacity-30 hover:opacity-100' : 'opacity-100'}`}
              >
                <Plus className="w-4 h-4 mr-2 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                Node Library
                <span className="ml-3 px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-gray-500 font-mono tracking-widest border border-white/5">⌘K</span>
              </button>
            )}


            <div className={`absolute right-0 top-0 bottom-0 z-20 transition-transform duration-500 ease-out ${isSidebarVisible ? 'translate-x-0' : 'translate-x-full'}`}>
              {isSidebarVisible && activeSidebarNode && (
                <NodeConfigSidebar 
                  node={activeSidebarNode} 
                  nodes={nodes}
                  edges={edges}
                  onClose={() => setSelectedNodeId(null)}
                  onUpdate={handleUpdateNode}
                  onDelete={handleDeleteNode}
                  onOpenTriggers={() => setIsTriggersPanelOpen(true)}
                />
              )}
            </div>
            
            {/* Command Palette Modal */}
            {isCommandPaletteOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
                <div 
                  className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/5 flex items-center">
                    <Search className="w-5 h-5 text-gray-400 mr-3" />
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Search nodes..."
                      value={paletteSearchQuery}
                      onChange={(e) => setPaletteSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-white text-lg w-full placeholder-gray-600"
                    />
                    <button 
                      onClick={() => { setIsNodePalettePinned(true); setIsCommandPaletteOpen(false); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors ml-2"
                      title="Pin to Sidebar"
                    >
                      <Pin className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsCommandPaletteOpen(false)}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors ml-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* 4-column equal grid — columns are defined by the grid, not by content */}
                  <div className="grid grid-cols-4 divide-x divide-white/5">
                    {/* Flow */}
                    <div className={`p-4 ${paletteSearchQuery && !['start', 'end'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : ''}`}>
                      <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> Flow
                      </h4>
                      <div className="space-y-0.5">
                        <button onClick={() => { handleAddNode('start', 'Start'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-rose-500/10 rounded-md transition-colors group">
                          <PlaySquare className="w-3.5 h-3.5 shrink-0 text-rose-500/40 group-hover:text-rose-400 transition-colors" />
                          <span>Start</span>
                        </button>
                        <button onClick={() => { handleAddNode('end', 'End'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-rose-500/10 rounded-md transition-colors group">
                          <Flag className="w-3.5 h-3.5 shrink-0 text-rose-500/40 group-hover:text-rose-400 transition-colors" />
                          <span>End</span>
                        </button>
                      </div>
                    </div>

                    {/* Transform */}
                    <div className={`p-4 ${paletteSearchQuery && !['agent', 'prompt', 'structured', 'state'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : ''}`}>
                      <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Cpu className="w-3 h-3" /> Transform
                      </h4>
                      <div className="space-y-0.5">
                        <button onClick={() => { handleAddNode('agentNode', 'Agent'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                          <Cpu className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400 transition-colors" />
                          <span>Agent</span>
                        </button>
                        <button onClick={() => { handleAddNode('promptBuilderNode', 'Prompt Builder'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400 transition-colors" />
                          <span>Prompt Builder</span>
                        </button>
                        <button onClick={() => { handleAddNode('structuredOutputNode', 'Structured Output'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                          <Code className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400 transition-colors" />
                          <span>Structured Output</span>
                        </button>
                        <button onClick={() => { handleAddNode('stateTransformNode', 'State Transform'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                          <Settings className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400 transition-colors" />
                          <span>State Transform</span>
                        </button>
                      </div>
                    </div>

                    {/* Control */}
                    <div className={`p-4 ${paletteSearchQuery && !['router', 'loop', 'split', 'merge', 'pause'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : ''}`}>
                      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3" /> Control
                      </h4>
                      <div className="space-y-0.5">
                        <button onClick={() => { handleAddNode('routerNode', 'Router'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                          <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                          <span>Router</span>
                        </button>
                        <button onClick={() => { handleAddNode('loopNode', 'Loop'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                          <RefreshCw className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                          <span>Loop</span>
                        </button>
                        <button onClick={() => { handleAddNode('parallelSplitNode', 'Parallel Split'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                          <GitCommit className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                          <span>Parallel Split</span>
                        </button>
                        <button onClick={() => { handleAddNode('mergeNode', 'Merge'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                          <GitMerge className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                          <span>Merge</span>
                        </button>
                        <button onClick={() => { handleAddNode('humanPauseNode', 'Human Pause'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                          <PauseCircle className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400 transition-colors" />
                          <span>Human Pause</span>
                        </button>
                      </div>
                    </div>

                    {/* Integrate */}
                    <div className={`p-4 ${paletteSearchQuery && !['tool', 'knowledge'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : ''}`}>
                      <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Blocks className="w-3 h-3" /> Integrate
                      </h4>
                      <div className="space-y-0.5">
                        <button onClick={() => { handleAddNode('toolNode', 'Tool Execution'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 rounded-md transition-colors group">
                          <Wrench className="w-3.5 h-3.5 shrink-0 text-emerald-500/40 group-hover:text-emerald-400 transition-colors" />
                          <span>Tool Execution</span>
                        </button>
                        <button onClick={() => { handleAddNode('knowledgeNode', 'Knowledge Retrieval'); setIsCommandPaletteOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-emerald-500/10 rounded-md transition-colors group">
                          <Database className="w-3.5 h-3.5 shrink-0 text-emerald-500/40 group-hover:text-emerald-400 transition-colors" />
                          <span>Knowledge Retrieval</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'json' && (
          <div className="flex-1 flex flex-col pt-16 p-6 bg-gray-950 w-full h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">JSON Configuration</h3>
              <button 
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonInput);
                    if (parsed.nodes && parsed.edges) {
                      setNodes(parsed.nodes);
                      setEdges(parsed.edges);
                      alert("Applied to visual editor!");
                      setActiveTab('editor');
                    } else {
                      alert("Invalid graph structure. Must contain 'nodes' and 'edges'.");
                    }
                  } catch (e) {
                    alert("Invalid JSON");
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-all"
              >
                Apply to Visual Editor
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="flex-1 bg-[#0a0a0a] text-gray-300 font-mono text-sm p-4 rounded-lg border border-gray-800 focus:outline-none focus:border-indigo-500/50 resize-none custom-scrollbar"
              spellCheck={false}
            />
          </div>
        )}
        
        {activeTab === 'executions' && (
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

        <TriggersPanel 
          isOpen={isTriggersPanelOpen} 
          onClose={() => setIsTriggersPanelOpen(false)} 
          triggers={triggers} 
          onSave={(newTriggers) => setTriggers(newTriggers)}
        />
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
