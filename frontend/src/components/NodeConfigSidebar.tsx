import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface NodeConfigSidebarProps {
  node: any;
  onClose: () => void;
  onUpdate: (id: string, data: any) => void;
}

const NodeConfigSidebar: React.FC<NodeConfigSidebarProps> = ({ node, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<any>(node?.data || {});

  useEffect(() => {
    setFormData(node?.data || {});
  }, [node]);

  if (!node) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, formData);
  };

  const renderAgentFields = () => (
    <>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">System Prompt</label>
        <textarea
          value={formData.system_prompt || ''}
          onChange={(e) => handleChange('system_prompt', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-32 focus:ring-1 focus:ring-primary focus:border-primary custom-scrollbar"
          placeholder="You are a helpful assistant..."
        />
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Primary Model</label>
        <select
          value={formData.provider_model || 'openai/gpt-4o'}
          onChange={(e) => handleChange('provider_model', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary"
        >
          <option value="openai/gpt-4o">GPT-4o (OpenAI)</option>
          <option value="openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
          <option value="anthropic/claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Anthropic)</option>
          <option value="gemini/gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
          <option value="groq/llama3-70b-8192">Llama 3 70B (Groq)</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
          <span>Temperature</span>
          <span>{formData.temperature || 0}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={formData.temperature || 0}
          onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
    </>
  );

  const renderRouterFields = () => (
    <>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Condition Type</label>
        <select
          value={formData.condition_type || 'llm_judge'}
          onChange={(e) => handleChange('condition_type', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500"
        >
          <option value="llm_judge">LLM Judge</option>
          <option value="contains_keyword">Contains Keyword</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Routing Condition</label>
        <textarea
          value={formData.condition || ''}
          onChange={(e) => handleChange('condition', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 custom-scrollbar"
          placeholder="e.g., Did the user ask about billing?"
        />
      </div>
    </>
  );

  const renderToolFields = () => (
    <>
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Connected Tools</label>
        <div className="bg-gray-900 border border-white/10 rounded-lg p-3 text-sm text-gray-400 italic">
          <p className="mb-2">Tools are managed in the Knowledge Hub.</p>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-white not-italic">
              <input type="checkbox" className="rounded text-cyan-500 bg-gray-800 border-gray-700" 
                checked={(formData.tools || []).includes('web_search')}
                onChange={(e) => {
                  const current = formData.tools || [];
                  const updated = e.target.checked ? [...current, 'web_search'] : current.filter((t:string) => t !== 'web_search');
                  handleChange('tools', updated);
                }}
              />
              <span>Web Search</span>
            </label>
            <label className="flex items-center space-x-2 text-white not-italic opacity-50 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded bg-gray-800 border-gray-700" />
              <span>Confluence (Not Connected)</span>
            </label>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="w-80 border-l border-gray-800 bg-[#0a0a0a] flex flex-col h-full shadow-2xl z-20">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
        <h3 className="font-semibold text-white truncate pr-2">
          {formData.label || 'Node Configuration'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-400 mb-1">Node Label</label>
          <input
            type="text"
            value={formData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {node.type === 'agentNode' && renderAgentFields()}
        {node.type === 'routerNode' && renderRouterFields()}
        {node.type === 'toolNode' && renderToolFields()}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <button 
          onClick={handleSave}
          className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center border border-white/5"
        >
          <Save className="w-4 h-4 mr-2" />
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default NodeConfigSidebar;
