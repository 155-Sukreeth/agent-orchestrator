import React, { useEffect, useState } from 'react';
import { Plus, Network, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { fetchWorkflows } from '../api';
import { useNavigate } from 'react-router-dom';

const AgentsDashboard: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setError(null);
      const data = await fetchWorkflows();
      setWorkflows(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load deployed agents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Deployed Agents</h2>
          <p className="text-gray-400">Manage and configure your production workflows and agents.</p>
        </div>
        <button 
          onClick={() => navigate('/workflows/new')}
          className="bg-primary hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <h3 className="font-semibold mb-1 flex items-center">
            <Settings className="w-4 h-4 mr-2" /> Error
          </h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-xl bg-white/5 h-48 w-full max-w-sm"></div>
          <div className="rounded-xl bg-white/5 h-48 w-full max-w-sm"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {workflows.map((wf) => (
            <div key={wf.id} className="glass-card p-6 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Network className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                {wf.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                {wf.description || 'No description provided.'}
              </p>
              
              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-sm">
                <div className="flex items-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Active
                </div>
                <div 
                  className="text-gray-500 flex items-center cursor-pointer hover:text-gray-300"
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                >
                  Configure <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          ))}
          
          {workflows.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/10 rounded-xl">
              <Network className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">No agents deployed</h3>
              <p className="text-gray-500 mt-1">Create your first agent to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentsDashboard;
