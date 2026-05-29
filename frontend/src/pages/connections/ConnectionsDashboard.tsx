import React, { useState, useEffect } from 'react';
import { fetchConnections, createConnection, deleteConnection } from '../../api';
import { Slack, Send, Trello, FileText, HardDrive, Globe, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const APP_TYPES = [
  { id: 'slack', name: 'Slack', icon: Slack, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'jira', name: 'Jira', icon: Trello, color: 'text-blue-500', bg: 'bg-blue-600/20' },
  { id: 'confluence', name: 'Confluence', icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { id: 'google_drive', name: 'Google Drive', icon: HardDrive, color: 'text-green-400', bg: 'bg-green-500/20' },
  { id: 'custom_webhook', name: 'Custom Webhook', icon: Globe, color: 'text-gray-400', bg: 'bg-gray-500/20' }
];

const ConnectionsDashboard: React.FC = () => {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCredentials, setNewCredentials] = useState<any>({});

  const loadConnections = async () => {
    setLoading(true);
    try {
      const data = await fetchConnections();
      setConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleAdd = async () => {
    if (!newName || !addType) return;
    try {
      let parsedCreds = { ...newCredentials };
      
      // If Google Drive, try to parse the JSON block
      if (addType === 'google_drive' && typeof parsedCreds.service_account_json === 'string') {
        try {
          parsedCreds.service_account_json = JSON.parse(parsedCreds.service_account_json);
        } catch (e) {
           alert("Invalid Service Account JSON. Please paste a valid JSON object.");
           return;
        }
      }

      await createConnection({
        name: newName,
        type: addType,
        credentials: parsedCreds,
        is_active: true
      });
      setIsAdding(false);
      setNewName('');
      setNewCredentials({});
      loadConnections();
    } catch (err) {
      alert("Error adding connection: " + (err as any).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await deleteConnection(id);
      loadConnections();
    } catch (err) {
      console.error(err);
    }
  };

  const getGroupedConnections = (typeId: string) => {
    return connections.filter(c => c.type === typeId);
  };

  const PasswordInput = ({ placeholder, value, onChange }: { placeholder: string, value: string, onChange: (e: any) => void }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative mb-2">
        <input 
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white pr-10"
        />
        <button 
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  };

  const renderSpecificFields = () => {
    switch(addType) {
      case 'slack':
        return (
          <>
            <PasswordInput 
              placeholder="Bot Token (xoxb-...)"
              value={newCredentials.bot_token || ''}
              onChange={e => setNewCredentials({...newCredentials, bot_token: e.target.value})}
            />
            <PasswordInput 
              placeholder="Signing Secret"
              value={newCredentials.signing_secret || ''}
              onChange={e => setNewCredentials({...newCredentials, signing_secret: e.target.value})}
            />
          </>
        );
      case 'telegram':
        return (
          <PasswordInput 
            placeholder="Bot Token"
            value={newCredentials.bot_token || ''}
            onChange={e => setNewCredentials({...newCredentials, bot_token: e.target.value})}
          />
        );
      case 'jira':
      case 'confluence':
        return (
          <>
            <input 
              type="text" 
              placeholder="Base URL (e.g. https://your-domain.atlassian.net)"
              value={newCredentials.base_url || ''}
              onChange={e => setNewCredentials({...newCredentials, base_url: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white mb-2"
            />
            <input 
              type="text" 
              placeholder="Email Address"
              value={newCredentials.email || ''}
              onChange={e => setNewCredentials({...newCredentials, email: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white mb-2"
            />
            <PasswordInput 
              placeholder="API Token"
              value={newCredentials.api_token || ''}
              onChange={e => setNewCredentials({...newCredentials, api_token: e.target.value})}
            />
          </>
        );
      case 'custom_webhook':
        return (
          <>
            <input 
              type="text" 
              placeholder="Webhook URL"
              value={newCredentials.webhook_url || ''}
              onChange={e => setNewCredentials({...newCredentials, webhook_url: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white mb-2"
            />
            <input 
              type="text" 
              placeholder="Auth Header Name (Optional - e.g. Authorization)"
              value={newCredentials.auth_header_name || ''}
              onChange={e => setNewCredentials({...newCredentials, auth_header_name: e.target.value})}
              className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white mb-2"
            />
            <PasswordInput 
              placeholder="Auth Header Value (Optional - e.g. Bearer 123)"
              value={newCredentials.auth_header_value || ''}
              onChange={e => setNewCredentials({...newCredentials, auth_header_value: e.target.value})}
            />
          </>
        );
      case 'google_drive':
        return (
          <textarea
            placeholder='Service Account JSON (Paste entire file contents)'
            value={newCredentials.service_account_json || ''}
            onChange={e => setNewCredentials({...newCredentials, service_account_json: e.target.value})}
            className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white h-24 font-mono mb-2"
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Loading connections...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Connected Apps</h2>
        <p className="text-gray-400">Configure third-party services for your agents to use as delivery channels or external tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {APP_TYPES.map(appType => {
          const group = getGroupedConnections(appType.id);
          const isExpanded = expandedType === appType.id;
          const Icon = appType.icon;

          return (
            <div key={appType.id} className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all">
              <div 
                className="p-5 cursor-pointer hover:bg-white/5 flex items-center justify-between"
                onClick={() => setExpandedType(isExpanded ? null : appType.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${appType.bg}`}>
                    <Icon className={`w-5 h-5 ${appType.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{appType.name}</h3>
                    <p className="text-xs text-gray-400">{group.length} configured</p>
                  </div>
                </div>
                <div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/5 bg-black/40 p-4">
                  {group.length === 0 ? (
                    <p className="text-sm text-gray-500 italic mb-4">No connections configured yet.</p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {group.map(conn => (
                        <div key={conn.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                          <div>
                            <p className="text-sm font-medium text-gray-200">{conn.name}</p>
                            <p className="text-xs text-green-400/80 font-mono mt-1 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              Authenticated
                            </p>
                          </div>
                          <button onClick={() => handleDelete(conn.id)} className="p-1.5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdding && addType === appType.id ? (
                    <div className="bg-gray-800 p-3 rounded-lg border border-white/10 mt-2">
                      <input 
                        type="text" 
                        placeholder={`Connection Name (e.g. Marketing ${appType.name})`}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm text-white mb-4"
                      />
                      
                      <div className="mb-4 space-y-2 border-t border-white/10 pt-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{appType.name} Credentials</p>
                        {renderSpecificFields()}
                      </div>

                      <div className="flex space-x-2">
                        <button onClick={handleAdd} className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 py-1.5 rounded text-sm font-medium transition-colors">Save Connection</button>
                        <button 
                          onClick={() => {
                            setIsAdding(false);
                            setNewCredentials({});
                          }} 
                          className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setAddType(appType.id);
                        setIsAdding(true);
                        setNewCredentials({});
                      }}
                      className="w-full py-2 flex items-center justify-center space-x-2 text-sm font-medium text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 rounded-lg transition-colors border border-pink-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Connection</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectionsDashboard;
