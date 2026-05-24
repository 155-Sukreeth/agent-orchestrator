import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Wifi, WifiOff, Play } from 'lucide-react';

const LiveMonitor: React.FC = () => {
  const [logs, setLogs] = useState<{timestamp: string, level: string, message: string}[]>([]);
  const [runId, setRunId] = useState('1');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setLogs([{ timestamp: new Date().toISOString(), level: 'SYSTEM', message: `Connecting to run ${runId}...` }]);
    
    // In dev, Vite is on 5173, backend is on 8000
    const wsUrl = `ws://localhost:8000/ws/runs/${runId}/logs`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'SYSTEM', message: 'Connected to LangGraph Runtime stream.' }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLogs(prev => [...prev, { 
          timestamp: new Date().toISOString(), 
          level: data.level || 'INFO', 
          message: data.message 
        }]);
      } catch (e) {
        setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'RAW', message: event.data }]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setLogs(prev => [...prev, { timestamp: new Date().toISOString(), level: 'SYSTEM', message: 'Disconnected from stream.' }]);
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Live Monitor</h2>
          <p className="text-gray-400">Stream real-time logs from the LangGraph orchestrator.</p>
        </div>
        
        <div className="flex items-center space-x-3 bg-gray-900/60 p-2 rounded-xl border border-white/5 shadow-inner">
          <input
            type="text"
            placeholder="Run ID (e.g. 1)"
            value={runId}
            onChange={(e) => setRunId(e.target.value)}
            className="bg-gray-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-32 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isConnected}
          />
          {isConnected ? (
            <button onClick={disconnect} className="bg-destructive/20 text-destructive hover:bg-destructive/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
              <WifiOff className="w-4 h-4 mr-2" /> Disconnect
            </button>
          ) : (
            <button onClick={connectWebSocket} className="bg-primary/20 text-primary hover:bg-primary/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
              <Wifi className="w-4 h-4 mr-2" /> Connect
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 glass-card flex flex-col overflow-hidden border-gray-800 bg-[#0a0a0a] shadow-2xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="h-10 border-b border-gray-800 bg-gray-900/80 flex items-center justify-between px-4 z-10 backdrop-blur-md">
          <div className="flex items-center">
            <Terminal className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-xs font-mono text-gray-400">ws://localhost:8000/ws/runs/{runId}/logs</span>
          </div>
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5 font-mono text-sm space-y-1.5 z-10 custom-scrollbar">
          {logs.length === 0 && !isConnected && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <Play className="w-12 h-12 mb-4 opacity-50" />
              <p>Enter a Run ID and connect to view live execution logs.</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex font-mono text-sm leading-relaxed">
              <span className="text-gray-600 mr-4 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
              <span className={`shrink-0 w-16 mr-2 font-semibold ${
                log.level === 'SYSTEM' ? 'text-indigo-400' :
                log.level === 'ERROR' ? 'text-red-400' :
                log.level === 'WARN' ? 'text-yellow-400' :
                'text-emerald-400'
              }`}>
                {log.level}
              </span>
              <span className="text-gray-300 whitespace-pre-wrap">{log.message}</span>
            </div>
          ))}
          {isConnected && (
            <div className="animate-pulse w-2 h-4 bg-gray-400 inline-block align-middle ml-1" />
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
