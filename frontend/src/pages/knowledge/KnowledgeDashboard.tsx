import React, { useState } from 'react';
import { Search, Globe, RefreshCw, MoreVertical, FileText, Layout, Share2, UploadCloud, Cpu, Database, Github, FileBox, Zap } from 'lucide-react';

const mockSources = [
  { id: '1', name: 'Internal Documentation', type: 'confluence', status: 'synced', lastSync: '10 mins ago', itemType: 'Pages', count: 142 },
  { id: '2', name: 'Company Website', type: 'web_crawler', status: 'synced', lastSync: '2 hours ago', itemType: 'URLs', count: 86 },
  { id: '3', name: 'Postgres DB', type: 'postgres', status: 'error', lastSync: '1 day ago', itemType: 'Tables', count: 0 },
];

const mockItems = [
  { id: 'i1', title: 'Employee Onboarding Guide', url: '/hr/onboarding', chunks: 14 },
  { id: 'i2', title: 'Q3 Financial Goals', url: '/finance/q3', chunks: 8 },
  { id: 'i3', title: 'Engineering Best Practices', url: '/eng/practices', chunks: 32 },
  { id: 'i4', title: 'Vacation Policy 2026', url: '/hr/vacation', chunks: 4 },
];

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
  const [activeSourceId, setActiveSourceId] = useState(mockSources[0].id);

  const activeSource = mockSources.find(s => s.id === activeSourceId);
  const ActiveIcon = activeSource ? getIconForType(activeSource.type) : FileBox;

  return (
    <div className="flex h-full">
      {/* Connected Sources Sidebar */}
      <div className="w-64 border-r border-white/5 bg-gray-950/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-gray-200">Connected Sources</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {mockSources.map((source) => {
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
                <div className="relative">
                  <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
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
                        {activeSource.status === 'error' ? 'Sync Failed' : 'Synced'} {activeSource.lastSync}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-medium rounded-lg transition-colors border border-white/10">
                    <RefreshCw className="w-4 h-4 mr-2 text-gray-400" />
                    Force Resync
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Stats Strip */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Total {activeSource.itemType}</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1">{activeSource.count}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Total Vector Chunks</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1">{activeSource.count * 12}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-gray-400">Last Synced</p>
                  <p className="text-2xl font-semibold text-gray-100 mt-1 text-sm">{activeSource.lastSync}</p>
                </div>
              </div>
            </div>

            {/* Extracted Items Table */}
            <div className="flex-1 overflow-auto p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-200">Extracted {activeSource.itemType}</h3>
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
                      <th className="px-6 py-4 font-medium">Title / Name</th>
                      <th className="px-6 py-4 font-medium">Path / URL</th>
                      <th className="px-6 py-4 font-medium text-right">Vector Chunks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                        <td className="px-6 py-4 font-medium text-gray-200 group-hover:text-indigo-300 transition-colors">
                          {item.title}
                        </td>
                        <td className="px-6 py-4">
                          {item.url}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-white/10">
                            {item.chunks} chunks
                          </span>
                        </td>
                      </tr>
                    ))}
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
