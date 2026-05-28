import React, { useState } from 'react';
import { X, Globe, UploadCloud, Layout, FileText, Share2, Cpu, Database, Github, Zap } from 'lucide-react';

export type SourceCategory = 'web' | 'internal' | 'code';
export type SourceType = 'web_crawler' | 'file_upload' | 'confluence' | 'notion' | 'sharepoint' | 'mcp' | 'postgres' | 'github' | 'api_tool';

export interface CatalogItem {
  id: SourceType;
  name: string;
  category: SourceCategory;
  icon: React.ElementType;
  description: string;
}

export const catalogItems: CatalogItem[] = [
  { id: 'web_crawler', name: 'Web Crawler', category: 'web', icon: Globe, description: 'Crawl websites and extract text into vectors.' },
  { id: 'file_upload', name: 'File Upload', category: 'internal', icon: UploadCloud, description: 'Upload PDFs, Word, and text documents.' },
  { id: 'confluence', name: 'Confluence', category: 'internal', icon: Layout, description: 'Connect to your Atlassian workspace.' },
  { id: 'notion', name: 'Notion', category: 'internal', icon: FileText, description: 'Sync Notion pages and databases.' },
  { id: 'sharepoint', name: 'SharePoint', category: 'internal', icon: Share2, description: 'Index documents from SharePoint.' },
  { id: 'mcp', name: 'MCP Servers', category: 'code', icon: Cpu, description: 'Connect Model Context Protocol tools.' },
  { id: 'postgres', name: 'PostgreSQL', category: 'code', icon: Database, description: 'Index database tables and schemas.' },
  { id: 'github', name: 'GitHub', category: 'code', icon: Github, description: 'Index code repositories and issues.' },
  { id: 'api_tool', name: 'Custom API Tool', category: 'code', icon: Zap, description: 'Connect a single REST API endpoint as an agent tool.' },
];

interface ConnectSourceModalProps {
  source: CatalogItem | null;
  onClose: () => void;
  onAdd: (config: any) => void;
}

const ConnectSourceModal: React.FC<ConnectSourceModalProps> = ({ source, onClose, onAdd }) => {
  const [config, setConfig] = useState<any>({});

  if (!source) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      type: source.id,
      name: source.name,
      config
    });
  };

  const renderFields = () => {
    switch (source.id) {
      case 'web_crawler':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Start URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Max Depth</label>
              <input
                type="number"
                min="1"
                max="10"
                defaultValue="2"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, depth: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );
      case 'notion':
      case 'confluence':
      case 'github':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Integration Token / API Key</label>
              <input
                type="password"
                required
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
              />
            </div>
          </div>
        );
      case 'file_upload':
        return (
          <div className="relative border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:bg-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const fileNames = Array.from(e.target.files).map(f => f.name);
                  setConfig({ ...config, files: fileNames });
                }
              }}
            />
            <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            {config.files && config.files.length > 0 ? (
              <div className="text-sm text-emerald-400 font-medium">
                {config.files.length} file(s) selected
                <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px] mx-auto">{config.files.join(', ')}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-300">Drag and drop files here, or click to browse</p>
                <p className="text-xs text-gray-500 mt-1">Supports PDF, TXT, MD, DOCX</p>
              </>
            )}
          </div>
        );
      case 'mcp':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="Server name"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Connection Type</label>
              <select
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, connection_type: e.target.value })}
                defaultValue="http_streamable"
              >
                <option value="http_streamable">HTTP (Streamable)</option>
                <option value="sse" disabled>Server-Sent Events (SSE)</option>
                <option value="stdio" disabled>STDIO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Connection URL</label>
              <input
                type="url"
                required
                placeholder="http://your-mcp-server:3000 or env.MCP_SERVER_URL"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, connection_url: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Authentication Type</label>
              <select
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, auth_type: e.target.value })}
                defaultValue="none"
              >
                <option value="none">None</option>
                <option value="headers" disabled>Headers</option>
                <option value="oauth2" disabled>OAuth 2.0</option>
              </select>
            </div>
          </div>
        );
      case 'api_tool':
        return (
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Tool Name</label>
              <input
                type="text"
                required
                placeholder="get_weather"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, tool_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
              <textarea
                required
                rows={2}
                placeholder="Fetches the current weather for a given city."
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Endpoint URL</label>
              <input
                type="url"
                required
                placeholder="https://api.example.com/v1/resource"
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Method</label>
                <select
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  onChange={(e) => setConfig({ ...config, method: e.target.value })}
                  defaultValue="GET"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Auth Header</label>
                <input
                  type="text"
                  placeholder="Bearer YOUR_TOKEN"
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  onChange={(e) => setConfig({ ...config, auth: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Request Args (JSON Schema)</label>
              <textarea
                rows={4}
                placeholder='{"type": "object", "properties": {"city": {"type": "string"}}}'
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-xs"
                onChange={(e) => setConfig({ ...config, request_args: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Response Schema (Optional)</label>
              <textarea
                rows={4}
                placeholder='{"type": "object", "properties": {"temperature": {"type": "number"}}}'
                className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-xs"
                onChange={(e) => setConfig({ ...config, response_schema: e.target.value })}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <p className="text-sm text-indigo-300">Configuration fields for {source.name} will appear here.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/5 rounded-md">
              <source.icon className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-100">Connect {source.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {renderFields()}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
            >
              Stage Connection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectSourceModal;
