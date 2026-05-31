import React from 'react';
import BaseNode from '../BaseNode';
import { Zap, Globe, Clock, Workflow } from 'lucide-react';

export const SemanticTriggerNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Semantic" icon={<Zap className="w-4 h-4" />} colorClass="bg-purple-600/80" />
);

export const WebhookTriggerNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Webhook" icon={<Globe className="w-4 h-4" />} colorClass="bg-purple-600/80" />
);

export const SchedulerTriggerNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Scheduler" icon={<Clock className="w-4 h-4" />} colorClass="bg-purple-600/80" />
);

export const WorkflowEventTriggerNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Workflow Event" icon={<Workflow className="w-4 h-4" />} colorClass="bg-purple-600/80" />
);
