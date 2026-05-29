import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';

const ConnectionsLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Top Banner */}
      <div className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-100">App Connections</h1>
            <p className="text-xs text-gray-500">Manage external third-party integrations</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Outlet />
      </div>
    </div>
  );
};

export default ConnectionsLayout;
