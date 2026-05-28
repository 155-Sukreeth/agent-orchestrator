import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Database, Plus, ChevronRight, CheckCircle2 } from 'lucide-react';

export interface StagedSource {
  id: string;
  type: string;
  name: string;
  config: any;
}

import { createIntegration } from '../../../api';

const KnowledgeLayout: React.FC = () => {
  const [stagedSources, setStagedSources] = useState<StagedSource[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isCatalog = location.pathname.includes('/catalog');

  const handleStageSource = (source: StagedSource) => {
    setStagedSources((prev) => [...prev, source]);
  };

  const handleProceed = async () => {
    if (stagedSources.length === 0) return;
    setIsSyncing(true);
    
    try {
      for (const source of stagedSources) {
        await createIntegration({
          name: source.name,
          type: source.type,
          category: 'web', // Defaulting for now
          config: source.config
        });
      }
      setStagedSources([]);
      navigate('/knowledge/dashboard');
    } catch (err) {
      console.error("Failed to sync sources", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 glass z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-100">Knowledge Hub</h1>
            <p className="text-xs text-gray-400">Connect and manage your data sources</p>
          </div>
        </div>
        
        {!isCatalog && (
          <button
            onClick={() => navigate('/knowledge/catalog')}
            className="flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Source
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
          <Outlet context={{ handleStageSource }} />
        </div>

        {/* Right Sidebar for Staged Sources (Only shown on Catalog page) */}
        {isCatalog && (
          <div 
            className={`w-80 flex flex-col border-l border-white/10 glass transition-transform duration-300 ${
              stagedSources.length > 0 ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0'
            }`}
          >
            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-gray-200 flex items-center">
                Pending Connections
                <span className="ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs">
                  {stagedSources.length}
                </span>
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {stagedSources.map((source, index) => (
                <div key={index} className="flex items-center p-3 rounded-lg bg-white/5 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-3 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{source.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{source.type}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-gray-950/50">
              <button
                onClick={handleProceed}
                disabled={isSyncing}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Proceed & Sync'}
                {!isSyncing && <ChevronRight className="w-4 h-4 ml-1" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeLayout;
