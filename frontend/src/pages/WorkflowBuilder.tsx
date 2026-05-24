import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { Background, Controls, addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import AgentNode from '../components/nodes/AgentNode';
import { Network, Save } from 'lucide-react';

const initialNodes = [
  { 
    id: 'start', 
    type: 'input',
    position: { x: 250, y: 50 }, 
    data: { label: 'Start Trigger' },
    className: 'react-flow__node p-3 text-sm font-medium border-emerald-500/30 bg-emerald-500/10'
  },
  {
    id: 'agent-1',
    type: 'agentNode',
    position: { x: 250, y: 150 },
    data: { label: 'Primary Researcher', provider: 'openai', model: 'gpt-4o' }
  }
];

const initialEdges = [
  { id: 'e-start-agent1', source: 'start', target: 'agent-1', animated: true, style: { stroke: '#8b5cf6' } }
];

const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>(initialEdges);

  const nodeTypes = useMemo(() => ({ agentNode: AgentNode }), []);

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

  const handleDeploy = () => {
    // In a real implementation, we would serialize this to our DB format
    console.log("Deploying nodes:", nodes);
    alert("Workflow deployed! (Check console for serialized graph)");
  };

  return (
    <div className="h-full w-full flex flex-col relative">
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

      <div className="flex-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-gray-950">
        <ReactFlow 
          nodes={nodes} 
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-transparent"
        >
          <Background color="#374151" gap={16} size={1.5} />
          <Controls className="react-flow__controls border-gray-800 shadow-2xl" />
        </ReactFlow>
      </div>

      {/* Toolbox Panel */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 pointer-events-auto glass-card p-2 flex space-x-2">
        <div className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-move border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors">
          <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> Trigger Node
        </div>
        <div className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-move border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors">
          <span className="w-3 h-3 rounded-full bg-primary mr-2"></span> Agent Node
        </div>
        <div className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-move border border-white/5 flex items-center text-sm font-medium text-gray-300 transition-colors">
          <span className="w-3 h-3 rounded-full bg-amber-500 mr-2"></span> Human Pause
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
