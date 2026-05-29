import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { fetchActiveTools, fetchActiveDocumentIntegrations, fetchIntegrationDocuments } from '../api';

interface NodeConfigSidebarProps {
  node: any;
  onClose: () => void;
  onUpdate: (id: string, data: any) => void;
}

const NodeConfigSidebar: React.FC<NodeConfigSidebarProps> = ({ node, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<any>(node?.data || {});
  
  const [activeTools, setActiveTools] = useState<any[]>([]);
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const [integrationDocs, setIntegrationDocs] = useState<Record<string, any[]>>({});

  useEffect(() => {
    setFormData(node?.data || {});
  }, [node]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tools, integrations] = await Promise.all([
          fetchActiveTools(),
          fetchActiveDocumentIntegrations()
        ]);
        setActiveTools(tools);
        setActiveIntegrations(integrations);
      } catch (err) {
        console.error("Failed to load active tools/integrations", err);
      }
    };
    loadData();
  }, []);

  const loadDocsForIntegration = async (id: string) => {
    if (integrationDocs[id]) return;
    try {
      const docs = await fetchIntegrationDocuments(id);
      setIntegrationDocs(prev => ({ ...prev, [id]: docs }));
    } catch (err) {
      console.error(err);
    }
  };

  if (!node) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(node.id, formData);
  };

  const handleLlmChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      llm_params: {
        ...(prev.llm_params || {}),
        [field]: value
      }
    }));
  };

  const renderToolSelection = (prefix: string = '') => {
    const accessKey = prefix ? `${prefix}_tools_access` : 'tools_access';
    const listKey = prefix ? `${prefix}_tools_list` : 'tools_list';
    
    // For tool node, we force custom selection. For agents, default is 'all'
    const defaultAccess = node.type === 'toolNode' ? 'custom' : 'all';
    const access = formData[accessKey] || defaultAccess;
    const selectedTools = formData[listKey] || [];

    return (
      <div className="mb-4">
        {node.type !== 'toolNode' && (
          <>
            <label className="block text-xs font-medium text-gray-400 mb-1">Tools Access</label>
            <select
              value={access}
              onChange={(e) => handleChange(accessKey, e.target.value)}
              className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary mb-2"
            >
              <option value="all">All Active Tools</option>
              <option value="none">No Tools</option>
              <option value="custom">Custom Selection</option>
            </select>
          </>
        )}
        
        {access === 'custom' && (
          <div className="bg-gray-900 border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar">
            {node.type === 'toolNode' && <label className="block text-xs font-medium text-gray-400 mb-2">Selected Tools</label>}
            {activeTools.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No active tools found.</p>
            ) : (
              <div className="space-y-2">
                {activeTools.map(tool => (
                  <label key={tool.id} className="flex items-center space-x-2 text-white text-sm">
                    <input 
                      type="checkbox" 
                      className="rounded text-cyan-500 bg-gray-800 border-gray-700" 
                      checked={selectedTools.includes(tool.id)}
                      onChange={(e) => {
                        const updated = e.target.checked 
                          ? [...selectedTools, tool.id] 
                          : selectedTools.filter((id: any) => id !== tool.id);
                        handleChange(listKey, updated);
                      }}
                    />
                    <span>{tool.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderKnowledgeSelection = (prefix: string = '') => {
    const accessKey = prefix ? `${prefix}_knowledge_access` : 'knowledge_access';
    const dictKey = prefix ? `${prefix}_knowledge_dict` : 'knowledge_dict';
    
    // For knowledge node, force custom selection
    const defaultAccess = node.type === 'knowledgeNode' ? 'custom' : 'all';
    const access = formData[accessKey] || defaultAccess;
    const knowledgeDict = formData[dictKey] || {};

    return (
      <div className="mb-4">
        {node.type !== 'knowledgeNode' && (
          <>
            <label className="block text-xs font-medium text-gray-400 mb-1">Knowledge Access</label>
            <select
              value={access}
              onChange={(e) => handleChange(accessKey, e.target.value)}
              className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 mb-2"
            >
              <option value="all">All Knowledge Bases</option>
              <option value="none">No Knowledge</option>
              <option value="custom">Custom Selection</option>
            </select>
          </>
        )}
        
        {access === 'custom' && (
          <div className="bg-gray-900 border border-white/10 rounded-lg p-3 max-h-64 overflow-y-auto custom-scrollbar space-y-3">
            {node.type === 'knowledgeNode' && <label className="block text-xs font-medium text-gray-400 mb-2">Selected Knowledge</label>}
            {activeIntegrations.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No active knowledge bases found.</p>
            ) : (
              activeIntegrations.map(integration => {
                const isSelected = !!knowledgeDict[integration.id];
                const selectedDocs = isSelected ? knowledgeDict[integration.id] : [];
                const isAllDocs = selectedDocs.includes('all');
                
                return (
                  <div key={integration.id} className="border border-white/5 rounded p-2">
                    <label className="flex items-center space-x-2 text-white text-sm font-medium mb-1">
                      <input 
                        type="checkbox" 
                        className="rounded text-indigo-500 bg-gray-800 border-gray-700" 
                        checked={isSelected}
                        onChange={(e) => {
                          const updated = { ...knowledgeDict };
                          if (e.target.checked) {
                            updated[integration.id] = ['all'];
                            loadDocsForIntegration(integration.id.toString());
                          } else {
                            delete updated[integration.id];
                          }
                          handleChange(dictKey, updated);
                        }}
                      />
                      <span>{integration.name}</span>
                    </label>
                    
                    {isSelected && (
                      <div className="ml-6 mt-2 space-y-2">
                        <select
                          value={isAllDocs ? 'all' : 'specific'}
                          onChange={(e) => {
                            const updated = { ...knowledgeDict };
                            updated[integration.id] = e.target.value === 'all' ? ['all'] : [];
                            handleChange(dictKey, updated);
                          }}
                          className="w-full bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
                        >
                          <option value="all">All Documents</option>
                          <option value="specific">Specific Documents...</option>
                        </select>
                        
                        {!isAllDocs && (
                          <div className="max-h-32 overflow-y-auto custom-scrollbar bg-black/20 rounded p-1">
                            {!integrationDocs[integration.id] ? (
                              <p className="text-xs text-gray-500 p-1">Loading documents...</p>
                            ) : integrationDocs[integration.id].length === 0 ? (
                              <p className="text-xs text-gray-500 p-1">No documents found.</p>
                            ) : (
                              integrationDocs[integration.id].map(doc => (
                                <label key={doc.id} className="flex items-center space-x-2 text-gray-300 text-xs p-1 hover:bg-white/5 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="rounded bg-gray-800 border-gray-700" 
                                    checked={selectedDocs.includes(doc.id)}
                                    onChange={(e) => {
                                      const updated = { ...knowledgeDict };
                                      const currentDocs = updated[integration.id] || [];
                                      if (e.target.checked) {
                                        updated[integration.id] = [...currentDocs, doc.id];
                                      } else {
                                        updated[integration.id] = currentDocs.filter((id:any) => id !== doc.id);
                                      }
                                      handleChange(dictKey, updated);
                                    }}
                                  />
                                  <span className="truncate">{doc.title || doc.url_or_path}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAgentFields = () => {
    const llm_params = formData.llm_params || {};
    return (
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
            value={llm_params.primary_model || 'gemini/gemini-3.1-pro'}
            onChange={(e) => handleLlmChange('primary_model', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary"
          >
            <option value="gemini/gemini-3.1-pro">Gemini 3.1 Pro</option>
            <option value="gemini/gemini-3.5-flash">Gemini 3.5 Flash</option>
            <option value="gemini/gemini-2.5-pro">Gemini 2.5 Pro</option>
            <option value="gemini/gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini/gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
            <option value="gemini/gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
            <option value="groq/llama3-70b-8192">Llama 3 70B (Groq)</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1 flex justify-between">
            <span>Temperature</span>
            <span>{llm_params.temperature || 0}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={llm_params.temperature || 0}
            onChange={(e) => handleLlmChange('temperature', parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        
        {renderToolSelection()}
        {renderKnowledgeSelection()}
      </>
    );
  };

  const renderUserMessageFields = () => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-400 mb-1">State Key Mapping</label>
      <input
        type="text"
        value={formData.input_key || 'message'}
        onChange={(e) => handleChange('input_key', e.target.value)}
        className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500"
        placeholder="e.g. user_message"
      />
      <p className="text-xs text-gray-500 mt-2">The key in LangGraph state where this input will be stored.</p>
    </div>
  );

  const renderKnowledgeFields = () => (
    <>
      {renderKnowledgeSelection()}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Top K Results</label>
        <input
          type="number"
          min="1"
          max="20"
          value={formData.top_k || 3}
          onChange={(e) => handleChange('top_k', parseInt(e.target.value))}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    </>
  );

  const renderHumanPauseFields = () => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-400 mb-1">Approval Prompt</label>
      <textarea
        value={formData.approval_prompt || ''}
        onChange={(e) => handleChange('approval_prompt', e.target.value)}
        className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 custom-scrollbar"
        placeholder="e.g. Approve this refund request?"
      />
    </div>
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
      {renderToolSelection()}
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

        {node.type === 'userMessageNode' && renderUserMessageFields()}
        {node.type === 'knowledgeNode' && renderKnowledgeFields()}
        {node.type === 'humanPauseNode' && renderHumanPauseFields()}
        {(node.type === 'agentNode' || node.type === 'reactAgentNode' || node.type === 'llmNode') && renderAgentFields()}
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
