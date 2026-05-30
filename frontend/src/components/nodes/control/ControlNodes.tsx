import React from 'react';
import BaseNode from '../BaseNode';
import { GitBranch, Repeat, Split, Merge, PauseCircle } from 'lucide-react';

export const RouterNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Router" icon={<GitBranch className="w-4 h-4" />} colorClass="bg-amber-600/80" />
);

export const LoopNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Loop" icon={<Repeat className="w-4 h-4" />} colorClass="bg-amber-600/80" />
);

export const ParallelSplitNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Parallel Split" icon={<Split className="w-4 h-4" />} colorClass="bg-amber-600/80" />
);

export const MergeNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Merge" icon={<Merge className="w-4 h-4" />} colorClass="bg-amber-600/80" />
);

export const HumanPauseNode: React.FC<any> = (props) => (
  <BaseNode {...props} title="Human Pause" icon={<PauseCircle className="w-4 h-4" />} colorClass="bg-amber-600/80" />
);
