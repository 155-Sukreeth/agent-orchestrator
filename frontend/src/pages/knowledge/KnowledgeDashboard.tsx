import React, { useState, useEffect } from 'react';
import { Search, Globe, RefreshCw, MoreVertical, FileText, Layout, Share2, UploadCloud, Cpu, Database, Github, FileBox, Zap, Trash2 } from 'lucide-react';
import { fetchIntegrations, fetchIntegrationDocuments, fetchIntegrationTools, toggleToolActive, crawlIntegration, deleteIntegration } from '../../api';

const getIconForType = (type: string) => {
  switch (type) {
    case 'web_crawler': return Globe;
    case 'file_upload': return UploadCloud;
    case 'confluence': return Layout;
    case 'notion': return FileText;
    case 'sharepoint': return Share2;
    case 'mcp': return Cpu;
    case 'postgres': return Database;
    case 'github': return Github;
    case 'api_tool': return Zap;
    default: return FileBox;
  }
};

const KnowledgeDashboard: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCrawling, setIsCrawling] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    if (activeSourceId) {
      loadDocuments(activeSourceId);
      cleanup = setupSSE(activeSourceId);
    }
    return () => {
      cleanup();
    };
  }, [activeSourceId]);

  const loadIntegrations = async () => {
    try {
      const data = await fetchIntegrations();
      setSources(data);
      if (data.length > 0 && !activeSourceId) {
        setActiveSourceId(data[0].id);
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const loadDocuments = async (id: number) => {
    try {
      const source = sources.find(s => s.id === id);
      if (source && (source.type === 'mcp' || source.type === 'api_tool')) {
        const data = await fetchIntegrationTools(id.toString());
        setItems(data.map((d: any) => ({
          id: d.id,
          title: d.name,
          url: d.description || 'No description',
          chunks: null,
          isActive: d.is_active
        })));
      } else {
        const data = await fetchIntegrationDocuments(id.toString());
        setItems(data.map((d: any) => ({
          id: d.id,
          title: d.title,
          url: d.url_or_path,
          chunks: d.metadata_json?.chunks || 0,
          isActive: d.is_active
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const setupSSE = (id: number) => {
    const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
    const source = new EventSource(`${API_URL}/api/integrations/${id}/stream`);

    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'sync_start') {
        setIsCrawling(true);
      } else if (data.type === 'sync_progress') {
        setItems(prev => {
          const doc = data.document;
          const newItem = {
            id: doc.id,
            title: doc.title,
            url: doc.url,
            chunks: doc.chunks,
            isActive: doc.isActive
          };
          // Append if not exists, otherwise update
          const exists = prev.find(i => i.id === newItem.id);
          if (exists) {
            return prev.map(i => i.id === newItem.id ? newItem : i);
          }
          return [newItem, ...prev];
        });
      } else if (data.type === 'sync_complete') {
        setIsCrawling(false);
        loadIntegrations(); // Refresh source statuses
        loadDocuments(id);  // Refresh tools/documents list automatically
      } else if (data.type === 'sync_error') {
        setIsCrawling(false);
        alert(`Synchronization failed: ${data.error}`);
        loadIntegrations();
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  };

  const handleCrawl = async () => {
    if (!activeSourceId) return;
    try {
      setIsCrawling(true);
      
      // Optimistically update status
      setSources(sources.map(s => s.id === activeSourceId ? { ...s, status: 'syncing' } : s));
      
      await crawlIntegration(activeSourceId.toString());
    } catch (err) {
      console.error(err);
      setIsCrawling(false);
    }
  };

  const handleDelete = async () => {
    if (!activeSourceId) return;
    if (!confirm("Are you sure you want to permanently delete this integration and all its chunks?")) return;
    
    try {
      await deleteIntegration(activeSourceId.toString());
      setActiveSourceId(null);
      loadIntegrations();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleItemActive = async (id: string | number) => {
    const activeSrc = sources.find(s => s.id === activeSourceId);
    if (activeSrc && (activeSrc.type === 'mcp' || activeSrc.type === 'api_tool')) {
      // Toggle tool
      try {
        const res = await toggleToolActive(id as number);
        setItems(items.map(item => item.id === id ? { ...item, isActive: res.is_active } : item));
      } catch (err) {
        console.error("Failed to toggle tool", err);
      }
    } else {
      setItems(items.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item));
      // TODO: Update backend with isActive toggle for documents
    }
  };

  const activeSource = sources.find(s => s.id === activeSourceId);
  const ActiveIcon = activeSource ? getIconForType(activeSource.type) : FileBox;

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading sources...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Connected Sources Sidebar */}
      <div className="w-64 border-r border-white/5 bg-gray-950/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-gray-200">Connected Sources</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sources.map((source) => {
            const Icon = getIconForType(source.type);
            const isActive = activeSourceId === source.id;
            return (
              <button
                key={source.id}
                onClick={() => setActiveSourceId(source.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-all ${
                  isActive ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="relative mr-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-950 ${
                    source.status === 'synced' ? 'bg-emerald-500' : 
                    source.status === 'syncing' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="min-w-0 text-left flex-1">
                  <p className={`text-sm truncate font-medium ${isActive ? 'text-indigo-300' : 'text-gray-200'}`}>
                    {source.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">{source.type}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSource ? (
          <>
            {/* Details Header */}
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <ActiveIcon className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-100">{activeSource.name}</h2>
                    <div className="flex items-center mt-1 space-x-4 text-sm text-gray-400">
                      <span className="capitalize">{activeSource.type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${activeSource.status === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                        {activeSource.status === 'error' ? 'Sync Failed' : 'Synced'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {(activeSource.status === 'syncing' || isCrawling) && (
                    <div className="flex items-center px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium rounded-lg mr-2 animate-pulse">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Listening to Stream...
                    </div>
                  )}
                  <button 
                    onClick={handleCrawl}
                    disabled={activeSource.status === 'syncing' || isCrawling}
                    className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-white/10 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 mr-2 text-gray-400 ${(activeSource.status === 'syncing' || isCrawling) ? 'animate-spin' : ''}`} />
                    Force Resync
                  </button>
                  <button onClick={handleDelete} className="flex items-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors border border-red-500/20">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Source
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Strip */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Total Items</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1">{items.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Total Vector Chunks</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1">{items.reduce((acc, curr) => acc + (curr.chunks || 0), 0)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Last Synced</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1 text-sm">
                    {activeSource.last_sync ? new Date(activeSource.last_sync).toLocaleString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric', 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    }) : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Items Table */}
            <div className="flex-1 overflow-auto p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-200">
                  {activeSource.type === 'mcp' || activeSource.type === 'api_tool' ? 'Extracted Tools' : 'Extracted Documents'}
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search documents..." 
                    className="pl-9 pr-4 py-2 bg-gray-900 border border-white/10 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors w-64"
                  />
                </div>
              </div>

              <div className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-900 border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-medium">{activeSource.type === 'mcp' || activeSource.type === 'api_tool' ? 'Tool Name' : 'Title / Name'}</th>
                      <th className="px-6 py-4 font-medium">{activeSource.type === 'mcp' || activeSource.type === 'api_tool' ? 'Description' : 'Path / URL'}</th>
                      <th className="px-6 py-4 font-medium text-center">Active</th>
                      {activeSource.type !== 'mcp' && activeSource.type !== 'api_tool' && (
                        <th className="px-6 py-4 font-medium text-right">Vector Chunks</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4 font-medium text-gray-200 group-hover:text-indigo-300 transition-colors cursor-pointer">
                          {item.title}
                        </td>
                        <td className="px-6 py-4 cursor-pointer">
                          {item.url}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleItemActive(item.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${item.isActive ? 'bg-emerald-500' : 'bg-gray-700'}`}
                          >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        {item.chunks !== null && (
                          <td className="px-6 py-4 text-right cursor-pointer">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-white/10">
                              {item.chunks} chunks
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                          {activeSource.type === 'mcp' || activeSource.type === 'api_tool' 
                            ? 'No tools found. Click "Force Resync" to fetch.' 
                            : 'No documents found. Click "Force Resync" to crawl.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a source from the sidebar to view details
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeDashboard;
