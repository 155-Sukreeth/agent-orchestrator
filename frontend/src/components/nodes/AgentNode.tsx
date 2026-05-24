import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

const AgentNode = ({ data, isConnectable }: any) => {
  return (
    <div className="react-flow__node p-4 min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="react-flow__handle"
      />
      <div className="flex items-center mb-3 border-b border-white/10 pb-3">
        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center mr-3">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Agent</div>
          <div className="text-sm font-bold text-white leading-tight">{data.label || 'Unnamed Agent'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Provider: <span className="text-gray-300 font-medium">{data.provider || 'default'}</span>
      </div>
      {data.model && (
        <div className="text-xs text-gray-400 mt-1">
          Model: <span className="text-gray-300 font-medium">{data.model}</span>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="react-flow__handle"
      />
    </div>
  );
};

export default memo(AgentNode);
