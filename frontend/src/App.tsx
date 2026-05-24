import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          AI Agent Orchestrator
        </h1>
        <p className="text-lg text-slate-400">
          Visual workflow builder, semantic routing, and multi-channel integration.
        </p>
        <div className="pt-8">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 transition rounded-lg font-medium shadow-lg shadow-blue-500/20">
            Open Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
