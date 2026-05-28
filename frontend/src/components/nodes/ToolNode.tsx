import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Wrench } from 'lucide-react';

const ToolNode = ({ data, isConnectable }: any) => {
  return (
    <div className="react-flow__node p-4 min-w-[200px] border-cyan-500/30 bg-cyan-500/10 rounded-xl shadow-lg border backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-cyan-400"
      />
      <div className="flex items-center mb-3 border-b border-white/10 pb-3">
        <div className="w-8 h-8 rounded bg-cyan-500/20 flex items-center justify-center mr-3">
          <Wrench className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tool Execution</div>
          <div className="text-sm font-bold text-white leading-tight">{data.label || 'Tool Actions'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Tool(s): <span className="text-gray-300 font-medium truncate inline-block max-w-[120px] align-bottom">
          {data.tools && data.tools.length > 0 ? data.tools.join(", ") : "None selected"}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-cyan-400"
      />
    </div>
  );
};

export default memo(ToolNode);
