import React, { useEffect, useState } from 'react';
import { Plus, Server, CheckCircle2, ChevronRight, Settings } from 'lucide-react';
import { fetchAgents, createAgent } from '../api';

const AgentsDashboard: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await fetchAgents();
      setAgents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Agents Dashboard</h2>
          <p className="text-gray-400">Configure and manage your AI agents and fallback chains.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-primary/20 flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Agent
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-xl bg-white/5 h-48 w-full max-w-sm"></div>
          <div className="rounded-xl bg-white/5 h-48 w-full max-w-sm"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-card p-6 flex flex-col group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Server className="w-5 h-5" />
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">
                {agent.description || 'No description provided.'}
              </p>
              
              <div className="border-t border-white/5 pt-4 flex justify-between items-center text-sm">
                <div className="flex items-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Active
                </div>
                <div className="text-gray-500 flex items-center cursor-pointer hover:text-gray-300">
                  Configure <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          ))}
          
          {agents.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/10 rounded-xl">
              <Server className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">No agents deployed</h3>
              <p className="text-gray-500 mt-1">Create your first agent to get started.</p>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <AgentModal onClose={() => setIsModalOpen(false)} onCreated={loadAgents} />
      )}
    </div>
  );
};

// Simplified modal for demonstration
const AgentModal = ({ onClose, onCreated }: any) => {
  const [formData, setFormData] = useState({ name: '', description: '', template: 'general_agent_default' });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await createAgent({
        name: formData.name,
        description: formData.description,
        template_name: formData.template,
        config: {
          provider: "openai",
          model: "gpt-4o",
          system_prompt: "You are a helpful assistant."
        }
      });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-white mb-6">Create New Agent</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Agent Name</label>
            <input 
              required
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" 
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Research Assistant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea 
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" 
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="What does this agent do?"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Template</label>
            <select 
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={formData.template} onChange={e => setFormData({...formData, template: e.target.value})}
            >
              <option value="general_agent_default">General Agent</option>
              <option value="researcher_default">Researcher</option>
              <option value="writer_default">Writer</option>
            </select>
          </div>
          <div className="mt-8 flex justify-end space-x-3 border-t border-white/5 pt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" className="bg-primary hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20">
              Create Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentsDashboard;
