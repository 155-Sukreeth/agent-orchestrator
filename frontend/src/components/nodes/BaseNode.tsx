import React from 'react';
import { Handle, Position } from 'reactflow';

export interface BaseNodeProps {
  data: any;
  selected?: boolean;
  title: string;
  icon?: React.ReactNode;
  colorClass: string;
}

const BaseNode: React.FC<BaseNodeProps> = ({ data, selected, title, icon, colorClass }) => {
  return (
    <div className={`react-flow__node flex flex-col min-w-[140px] max-w-[180px] rounded-lg border border-white/10 bg-gray-950/80 backdrop-blur-md shadow-lg transition-all ${selected ? 'ring-1 ring-indigo-500 shadow-indigo-500/20' : ''}`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-700 !border !border-gray-900 hover:!bg-indigo-500 transition-colors" />
      <div className={`flex items-center px-2 py-1.5 border-b border-white/5 rounded-t-lg ${colorClass}`}>
        {icon && <div className="mr-1.5 text-white/90">{icon}</div>}
        <div className="text-[10px] font-bold tracking-wide text-white/90 uppercase truncate">{title}</div>
      </div>
      <div className="px-2 py-1.5 text-xs text-gray-300 bg-black/40 rounded-b-lg">
        <div className="font-medium truncate" title={data.label || 'Node'}>{data.label || 'Node'}</div>
        {data.description && <div className="text-[9px] text-gray-500 mt-0.5 line-clamp-2 leading-tight">{data.description}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-gray-700 !border !border-gray-900 hover:!bg-indigo-500 transition-colors" />
    </div>
  );
};

export default BaseNode;
