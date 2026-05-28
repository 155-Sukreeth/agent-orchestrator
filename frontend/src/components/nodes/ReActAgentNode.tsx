import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Bot } from 'lucide-react';

const ReActAgentNode = ({ data, isConnectable }: any) => {
  return (
    <div className="react-flow__node p-4 min-w-[200px] border-emerald-500/30 bg-emerald-500/10 rounded-xl shadow-lg border backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-emerald-400"
      />
      <div className="flex items-center mb-2 border-b border-white/10 pb-2">
        <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center mr-3">
          <Bot className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">ReAct Loop</div>
          <div className="text-sm font-bold text-white leading-tight">{data.label || 'Reason & Act'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400 truncate">
        Tools: <span className="text-gray-300 font-medium">{data.tools?.length || 0} Connected</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-emerald-400"
      />
    </div>
  );
};

export default memo(ReActAgentNode);
