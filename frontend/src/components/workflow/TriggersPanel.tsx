import React, { useState } from 'react';
import { X, Zap, Plus, Trash2, Globe, Clock, MessageSquare, Workflow as WorkflowIcon, Save } from 'lucide-react';

interface Trigger {
  id?: string;
  type: string;
  enabled: boolean;
  config: any;
}

interface TriggersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  triggers: Trigger[];
  onSave: (triggers: Trigger[]) => void;
}

const TriggersPanel: React.FC<TriggersPanelProps> = ({ isOpen, onClose, triggers, onSave }) => {
  const [localTriggers, setLocalTriggers] = useState<Trigger[]>(JSON.parse(JSON.stringify(triggers || [])));
  
  if (!isOpen) return null;

  const handleAddTrigger = (type: string) => {
    const newTrigger: Trigger = {
      type,
      enabled: true,
      config: type === 'semantic' ? { channels: [], confidence_threshold: 0.75 } : {}
    };
    setLocalTriggers([...localTriggers, newTrigger]);
  };

  const handleRemoveTrigger = (index: number) => {
    const updated = [...localTriggers];
    updated.splice(index, 1);
    setLocalTriggers(updated);
  };

  const handleToggleEnabled = (index: number) => {
    const updated = [...localTriggers];
    updated[index].enabled = !updated[index].enabled;
    setLocalTriggers(updated);
  };

  const handleConfigChange = (index: number, key: string, value: any) => {
    const updated = [...localTriggers];
    updated[index].config = { ...updated[index].config, [key]: value };
    setLocalTriggers(updated);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'semantic': return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'webhook': return <Globe className="w-4 h-4 text-purple-400" />;
      case 'scheduler': return <Clock className="w-4 h-4 text-purple-400" />;
      case 'workflow_event': return <WorkflowIcon className="w-4 h-4 text-purple-400" />;
      default: return <Zap className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/40">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-400" />
            Workflow Triggers
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950/50 flex space-x-6">
          {/* Triggers List */}
          <div className="flex-1 space-y-4">
            {localTriggers.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-xl border border-gray-800 border-dashed">
                <Zap className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No triggers configured</p>
                <p className="text-sm text-gray-600 mt-1">Add a trigger to automatically start this workflow</p>
              </div>
            ) : (
              localTriggers.map((trigger, i) => (
                <div key={trigger.id || i} className="bg-black/40 border border-gray-800 rounded-xl p-4 shadow-sm hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800/50">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        {getIcon(trigger.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-200 capitalize">{trigger.type.replace('_', ' ')} Trigger</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{trigger.id || 'Unsaved'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleToggleEnabled(i)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${trigger.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${trigger.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <div className="w-px h-4 bg-gray-800"></div>
                      <button onClick={() => handleRemoveTrigger(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Dynamic Config based on Type */}
                  <div className="space-y-3 pl-1">
                    {trigger.type === 'semantic' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Channels</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/50 border border-gray-800 rounded-md p-2 text-sm text-gray-300 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            placeholder="telegram, web (comma separated)"
                            value={(trigger.config.channels || []).join(', ')}
                            onChange={(e) => handleConfigChange(i, 'channels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Confidence Threshold</label>
                          <input 
                            type="number" step="0.01" min="0" max="1"
                            className="w-full bg-black/50 border border-gray-800 rounded-md p-2 text-sm text-gray-300 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            value={trigger.config.confidence_threshold || 0.75}
                            onChange={(e) => handleConfigChange(i, 'confidence_threshold', parseFloat(e.target.value))}
                          />
                        </div>
                      </>
                    )}
                    {trigger.type === 'webhook' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Endpoint Path</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/50 border border-gray-800 rounded-md p-2 text-sm text-gray-300 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            placeholder="/webhooks/custom-xyz"
                            value={trigger.config.endpoint_path || ''}
                            onChange={(e) => handleConfigChange(i, 'endpoint_path', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    {trigger.type === 'scheduler' && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Cron Expression</label>
                          <input 
                            type="text" 
                            className="w-full bg-black/50 border border-gray-800 rounded-md p-2 text-sm font-mono text-gray-300 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                            placeholder="0 * * * *"
                            value={trigger.config.cron || ''}
                            onChange={(e) => handleConfigChange(i, 'cron', e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Trigger Sidebar */}
          <div className="w-56 space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Trigger</h3>
            <button onClick={() => handleAddTrigger('semantic')} className="w-full flex items-center px-3 py-2 text-sm text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-lg transition-colors border border-gray-800 hover:border-purple-500/30 group">
              <Plus className="w-4 h-4 mr-2 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
              Semantic Router
            </button>
            <button onClick={() => handleAddTrigger('webhook')} className="w-full flex items-center px-3 py-2 text-sm text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-lg transition-colors border border-gray-800 hover:border-purple-500/30 group">
              <Plus className="w-4 h-4 mr-2 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
              Webhook
            </button>
            <button onClick={() => handleAddTrigger('scheduler')} className="w-full flex items-center px-3 py-2 text-sm text-gray-400 bg-black/20 hover:text-white hover:bg-purple-500/10 rounded-lg transition-colors border border-gray-800 hover:border-purple-500/30 group">
              <Plus className="w-4 h-4 mr-2 text-purple-500/50 group-hover:text-purple-400 transition-colors" />
              Scheduler
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-black/40 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onSave(localTriggers); onClose(); }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center shadow-[0_0_10px_rgba(147,51,234,0.2)]"
          >
            <Save className="w-4 h-4 mr-2" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriggersPanel;
