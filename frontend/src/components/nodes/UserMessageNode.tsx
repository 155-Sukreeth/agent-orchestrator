import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare } from 'lucide-react';

const UserMessageNode = ({ data, isConnectable }: any) => {
  return (
    <div className="react-flow__node p-4 min-w-[200px] border-purple-500/30 bg-purple-500/10 rounded-xl shadow-lg border backdrop-blur-sm">
      <div className="flex items-center mb-2 border-b border-white/10 pb-2">
        <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center mr-3">
          <MessageSquare className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Input</div>
          <div className="text-sm font-bold text-white leading-tight">{data.label || 'User Message'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-400">
        Key: <span className="text-gray-300 font-mono bg-black/30 px-1 py-0.5 rounded">{data.input_key || 'message'}</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-gray-900 bg-purple-400"
      />
    </div>
  );
};

export default memo(UserMessageNode);
