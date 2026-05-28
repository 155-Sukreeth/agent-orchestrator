import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

const RouterNode = ({ data, isConnectable }: any) => {
  return (
    <div className="react-flow__node p-4 min-w-[200px] border-amber-500/30 bg-amber-500/10 rounded-xl shadow-lg border backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-amber-400"
      />
      <div className="flex items-center mb-3 border-b border-white/10 pb-3">
        <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center mr-3">
          <GitBranch className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Router</div>
          <div className="text-sm font-bold text-white leading-tight">{data.label || 'Condition Check'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Type: <span className="text-gray-300 font-medium">{data.condition_type || 'llm_judge'}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-amber-400"
      />
    </div>
  );
};

export default memo(RouterNode);
