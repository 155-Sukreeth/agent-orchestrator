import React from 'react';
import BaseNode from '../BaseNode';
import { Wrench, Database } from 'lucide-react';

export const ToolNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Tool" icon={<Wrench className="w-4 h-4" />} colorClass="bg-emerald-600/80" />
);

export const KnowledgeNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Knowledge" icon={<Database className="w-4 h-4" />} colorClass="bg-emerald-600/80" />
);
