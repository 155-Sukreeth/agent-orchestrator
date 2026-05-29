import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Network, ActivitySquare, LayoutDashboard, Database, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/agents' },
    { name: 'Builder', icon: Network, path: '/workflows/new' },
    { name: 'Knowledge', icon: Database, path: '/knowledge' },
    { name: 'Connections', icon: LinkIcon, path: '/connections' },
    { name: 'Monitor', icon: ActivitySquare, path: '/monitor' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-white/10 glass z-20">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <LayoutDashboard className="w-6 h-6 text-indigo-500 mr-3" />
          <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Orchestrator
          </h1>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 mr-3 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* User Profile & Logout */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-sm font-medium text-gray-300 truncate">
                {user?.email || 'User'}
              </span>
              <span className="text-xs text-gray-500">Org ID: {user?.organization_id || 'Unknown'}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
