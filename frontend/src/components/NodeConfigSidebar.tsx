import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Search, Cpu, ChevronDown, ChevronUp, Database, Check, Zap } from 'lucide-react';
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

  // Accordion states
  const [expandedToolGroups, setExpandedToolGroups] = useState<Record<string, boolean>>({});
  const [expandedKnowledgeGroups, setExpandedKnowledgeGroups] = useState<Record<string, boolean>>({});

  // Search states
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const [innerDocSearchQuery, setInnerDocSearchQuery] = useState<Record<string, string>>({});

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

  const SegmentedControl = ({ value, onChange, options }: any) => (
    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full mb-3">
      {options.map((opt: any) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
            value === opt.value 
              ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' 
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const renderToolSelection = (prefix: string = '') => {
    const accessKey = prefix ? `${prefix}_tools_access` : 'tools_access';
    const listKey = prefix ? `${prefix}_tools_list` : 'tools_list';
    
    const defaultAccess = node.type === 'toolNode' ? 'custom' : 'all';
    const access = formData[accessKey] || defaultAccess;
    const selectedTools = formData[listKey] || [];

    // Group tools by integration_name
    const groupedTools = useMemo(() => {
      const groups: Record<string, any[]> = {};
      const filtered = toolSearchQuery 
        ? activeTools.filter(t => t.name.toLowerCase().includes(toolSearchQuery.toLowerCase()))
        : activeTools;
        
      filtered.forEach(tool => {
        const groupName = tool.integration_name || 'Global Tools';
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(tool);
      });
      return groups;
    }, [activeTools, toolSearchQuery]);

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center">
            <Zap className="w-3 h-3 mr-1 text-amber-500" />
            Tools Access
          </label>
          {access === 'custom' && selectedTools.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
              {selectedTools.length} selected
            </span>
          )}
        </div>

        {node.type !== 'toolNode' && (
          <SegmentedControl
            value={access}
            onChange={(val: string) => handleChange(accessKey, val)}
            options={[
              { label: 'All Tools', value: 'all' },
              { label: 'None', value: 'none' },
              { label: 'Custom', value: 'custom' },
            ]}
          />
        )}
        
        {access === 'custom' && (
          <div className="bg-gray-900 border border-white/5 rounded-xl p-3 max-h-80 overflow-y-auto custom-scrollbar shadow-inner">
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-2.5 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all mb-3">
              <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search tools..."
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none pl-2 py-1.5 text-xs text-white"
              />
            </div>

            {Object.keys(groupedTools).length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">No tools found.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(groupedTools).map(([groupName, tools]) => {
                  const isExpanded = expandedToolGroups[groupName] ?? true;
                  const groupSelectedCount = tools.filter(t => selectedTools.includes(t.id)).length;
                  const allSelected = groupSelectedCount === tools.length && tools.length > 0;
                  
                  return (
                    <div key={groupName} className="border border-white/5 bg-black/20 rounded-lg overflow-hidden transition-all duration-200">
                      <div 
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setExpandedToolGroups(prev => ({ ...prev, [groupName]: !isExpanded }))}
                      >
                        <div className="flex items-center space-x-2">
                          <Cpu className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-200">{groupName}</span>
                          <span className="text-[10px] text-gray-500">({tools.length})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {groupSelectedCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span>
                          )}
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-2 pt-0 border-t border-white/5 bg-black/40">
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const toolIds = tools.map(t => t.id);
                                let updated;
                                if (allSelected) {
                                  updated = selectedTools.filter((id:any) => !toolIds.includes(id));
                                } else {
                                  updated = [...new Set([...selectedTools, ...toolIds])];
                                }
                                handleChange(listKey, updated);
                              }}
                              className="text-[10px] text-amber-500/80 hover:text-amber-400 font-medium transition-colors"
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {tools.map(tool => {
                              const isChecked = selectedTools.includes(tool.id);
                              return (
                                <label key={tool.id} className="flex items-start space-x-2 text-white text-xs group cursor-pointer p-1 rounded hover:bg-white/5 transition-colors">
                                  <div className={`mt-0.5 relative flex items-center justify-center w-3.5 h-3.5 border rounded transition-colors ${isChecked ? 'border-amber-500 bg-amber-500/20' : 'border-gray-600 group-hover:border-amber-500/50'}`}>
                                    <input 
                                      type="checkbox" 
                                      className="absolute opacity-0 cursor-pointer"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const updated = e.target.checked 
                                          ? [...selectedTools, tool.id] 
                                          : selectedTools.filter((id: any) => id !== tool.id);
                                        handleChange(listKey, updated);
                                      }}
                                    />
                                    {isChecked && <Check className="w-2.5 h-2.5 text-amber-500" />}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`${isChecked ? 'text-amber-100 font-medium' : 'text-gray-300'}`}>{tool.name}</span>
                                    {tool.description && (
                                      <p className="text-[10px] text-gray-500 truncate w-48 mt-0.5">{tool.description}</p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
    
    const defaultAccess = node.type === 'knowledgeNode' ? 'custom' : 'all';
    const access = formData[accessKey] || defaultAccess;
    const knowledgeDict = formData[dictKey] || {};

    const filteredIntegrations = knowledgeSearchQuery
      ? activeIntegrations.filter(i => i.name.toLowerCase().includes(knowledgeSearchQuery.toLowerCase()))
      : activeIntegrations;

    const selectedIntegrationCount = Object.keys(knowledgeDict).length;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center">
            <Database className="w-3 h-3 mr-1 text-indigo-500" />
            Knowledge Access
          </label>
          {access === 'custom' && selectedIntegrationCount > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
              {selectedIntegrationCount} selected
            </span>
          )}
        </div>

        {node.type !== 'knowledgeNode' && (
          <SegmentedControl
            value={access}
            onChange={(val: string) => handleChange(accessKey, val)}
            options={[
              { label: 'All Knowledge', value: 'all' },
              { label: 'None', value: 'none' },
              { label: 'Custom', value: 'custom' },
            ]}
          />
        )}
        
        {access === 'custom' && (
          <div className="bg-gray-900 border border-white/5 rounded-xl p-3 max-h-96 overflow-y-auto custom-scrollbar shadow-inner space-y-3">
            <div className="flex items-center bg-black/50 border border-white/10 rounded-lg px-2.5 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all mb-2">
              <Search className="w-3 h-3 text-gray-500 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search knowledge bases..."
                value={knowledgeSearchQuery}
                onChange={(e) => setKnowledgeSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none pl-2 py-1.5 text-xs text-white"
              />
            </div>

            {filteredIntegrations.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">No knowledge bases found.</p>
            ) : (
              <div className="space-y-2">
                {filteredIntegrations.map(integration => {
                  const isSelected = !!knowledgeDict[integration.id];
                  const selectedDocs = isSelected ? knowledgeDict[integration.id] : [];
                  const isAllDocs = selectedDocs.includes('all');
                  const isExpanded = expandedKnowledgeGroups[integration.id] ?? false;
                  
                  return (
                    <div key={integration.id} className={`border ${isSelected ? 'border-indigo-500/30 bg-indigo-900/10' : 'border-white/5 bg-black/20'} rounded-lg overflow-hidden transition-all duration-200`}>
                      <div className="flex items-center justify-between p-2">
                        <label className="flex items-center space-x-2 text-white text-xs font-medium cursor-pointer flex-1">
                          <div className={`relative flex items-center justify-center w-3.5 h-3.5 border rounded transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-600 hover:border-indigo-500/50'}`}>
                            <input 
                              type="checkbox" 
                              className="absolute opacity-0 cursor-pointer"
                              checked={isSelected}
                              onChange={(e) => {
                                const updated = { ...knowledgeDict };
                                if (e.target.checked) {
                                  updated[integration.id] = ['all'];
                                  loadDocsForIntegration(integration.id.toString());
                                  setExpandedKnowledgeGroups(prev => ({...prev, [integration.id]: true}));
                                } else {
                                  delete updated[integration.id];
                                }
                                handleChange(dictKey, updated);
                              }}
                            />
                            {isSelected && <Check className="w-2.5 h-2.5 text-indigo-400" />}
                          </div>
                          <span className={isSelected ? 'text-indigo-100' : 'text-gray-300'}>{integration.name}</span>
                        </label>
                        
                        {isSelected && (
                          <button 
                            onClick={() => setExpandedKnowledgeGroups(prev => ({ ...prev, [integration.id]: !isExpanded }))}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        )}
                      </div>
                      
                      {isSelected && isExpanded && (
                        <div className="p-2 pt-1 border-t border-white/5 bg-black/40">
                          <div className="flex bg-black/50 rounded p-0.5 mb-2 border border-white/5">
                            <button
                              onClick={() => {
                                const updated = { ...knowledgeDict };
                                updated[integration.id] = ['all'];
                                handleChange(dictKey, updated);
                              }}
                              className={`flex-1 text-[10px] py-1 rounded transition-colors ${isAllDocs ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                              All Documents
                            </button>
                            <button
                              onClick={() => {
                                const updated = { ...knowledgeDict };
                                updated[integration.id] = [];
                                handleChange(dictKey, updated);
                              }}
                              className={`flex-1 text-[10px] py-1 rounded transition-colors ${!isAllDocs ? 'bg-indigo-500/20 text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                            >
                              Specific Docs
                            </button>
                          </div>
                          
                          {!isAllDocs && (
                            <div className="space-y-2">
                              <div className="flex items-center bg-black/50 border border-white/10 rounded px-2 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                <Search className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                                <input 
                                  type="text" 
                                  placeholder="Filter documents..."
                                  value={innerDocSearchQuery[integration.id] || ''}
                                  onChange={(e) => setInnerDocSearchQuery(prev => ({...prev, [integration.id]: e.target.value}))}
                                  className="w-full bg-transparent border-none outline-none pl-1.5 py-1 text-[10px] text-white"
                                />
                              </div>
                              <div className="max-h-32 overflow-y-auto custom-scrollbar bg-black/20 rounded p-1 border border-white/5">
                                {!integrationDocs[integration.id] ? (
                                  <p className="text-[10px] text-gray-500 p-1 text-center animate-pulse">Loading documents...</p>
                                ) : integrationDocs[integration.id].length === 0 ? (
                                  <p className="text-[10px] text-gray-500 p-1 text-center">No documents found.</p>
                                ) : (
                                  (() => {
                                    const q = innerDocSearchQuery[integration.id]?.toLowerCase() || '';
                                    const docs = integrationDocs[integration.id].filter(d => (d.title || d.url_or_path).toLowerCase().includes(q));
                                    
                                    if (docs.length === 0) return <p className="text-[10px] text-gray-500 p-1 text-center">No matches.</p>;
                                    
                                    return docs.map(doc => {
                                      const isDocChecked = selectedDocs.includes(doc.id);
                                      return (
                                        <label key={doc.id} className="flex items-center space-x-2 text-gray-300 text-[10px] p-1 hover:bg-white/5 rounded cursor-pointer group transition-colors">
                                          <div className={`relative flex items-center justify-center w-3 h-3 border rounded transition-colors ${isDocChecked ? 'border-indigo-500 bg-indigo-500/20' : 'border-gray-600 group-hover:border-indigo-500/50'}`}>
                                            <input 
                                              type="checkbox" 
                                              className="absolute opacity-0 cursor-pointer"
                                              checked={isDocChecked}
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
                                            {isDocChecked && <Check className="w-2 h-2 text-indigo-400" />}
                                          </div>
                                          <span className={`truncate flex-1 ${isDocChecked ? 'text-indigo-200 font-medium' : ''}`}>{doc.title || doc.url_or_path}</span>
                                        </label>
                                      );
                                    });
                                  })()
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-32 focus:ring-1 focus:ring-primary focus:border-primary custom-scrollbar outline-none"
            placeholder="You are a helpful assistant..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Primary Model</label>
          <select
            value={llm_params.primary_model || 'gemini/gemini-3.1-pro'}
            onChange={(e) => handleLlmChange('primary_model', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
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
        <div className="mb-6">
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
        className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
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
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none"
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
        className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 custom-scrollbar outline-none"
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
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
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
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 custom-scrollbar outline-none"
          placeholder="e.g., Did the user ask about billing?"
        />
      </div>
    </>
  );

  return (
    <div className="w-96 border-l border-gray-800 bg-[#0a0a0a] flex flex-col h-full shadow-2xl z-20">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <h3 className="font-semibold text-white truncate pr-2 text-sm tracking-wide">
          {formData.label || 'Node Configuration'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-gray-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        <div className="mb-6">
          <label className="block text-xs font-medium text-gray-400 mb-1">Node Label</label>
          <input
            type="text"
            value={formData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-gray-500 outline-none transition-all shadow-inner"
          />
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-6"></div>

        {node.type === 'userMessageNode' && renderUserMessageFields()}
        {node.type === 'knowledgeNode' && renderKnowledgeFields()}
        {node.type === 'humanPauseNode' && renderHumanPauseFields()}
        {(node.type === 'agentNode' || node.type === 'reactAgentNode' || node.type === 'llmNode') && renderAgentFields()}
        {node.type === 'routerNode' && renderRouterFields()}
        {node.type === 'toolNode' && renderToolSelection()}
      </div>

      <div className="p-4 border-t border-gray-800 bg-black/40 backdrop-blur-md">
        <button 
          onClick={handleSave}
          className="w-full bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]"
        >
          <Save className="w-4 h-4 mr-2" />
          Apply Changes
        </button>
      </div>
    </div>
  );
};

export default NodeConfigSidebar;
