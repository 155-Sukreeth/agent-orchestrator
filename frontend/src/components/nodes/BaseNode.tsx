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
    <div className={`react-flow__node flex flex-col min-w-[200px] ${selected ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}`}>
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-800 !border-2 !border-gray-400 hover:!bg-indigo-500 transition-colors" />
      <div className={`flex items-center px-3 py-2 border-b border-white/10 rounded-t-xl ${colorClass}`}>
        {icon && <div className="mr-2 text-white">{icon}</div>}
        <div className="text-xs font-bold tracking-wider text-white uppercase">{title}</div>
      </div>
      <div className="p-3 text-sm text-gray-300 bg-gray-900/80 rounded-b-xl">
        <div className="font-medium">{data.label || 'Node'}</div>
        {data.description && <div className="text-xs text-gray-500 mt-1">{data.description}</div>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-800 !border-2 !border-gray-400 hover:!bg-indigo-500 transition-colors" />
    </div>
  );
};

export default BaseNode;
