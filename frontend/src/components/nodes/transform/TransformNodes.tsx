import React from 'react';
import BaseNode from '../BaseNode';
import { Bot, FileText, Braces, ArrowRightLeft } from 'lucide-react';

export const AgentNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Agent" icon={<Bot className="w-4 h-4" />} colorClass="bg-blue-600/80" />
);

export const PromptBuilderNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Prompt Builder" icon={<FileText className="w-4 h-4" />} colorClass="bg-blue-600/80" />
);

export const StructuredOutputNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Structured Output" icon={<Braces className="w-4 h-4" />} colorClass="bg-blue-600/80" />
);

export const StateTransformNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="State Transform" icon={<ArrowRightLeft className="w-4 h-4" />} colorClass="bg-blue-600/80" />
);
