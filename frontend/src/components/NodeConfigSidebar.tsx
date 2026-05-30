import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Search, Cpu, ChevronDown, ChevronUp, Database, Check, Zap, Plus, Trash2 } from 'lucide-react';
import { fetchActiveTools, fetchActiveDocumentIntegrations, fetchIntegrationDocuments } from '../api';

interface NodeConfigSidebarProps {
  node: any;
  nodes?: any[];
  edges?: any[];
  onClose: () => void;
  onUpdate: (id: string, data: any) => void;
  onDelete?: (id: string) => void;
}

const NodeConfigSidebar: React.FC<NodeConfigSidebarProps> = ({ node, nodes = [], edges = [], onClose, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState<any>(node?.data || {});
  
  const [activeTools, setActiveTools] = useState<any[]>([]);
  const [activeIntegrations, setActiveIntegrations] = useState<any[]>([]);
  const [integrationDocs, setIntegrationDocs] = useState<Record<string, any[]>>({});

  const [expandedToolGroups, setExpandedToolGroups] = useState<Record<string, boolean>>({});
  const [expandedKnowledgeGroups, setExpandedKnowledgeGroups] = useState<Record<string, boolean>>({});

  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [knowledgeSearchQuery, setKnowledgeSearchQuery] = useState('');
  const [innerDocSearchQuery, setInnerDocSearchQuery] = useState<Record<string, string>>({});

  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(prev => {
        const newWidth = prev - e.movementX;
        return Math.min(Math.max(newWidth, 300), 800);
      });
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(node?.data || {});

  const handleSave = () => {
    onUpdate(node.id, formData);
    onClose();
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

  const renderToolSelection = (prefix: string = '') => {
    const accessKey = prefix ? `${prefix}_tools_access` : 'tools_access';
    const listKey = prefix ? `${prefix}_tools_list` : (node.type === 'toolNode' ? 'tool_id' : 'tools_list');
    
    const defaultAccess = node.type === 'toolNode' ? 'custom' : 'all';
    const access = formData[accessKey] || defaultAccess;
    const selectedTools = formData[listKey] || (node.type === 'toolNode' ? '' : []);

    if (node.type === 'toolNode') {
      return (
        <div className="mb-6 mt-4">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center mb-2">
            <Zap className="w-3 h-3 mr-1 text-emerald-500" />
            Select Tool
          </label>
          <select
            value={selectedTools}
            onChange={(e) => handleChange(listKey, e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="" disabled>Select a tool to execute</option>
            {Object.entries(groupedTools).map(([groupName, tools]) => (
              <optgroup key={groupName} label={groupName} className="bg-gray-800 text-gray-300 font-semibold">
                {tools.map((tool) => (
                  <option key={tool.id} value={tool.id} className="bg-gray-900 text-white font-normal">
                    {tool.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="mb-6 mt-4">
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

        <SegmentedControl
          value={access}
          onChange={(val: string) => handleChange(accessKey, val)}
          options={[
            { label: 'All Tools', value: 'all' },
            { label: 'None', value: 'none' },
            { label: 'Custom', value: 'custom' },
          ]}
        />
        
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
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (allSelected) {
                                handleChange(listKey, selectedTools.filter((id: any) => !tools.find((t: any) => t.id === id)));
                              } else {
                                const newSelected = [...selectedTools];
                                tools.forEach((t: any) => {
                                  if (!newSelected.includes(t.id)) newSelected.push(t.id);
                                });
                                handleChange(listKey, newSelected);
                              }
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${allSelected ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-2 pt-0 border-t border-white/5 bg-black/40">
                          <div className="space-y-1.5 mt-1">
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
      <div className="mb-6 mt-4">
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

  const renderLlmParams = () => {
    const llm_params = formData.llm_params || {};
    return (
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-400 mb-1">Provider</label>
        <select
          value={llm_params.provider || 'gemini'}
          onChange={(e) => handleLlmChange('provider', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none mb-3"
        >
          <option value="gemini">Gemini</option>
          <option value="groq">Groq</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>

        <label className="block text-xs font-medium text-gray-400 mb-1">Model Name</label>
        <input
          type="text"
          value={llm_params.model_name || 'gemini-3.1-pro'}
          onChange={(e) => handleLlmChange('model_name', e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none mb-4"
          placeholder="e.g. gpt-4o, llama3-70b-8192"
        />

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
    );
  };

  const renderTriggerFields = () => (
    <>
      {node.type === 'webhookTriggerNode' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Webhook Secret (Optional)</label>
          <input
            type="text"
            value={formData.secret || ''}
            onChange={(e) => handleChange('secret', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
            placeholder="Validate incoming requests"
          />
        </div>
      )}
      {node.type === 'schedulerTriggerNode' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">Cron Expression</label>
          <input
            type="text"
            value={formData.cron || ''}
            onChange={(e) => handleChange('cron', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
            placeholder="0 * * * *"
          />
        </div>
      )}
    </>
  );

  const renderTransformFields = () => (
    <>
      {(node.type === 'agentNode' || node.type === 'structuredOutputNode' || node.type === 'promptBuilderNode') && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">System Prompt / Template</label>
          <textarea
            value={formData.system_prompt || formData.template || ''}
            onChange={(e) => {
              handleChange('system_prompt', e.target.value);
              handleChange('template', e.target.value);
            }}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-32 focus:ring-1 focus:ring-blue-500 custom-scrollbar outline-none"
            placeholder="You are a helpful assistant..."
          />
        </div>
      )}

      {(node.type === 'agentNode' || node.type === 'structuredOutputNode') && renderLlmParams()}
      {(node.type === 'agentNode') && renderToolSelection()}
      {(node.type === 'agentNode') && renderKnowledgeSelection()}

      {node.type === 'structuredOutputNode' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">JSON Schema (Output format)</label>
          <textarea
            value={formData.schema || ''}
            onChange={(e) => handleChange('schema', e.target.value)}
            className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-gray-300 h-32 focus:ring-1 focus:ring-blue-500 custom-scrollbar outline-none"
            placeholder='{"type": "object", "properties": {...}}'
          />
        </div>
      )}

      {node.type === 'stateTransformNode' && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-2">Operations</label>
          <div className="space-y-2">
            {(formData.operations || []).map((op: any, index: number) => (
              <div key={index} className="flex flex-col bg-black/40 border border-white/5 rounded p-2 gap-2 relative">
                <button 
                  onClick={() => {
                    const ops = [...formData.operations];
                    ops.splice(index, 1);
                    handleChange('operations', ops);
                  }}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                
                <select
                  value={op.op || 'set'}
                  onChange={(e) => {
                    const ops = [...formData.operations];
                    ops[index].op = e.target.value;
                    handleChange('operations', ops);
                  }}
                  className="w-24 bg-gray-900 border border-white/10 rounded p-1 text-xs text-white outline-none"
                >
                  <option value="set">Set</option>
                  <option value="copy">Copy</option>
                  <option value="delete">Delete</option>
                  <option value="append">Append</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Target Key"
                  value={op.key || op.to || ''}
                  onChange={(e) => {
                    const ops = [...formData.operations];
                    ops[index].key = e.target.value;
                    handleChange('operations', ops);
                  }}
                  className="w-full bg-gray-900 border border-white/10 rounded p-1 text-xs text-white outline-none"
                />
                
                {op.op !== 'delete' && (
                  <input
                    type="text"
                    placeholder={op.op === 'copy' ? "Source Key" : "Value"}
                    value={op.value || op.from || ''}
                    onChange={(e) => {
                      const ops = [...formData.operations];
                      ops[index].value = e.target.value;
                      handleChange('operations', ops);
                    }}
                    className="w-full bg-gray-900 border border-white/10 rounded p-1 text-xs text-white outline-none"
                  />
                )}
              </div>
            ))}
            <button 
              onClick={() => {
                const ops = formData.operations || [];
                handleChange('operations', [...ops, { op: 'set', key: '', value: '' }]);
              }}
              className="flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Operation
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderControlFields = () => {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    const outgoingTargets = outgoingEdges.map(e => e.target);
    const incomingEdges = edges.filter(e => e.target === node.id);
    const incomingSources = incomingEdges.map(e => e.source);

    return (
      <>
        {node.type === 'routerNode' && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1">Condition Type</label>
              <select
                value={formData.condition_type || 'llm_judge'}
                onChange={(e) => handleChange('condition_type', e.target.value)}
                className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none mb-3"
              >
                <option value="llm_judge">LLM Judge</option>
                <option value="regex_match">Regex Match</option>
                <option value="state_equals">State Equals</option>
                <option value="contains_keyword">Contains Keyword</option>
              </select>

              {formData.condition_type === 'llm_judge' && renderLlmParams()}

              <label className="block text-xs font-medium text-gray-400 mb-1">Condition Logic</label>
              <textarea
                value={formData.condition || ''}
                onChange={(e) => handleChange('condition', e.target.value)}
                className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-amber-500 custom-scrollbar outline-none"
                placeholder="e.g., Return 'refund' if asking about refunds, else 'support'"
              />
            </div>
            
            <div className="mb-4 p-2 bg-black/30 border border-white/5 rounded-lg">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Detected Outgoing Branches</label>
              {outgoingTargets.length === 0 ? (
                <p className="text-[10px] text-gray-600">No outgoing edges connected yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {outgoingTargets.map(t => (
                    <span key={t} className="text-[10px] bg-amber-900/30 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {node.type === 'loopNode' && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-400 mb-1">Max Iterations</label>
              <input
                type="number"
                value={formData.max_iterations || 5}
                onChange={(e) => handleChange('max_iterations', parseInt(e.target.value))}
                className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
            
            <div className="mb-4 p-2 bg-black/30 border border-white/5 rounded-lg">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Loop Targets (Outgoing Edges)</label>
              {outgoingTargets.length === 0 ? (
                <p className="text-[10px] text-gray-600">Connect edges to define loop/exit.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {outgoingTargets.map(t => (
                    <span key={t} className="text-[10px] bg-amber-900/30 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {node.type === 'mergeNode' && (
          <div className="mb-4 p-2 bg-black/30 border border-white/5 rounded-lg">
            <label className="block text-xs font-semibold text-gray-400 mb-1">Wait For (Incoming Edges)</label>
            {incomingSources.length === 0 ? (
              <p className="text-[10px] text-gray-600">Connect edges to wait for.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {incomingSources.map(s => (
                  <span key={s} className="text-[10px] bg-amber-900/30 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-500 mt-2 italic">Merge nodes automatically wait for all connected incoming paths to complete.</p>
          </div>
        )}
        
        {node.type === 'humanPauseNode' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">Approval Prompt</label>
            <textarea
              value={formData.approval_prompt || ''}
              onChange={(e) => handleChange('approval_prompt', e.target.value)}
              className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white h-24 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 custom-scrollbar outline-none"
              placeholder="e.g. Approve this request?"
            />
          </div>
        )}
      </>
    );
  };

  const renderIntegrateFields = () => (
    <>
      {node.type === 'toolNode' && renderToolSelection()}
      {node.type === 'knowledgeNode' && (
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
              className="w-full bg-gray-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </>
      )}
    </>
  );

  return (
    <div 
      style={{ width: sidebarWidth }}
      className="absolute right-0 top-0 bottom-0 bg-[#0a0a0a] border-l border-gray-800 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right-8 duration-300"
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-2 -translate-x-1/2 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
        onMouseDown={(e) => { e.preventDefault(); isResizing.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
      />
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40 backdrop-blur-md">
        <h3 className="font-semibold text-white truncate pr-2 text-sm tracking-wide flex items-center">
          <span className="text-gray-400 font-mono text-[10px] mr-2 px-1 bg-white/5 rounded border border-white/10">{node.id}</span>
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

        {node.type.includes('Trigger') && renderTriggerFields()}
        {(node.type === 'agentNode' || node.type === 'structuredOutputNode' || node.type === 'promptBuilderNode' || node.type === 'stateTransformNode') && renderTransformFields()}
        {(node.type === 'routerNode' || node.type === 'loopNode' || node.type === 'parallelSplitNode' || node.type === 'mergeNode' || node.type === 'humanPauseNode') && renderControlFields()}
        {(node.type === 'toolNode' || node.type === 'knowledgeNode') && renderIntegrateFields()}
        
      </div>

      <div className="p-4 border-t border-gray-800 bg-black/40 backdrop-blur-md space-y-2">
        <button 
          onClick={handleSave}
          disabled={!hasChanges}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center border ${
            hasChanges 
              ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' 
              : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4 mr-2" />
          Apply Changes
        </button>
        {onDelete && (
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this node?")) {
                onDelete(node.id);
              }
            }}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center border border-red-500/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Node
          </button>
        )}
      </div>
    </div>
  );
};

export default NodeConfigSidebar;
