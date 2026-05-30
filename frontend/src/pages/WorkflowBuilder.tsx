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
import { Save, Plus, Maximize, Minimize, Settings2, PlaySquare, Workflow as WorkflowIcon, X, Search, Zap, Cpu, GitBranch, Blocks, Globe, Clock, FileText, Code, Settings, RefreshCw, GitCommit, GitMerge, PauseCircle, Wrench, Database, User, Flag, MessageSquare, Play, Info, AlertTriangle, CheckCircle2, Trash } from 'lucide-react';
import { createWorkflow, fetchWorkflow, updateWorkflow, fetchWorkflows, fetchWorkflowRuns, fetchRunDetails, startTestRun, fetchTemplates, deleteWorkflow } from '../api';

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
  const [leftPanelTab, setLeftPanelTab] = useState<'triggers' | 'nodes'>('triggers');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [triggers, setTriggers] = useState<any[]>([]);
  
  // Workspace State
  const [workflows, setWorkflows] = useState<any[]>([]);

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Executions State
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [isTestRunModalOpen, setIsTestRunModalOpen] = useState(false);
  const [testRunInput, setTestRunInput] = useState<string>('{\n  "message": "Hello"\n}');
  const [isStartingRun, setIsStartingRun] = useState(false);

  const [isImmersive, setIsImmersive] = useState(false);

  const [isActiveStatus, setIsActiveStatus] = useState(false);
  const [workflowName, setWorkflowName] = useState("New Workflow Draft");
  const [paletteSearchQuery, setPaletteSearchQuery] = useState("");
  const [leftPanelWidth, setLeftPanelWidth] = useState(220);
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
      setIsTemplateModalOpen(false);
    } else {
      setNodes(initialNodes);
      setEdges([]);
      setWorkflowName("New Workflow Draft");
      setIsActiveStatus(false);
      
      // Load templates and show modal
      const loadTpls = async () => {
        try {
          const data = await fetchTemplates();
          setTemplates(data);
          setIsTemplateModalOpen(true);
        } catch (e) {
          console.error("Failed to load templates", e);
        }
      };
      loadTpls();
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

  // Command Palette Keyboard Shortcut removed — left panel is always visible

  const loadWorkflowsList = async () => {
    try {
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (e: any) {
      console.error("Failed to load workflows list", e);
      alert("Failed to load workflows list: " + (e.message || 'Unknown error'));
    }
  };

  const handleDeleteWorkflow = async (workflowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this workflow?')) {
      try {
        await deleteWorkflow(workflowId);
        if (id === workflowId) {
          navigate('/workflows/new');
        } else {
          loadWorkflowsList();
        }
      } catch (e) {
        console.error("Failed to delete workflow", e);
        alert('Failed to delete workflow');
      }
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
            if (n.type === 'start' || n.type === 'end') {
                uiType = n.type;
            } else if (n.type === 'agent') {
                uiType = 'agentNode'; // Fallback
            } else if (n.type === 'router') {
                uiType = 'routerNode';
            } else if (n.type === 'tool') {
                uiType = 'toolNode';
            } else if (n.type && n.type.includes('_')) {
                uiType = n.type.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase()) + 'Node';
            } else if (n.type && !n.type.endsWith('Node')) {
                uiType = n.type + 'Node';
            }
            
            return {
              id: n.id,
              type: uiType,
              position: n.position || { x: 250 + (index * 200), y: 150 + (index % 2 === 0 ? 0 : 100) },
              data: { ...n.data, ...n.config }
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
    } catch (e: any) {
      console.error("Failed to load workflow:", e);
      alert("Failed to load workflow: " + (e.message || 'Unknown error'));
    }
  };

  const loadRuns = async () => {
    if (!id || id === 'new') return;
    try {
      const data = await fetchWorkflowRuns(id);
      setRuns(data);
    } catch (e: any) {
      console.error("Failed to load runs:", e);
      // alert("Failed to load runs: " + (e.message || 'Unknown error')); // Don't alert on polling
    }
  };

  useEffect(() => {
    if (activeTab === 'executions' && id && id !== 'new') {
      loadRuns();
      const interval = setInterval(loadRuns, 5000); // Poll every 5s while tab is open
      return () => clearInterval(interval);
    }
  }, [activeTab, id]);

  const handleTestRun = async () => {
    if (!id || id === 'new') return;
    setIsStartingRun(true);
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(testRunInput);
      } catch (e) {
        alert("Invalid JSON payload");
        setIsStartingRun(false);
        return;
      }
      await startTestRun(id, parsedInput);
      setIsTestRunModalOpen(false);
      loadRuns();
    } catch (e: any) {
      alert("Failed to start test run: " + e.message);
    } finally {
      setIsStartingRun(false);
    }
  };

  const loadRunDetails = async (runId: string) => {
    try {
      const details = await fetchRunDetails(runId);
      setSelectedRun(details);
    } catch (e: any) {
      console.error("Failed to load run details:", e);
      alert("Failed to load run details: " + (e.message || 'Unknown error'));
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
            data: { ...n.data }
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
                  <div key={w.id} className={`group flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${id === w.id.toString() ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400 hover:bg-white/5'}`}>
                    <Link 
                      to={`/workflows/${w.id}`}
                      className="flex-1 truncate"
                    >
                      {w.name}
                    </Link>
                    <button 
                      onClick={(e) => handleDeleteWorkflow(w.id.toString(), e)} 
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all rounded hover:bg-white/10 ml-2 shrink-0"
                      title="Delete Workflow"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                  <div key={w.id} className={`group flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors ${id === w.id.toString() ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:bg-white/5'}`}>
                    <Link 
                      to={`/workflows/${w.id}`}
                      className="flex-1 truncate"
                    >
                      {w.name}
                    </Link>
                    <button 
                      onClick={(e) => handleDeleteWorkflow(w.id.toString(), e)} 
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all rounded hover:bg-white/10 ml-2 shrink-0"
                      title="Delete Workflow"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                <div className="flex items-center"><Settings2 className="w-4 h-4 mr-2" />Visual Editor</div>
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
                <div className="flex items-center"><Code className="w-4 h-4 mr-2" />JSON Editor</div>
              </button>
              <button 
                onClick={() => setActiveTab('executions')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'executions' ? 'bg-indigo-500 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <div className="flex items-center"><PlaySquare className="w-4 h-4 mr-2" />Executions</div>
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

        {activeTab === 'editor' && (
          <div className="flex-1 flex relative w-full h-full pt-16" ref={reactFlowWrapper}>
            
            {/* Permanent Node Panel (Components) */}
            <div style={{ width: leftPanelWidth }} className="relative border-r border-gray-800 bg-[#0a0a0a] flex flex-col z-20 shrink-0 h-full shadow-2xl">
              {/* Resize Handle */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              />
              
              <div className="p-2 border-b border-gray-800 bg-black/40">
                <div className="flex bg-black/50 p-1 rounded-lg border border-white/5 w-full">
                  <button 
                    onClick={() => setLeftPanelTab('triggers')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${leftPanelTab === 'triggers' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <Zap className="w-3.5 h-3.5" /> Triggers
                  </button>
                  <button 
                    onClick={() => setLeftPanelTab('nodes')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${leftPanelTab === 'nodes' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    <Blocks className="w-3.5 h-3.5" /> Nodes
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {leftPanelTab === 'nodes' ? (
                  <>
                    <div className="p-2 border-b border-gray-800 bg-black/20">
                      <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-2.5 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                        <Search className="w-3.5 h-3.5 text-gray-500" />
                        <input 
                          type="text"
                          placeholder="Search..."
                          value={paletteSearchQuery}
                          onChange={(e) => setPaletteSearchQuery(e.target.value)}
                          className="bg-transparent border-none outline-none text-white text-xs w-full py-1.5 pl-2 placeholder-gray-600"
                        />
                      </div>
                    </div>
                    <div className="p-3 space-y-4">
                      {/* Flow */}
                      <div className={paletteSearchQuery && !['start', 'end'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                        <h4 className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Flow</h4>
                        <div className="space-y-0.5">
                          <button onClick={() => handleAddNode('start', 'Start')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-rose-500/10 rounded-md transition-colors group">
                            <PlaySquare className="w-3.5 h-3.5 shrink-0 text-rose-500/40 group-hover:text-rose-400" /> Start
                          </button>
                          <button onClick={() => handleAddNode('end', 'End')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-rose-500/10 rounded-md transition-colors group">
                            <Flag className="w-3.5 h-3.5 shrink-0 text-rose-500/40 group-hover:text-rose-400" /> End
                          </button>
                        </div>
                      </div>
                      {/* Transform */}
                      <div className={paletteSearchQuery && !['agent', 'prompt', 'structured', 'state'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                        <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Cpu className="w-2.5 h-2.5" /> Transform</h4>
                        <div className="space-y-0.5">
                          <button onClick={() => handleAddNode('agentNode', 'Agent')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                            <Cpu className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400" /> Agent
                          </button>
                          <button onClick={() => handleAddNode('promptBuilderNode', 'Prompt Builder')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                            <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400" /> Prompt Builder
                          </button>
                          <button onClick={() => handleAddNode('structuredOutputNode', 'Structured Output')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                            <Code className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400" /> Structured Output
                          </button>
                          <button onClick={() => handleAddNode('stateTransformNode', 'State Transform')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-blue-500/10 rounded-md transition-colors group">
                            <Settings className="w-3.5 h-3.5 shrink-0 text-blue-500/40 group-hover:text-blue-400" /> State Transform
                          </button>
                        </div>
                      </div>
                      {/* Control */}
                      <div className={paletteSearchQuery && !['router', 'loop', 'split', 'merge', 'pause'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                        <h4 className="text-[9px] font-bold text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><GitBranch className="w-2.5 h-2.5" /> Control</h4>
                        <div className="space-y-0.5">
                          <button onClick={() => handleAddNode('routerNode', 'Router')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                            <GitBranch className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400" /> Router
                          </button>
                          <button onClick={() => handleAddNode('loopNode', 'Loop')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                            <RefreshCw className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400" /> Loop
                          </button>
                          <button onClick={() => handleAddNode('parallelSplitNode', 'Parallel Split')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                            <GitCommit className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400" /> Parallel Split
                          </button>
                          <button onClick={() => handleAddNode('mergeNode', 'Merge')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                            <GitMerge className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400" /> Merge
                          </button>
                          <button onClick={() => handleAddNode('humanPauseNode', 'Human Pause')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-amber-500/10 rounded-md transition-colors group">
                            <PauseCircle className="w-3.5 h-3.5 shrink-0 text-amber-500/40 group-hover:text-amber-400" /> Human Pause
                          </button>
                        </div>
                      </div>
                      {/* Integrate */}
                      <div className={paletteSearchQuery && !['tool', 'knowledge'].some(k => k.includes(paletteSearchQuery.toLowerCase())) ? 'hidden' : 'block'}>
                        <h4 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Wrench className="w-2.5 h-2.5" /> Integrate</h4>
                        <div className="space-y-0.5">
                          <button onClick={() => handleAddNode('toolNode', 'Tool Execution')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-emerald-500/10 rounded-md transition-colors group">
                            <Wrench className="w-3.5 h-3.5 shrink-0 text-emerald-500/40 group-hover:text-emerald-400" /> Tool Execution
                          </button>
                          <button onClick={() => handleAddNode('knowledgeNode', 'Knowledge Retrieval')} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-emerald-500/10 rounded-md transition-colors group">
                            <Database className="w-3.5 h-3.5 shrink-0 text-emerald-500/40 group-hover:text-emerald-400" /> Knowledge Retrieval
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 space-y-4">
                    {/* Add Trigger Section */}
                    <div>
                      <h4 className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Add New Trigger</h4>
                      <div className="space-y-1.5">
                        <button onClick={() => setTriggers([...triggers, { type: 'semantic', enabled: true, config: { channels: [], confidence_threshold: 0.75 } }])} className="w-full flex items-center px-2 py-1.5 text-xs text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-md transition-colors border border-gray-800 hover:border-purple-500/30 group">
                          <MessageSquare className="w-3.5 h-3.5 mr-2 text-purple-500/50 group-hover:text-purple-400" /> Semantic Router
                        </button>
                        <button onClick={() => setTriggers([...triggers, { type: 'webhook', enabled: true, config: { endpoint_path: '' } }])} className="w-full flex items-center px-2 py-1.5 text-xs text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-md transition-colors border border-gray-800 hover:border-purple-500/30 group">
                          <Globe className="w-3.5 h-3.5 mr-2 text-purple-500/50 group-hover:text-purple-400" /> Webhook
                        </button>
                        <button onClick={() => setTriggers([...triggers, { type: 'scheduler', enabled: true, config: { cron: '' } }])} className="w-full flex items-center px-2 py-1.5 text-xs text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-md transition-colors border border-gray-800 hover:border-purple-500/30 group">
                          <Clock className="w-3.5 h-3.5 mr-2 text-purple-500/50 group-hover:text-purple-400" /> Scheduler
                        </button>
                      </div>
                    </div>

                    <div className="w-full h-px bg-gray-800"></div>

                    {/* Active Triggers */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">Configured Triggers</h4>
                        <span className="text-[9px] text-gray-500 bg-black/40 px-1.5 py-0.5 rounded">{triggers.length}</span>
                      </div>
                      
                      {triggers.length === 0 ? (
                        <div className="text-center py-6 bg-black/20 rounded-lg border border-gray-800 border-dashed">
                          <p className="text-xs text-gray-500">No triggers</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {triggers.map((trigger, i) => (
                            <div key={trigger.id || i} className="bg-black/40 border border-gray-800 rounded-lg p-2.5 hover:border-gray-700 transition-colors">
                              <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-800/50">
                                <div className="flex items-center gap-2">
                                  {trigger.type === 'semantic' ? <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> :
                                   trigger.type === 'webhook' ? <Globe className="w-3.5 h-3.5 text-purple-400" /> :
                                   trigger.type === 'scheduler' ? <Clock className="w-3.5 h-3.5 text-purple-400" /> :
                                   <Zap className="w-3.5 h-3.5 text-purple-400" />}
                                  <h3 className="text-[11px] font-medium text-gray-200 capitalize">{trigger.type.replace('_', ' ')}</h3>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button 
                                    onClick={() => {
                                      const updated = [...triggers];
                                      updated[i] = { ...updated[i], enabled: !updated[i].enabled };
                                      setTriggers(updated);
                                    }}
                                    className={`relative inline-flex h-3.5 w-6 items-center rounded-full transition-colors ${trigger.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
                                  >
                                    <span className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${trigger.enabled ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                  </button>
                                  <button onClick={() => setTriggers(triggers.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {trigger.type === 'semantic' && (
                                  <>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 mb-0.5">Channels</label>
                                      <input type="text" className="w-full bg-black/50 border border-gray-800 rounded px-1.5 py-1 text-xs text-gray-300 focus:border-purple-500/50 focus:outline-none"
                                        placeholder="telegram, web"
                                        value={(trigger.config.channels || []).join(', ')}
                                        onChange={(e) => { const u = [...triggers]; u[i] = { ...u[i], config: { ...u[i].config, channels: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) } }; setTriggers(u); }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-gray-500 mb-0.5">Confidence (0-1)</label>
                                      <input type="number" step="0.01" min="0" max="1" className="w-full bg-black/50 border border-gray-800 rounded px-1.5 py-1 text-xs text-gray-300 focus:border-purple-500/50 focus:outline-none"
                                        value={trigger.config.confidence_threshold || 0.75}
                                        onChange={(e) => { const u = [...triggers]; u[i] = { ...u[i], config: { ...u[i].config, confidence_threshold: parseFloat(e.target.value) } }; setTriggers(u); }}
                                      />
                                    </div>
                                  </>
                                )}
                                {trigger.type === 'webhook' && (
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-0.5">Endpoint Path</label>
                                    <input type="text" className="w-full bg-black/50 border border-gray-800 rounded px-1.5 py-1 text-xs text-gray-300 focus:border-purple-500/50 focus:outline-none"
                                      placeholder="/webhook"
                                      value={trigger.config.endpoint_path || ''}
                                      onChange={(e) => { const u = [...triggers]; u[i] = { ...u[i], config: { ...u[i].config, endpoint_path: e.target.value } }; setTriggers(u); }}
                                    />
                                  </div>
                                )}
                                {trigger.type === 'scheduler' && (
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-0.5">Cron</label>
                                    <input type="text" className="w-full bg-black/50 border border-gray-800 rounded px-1.5 py-1 text-xs font-mono text-gray-300 focus:border-purple-500/50 focus:outline-none"
                                      placeholder="0 * * * *"
                                      value={trigger.config.cron || ''}
                                      onChange={(e) => { const u = [...triggers]; u[i] = { ...u[i], config: { ...u[i].config, cron: e.target.value } }; setTriggers(u); }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Canvas */}
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

            <div className={`absolute right-0 top-0 bottom-0 z-20 transition-transform duration-500 ease-out ${isSidebarVisible ? 'translate-x-0' : 'translate-x-full'}`}>
              {isSidebarVisible && activeSidebarNode && (
                <NodeConfigSidebar 
                  node={activeSidebarNode} 
                  nodes={nodes}
                  edges={edges}
                  onClose={() => setSelectedNodeId(null)}
                  onUpdate={handleUpdateNode}
                  onDelete={handleDeleteNode}
                />
              )}
            </div>
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
          <div className="flex-1 flex pt-16 bg-gray-950 w-full h-full overflow-hidden">
            
            {/* Left Pane: Run History List */}
            <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50 shrink-0">
              <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center">
                  <PlaySquare className="w-4 h-4 mr-2 text-indigo-400" />
                  Run History
                </h3>
                <button 
                  onClick={() => setIsTestRunModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded transition-colors"
                  title="Run Now"
                >
                  <Play className="w-3 h-3" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {runs.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-8">No runs recorded yet.</p>
                ) : (
                  runs.map(run => (
                    <div 
                      key={run.id}
                      onClick={() => loadRunDetails(run.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedRun?.id === run.id 
                          ? 'bg-indigo-900/20 border-indigo-500/50' 
                          : 'bg-black/20 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-gray-300">Run #{run.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          run.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          run.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          run.status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2">
                        <span>{new Date(run.created_at).toLocaleString()}</span>
                        <span className="bg-white/5 px-1.5 rounded text-gray-400">{run.run_type}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Pane: Run Details */}
            <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
              {!selectedRun ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <FileText className="w-12 h-12 mb-3 text-gray-800" />
                  <p className="text-sm">Select a run from the history to view details</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white flex items-center">
                        Run #{selectedRun.id}
                        {selectedRun.status === 'completed' && <CheckCircle2 className="w-5 h-5 ml-2 text-emerald-500" />}
                        {selectedRun.status === 'failed' && <AlertTriangle className="w-5 h-5 ml-2 text-red-500" />}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">Started: {new Date(selectedRun.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-4 bg-black/30 p-2 rounded-lg border border-white/5">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tokens</p>
                        <p className="text-sm font-medium text-gray-300">{selectedRun.token_usage || 0}</p>
                      </div>
                      <div className="text-center border-l border-white/5 pl-4">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cost</p>
                        <p className="text-sm font-medium text-gray-300">${(selectedRun.cost_usd || 0).toFixed(4)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Input</h4>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-auto max-h-40 custom-scrollbar">
                        {selectedRun.input_data ? JSON.stringify(selectedRun.input_data, null, 2) : selectedRun.input_text}
                      </pre>
                    </div>
                    <div className="bg-gray-900 border border-white/5 rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Output</h4>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-auto max-h-40 custom-scrollbar">
                        {selectedRun.output_data ? JSON.stringify(selectedRun.output_data, null, 2) : (selectedRun.output_text || 'No output')}
                      </pre>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-gray-200 mb-3 flex items-center">
                    <Code className="w-4 h-4 mr-2 text-gray-400" /> Execution Logs
                  </h4>
                  <div className="bg-black/50 border border-gray-800 rounded-xl overflow-hidden">
                    {(!selectedRun.logs || selectedRun.logs.length === 0) ? (
                      <p className="text-xs text-gray-500 p-4">No logs available for this run.</p>
                    ) : (
                      <div className="divide-y divide-gray-800/50">
                        {selectedRun.logs.map((log: any) => (
                          <div key={log.id} className="p-3 hover:bg-white/5 transition-colors">
                            <div className="flex items-center space-x-3 mb-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                                log.level === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {new Date(log.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-1">{log.message}</p>
                            {log.details && (
                              <pre className="mt-2 text-[10px] text-gray-400 bg-black/40 p-2 rounded border border-white/5 overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Test Run Modal */}
      {isTestRunModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-[500px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-black/40">
              <h3 className="text-lg font-medium text-white flex items-center">
                <Play className="w-4 h-4 mr-2 text-indigo-400" /> Test Run
              </h3>
              <button onClick={() => setIsTestRunModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-400 mb-4">
                Trigger a test run manually. Provide the JSON input payload below that will be passed into the workflow.
              </p>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Input Payload (JSON)</label>
              <textarea
                value={testRunInput}
                onChange={(e) => setTestRunInput(e.target.value)}
                className="w-full h-48 bg-black/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 font-mono focus:ring-1 focus:ring-indigo-500 outline-none custom-scrollbar"
                spellCheck={false}
              />
            </div>
            <div className="p-4 border-t border-gray-800 bg-black/40 flex justify-end space-x-3">
              <button 
                onClick={() => setIsTestRunModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTestRun}
                disabled={isStartingRun}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                {isStartingRun ? 'Starting...' : 'Start Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-[800px] shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-black/40">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <WorkflowIcon className="w-5 h-5 mr-3 text-indigo-400" /> Choose a Template
                </h3>
                <p className="text-sm text-gray-400 mt-1">Start from scratch or pick a pre-configured workflow.</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div 
                onClick={() => setIsTemplateModalOpen(false)}
                className="bg-black/40 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-xl p-6 cursor-pointer transition-all flex flex-col items-center justify-center text-center group h-40"
              >
                <Plus className="w-8 h-8 text-gray-500 group-hover:text-indigo-400 mb-3 transition-colors" />
                <h4 className="text-sm font-semibold text-gray-200">Blank Workflow</h4>
                <p className="text-xs text-gray-500 mt-1">Start completely from scratch</p>
              </div>
              
              {templates.map(tpl => (
                <div 
                  key={tpl.id}
                  onClick={() => {
                    setWorkflowName(tpl.name);
                    if (tpl.graph_definition) {
                      const loadedNodes = tpl.graph_definition.nodes.map((n: any, index: number) => {
                        let uiType = n.type;
                        if (n.type === 'start' || n.type === 'end') {
                            uiType = n.type;
                        } else if (n.type === 'agent') {
                            uiType = 'agentNode';
                        } else if (n.type === 'router') {
                            uiType = 'routerNode';
                        } else if (n.type === 'tool') {
                            uiType = 'toolNode';
                        } else if (n.type && n.type.includes('_')) {
                            uiType = n.type.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase()) + 'Node';
                        } else if (n.type && !n.type.endsWith('Node')) {
                            uiType = n.type + 'Node';
                        }
                        
                        return {
                          id: n.id,
                          type: uiType,
                          position: n.position || { x: 250 + (index * 200), y: 150 + (index % 2 === 0 ? 0 : 100) },
                          data: { ...n.data, ...n.config }
                        };
                      });

                      const loadedEdges = tpl.graph_definition.edges.map((e: any, index: number) => ({
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
                    setIsTemplateModalOpen(false);
                  }}
                  className="bg-gray-800/50 border border-gray-700 hover:border-indigo-500 rounded-xl p-6 cursor-pointer transition-all flex flex-col group h-40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-200 group-hover:text-indigo-400 transition-colors">{tpl.name}</h4>
                    <Zap className="w-4 h-4 text-emerald-400 opacity-50 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-3">{tpl.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const WorkflowBuilder: React.FC = () => (
  <ReactFlowProvider>
    <WorkflowBuilderContent />
  </ReactFlowProvider>
);

export default WorkflowBuilder;
