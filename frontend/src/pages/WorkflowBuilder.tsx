import React, { useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges,
  ReactFlowProvider,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from '../components/nodes/AgentNode';
import RouterNode from '../components/nodes/RouterNode';
import ToolNode from '../components/nodes/ToolNode';
import NodeConfigSidebar from '../components/NodeConfigSidebar';
import { Network, Save } from 'lucide-react';
import { createWorkflow } from '../api';

const initialNodes: Node[] = [
  { 
    id: 'start', 
    type: 'input',
    position: { x: 250, y: 50 }, 
    data: { label: 'Start Trigger' },
    className: 'react-flow__node p-3 text-sm font-medium border-emerald-500/30 bg-emerald-500/10'
  }
];

let id = 0;
const getId = (type: string) => `${type}-${id++}`;

const WorkflowBuilderContent: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeTypes = useMemo(() => ({ 
    agentNode: AgentNode,
    routerNode: RouterNode,
    toolNode: ToolNode
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

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode: Node = {
        id: getId(type),
        type,
        position,
        data: { label: `New ${type.replace('Node', '')}` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleUpdateNode = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          n.data = { ...newData };
        }
        return n;
      })
    );
  };

  const handleDeploy = async () => {
    try {
      const graphDefinition = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.type === 'agentNode' ? 'agent' : 
                n.type === 'routerNode' ? 'router' : 
                n.type === 'toolNode' ? 'tool' : 'input',
          config: { ...n.data }
        })),
        edges: edges.map(e => ({
          source: e.source,
          target: e.target,
          condition: e.label || undefined // Use edge label for condition if provided
        })),
        entry_node: 'start'
      };

      await createWorkflow({
        name: `Workflow ${new Date().toISOString().split('T')[0]}`,
        description: "Created from visual builder",
        graph_definition: graphDefinition,
        channels: ["telegram"],
        is_active: true,
        is_template: false
      });
      
      alert("Workflow deployed to backend database!");
    } catch (e: any) {
      alert("Failed to deploy: " + e.message);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-6 z-10 pointer-events-none flex justify-between items-start bg-gradient-to-b from-gray-950 via-gray-950/80 to-transparent pb-12">
        <div className="pointer-events-auto">
          <div className="flex items-center mb-1">
            <Network className="w-6 h-6 text-indigo-500 mr-2" />
            <h2 className="text-2xl font-bold tracking-tight text-white">Workflow Builder</h2>
          </div>
          <p className="text-gray-400 text-sm">Design routing and execution logic visually.</p>
        </div>
        <button 
          onClick={handleDeploy}
          className="pointer-events-auto bg-primary hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20 flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save & Deploy
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div 
          className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-gray-950 relative"
          ref={reactFlowWrapper}
        >
          <ReactFlow 
            nodes={nodes} 
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-transparent"
          >
            <Background color="#374151" gap={16} size={1.5} />
            <Controls className="react-flow__controls border-gray-800 shadow-2xl" />
          </ReactFlow>

          {/* Toolbox Panel */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto glass-card p-2 flex space-x-2 z-10">
            <div 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors"
              onDragStart={(e) => onDragStart(e, 'agentNode')}
              draggable
            >
              <span className="w-3 h-3 rounded-full bg-primary mr-2"></span> Agent
            </div>
            <div 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors"
              onDragStart={(e) => onDragStart(e, 'routerNode')}
              draggable
            >
              <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span> Router
            </div>
            <div 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-grab active:cursor-grabbing border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors"
              onDragStart={(e) => onDragStart(e, 'toolNode')}
              draggable
            >
              <span className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></span> Tool
            </div>
          </div>
        </div>

        {selectedNode && (
          <NodeConfigSidebar 
            node={selectedNode} 
            onClose={() => setSelectedNodeId(null)}
            onUpdate={handleUpdateNode}
          />
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
