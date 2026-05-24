import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Network, ActivitySquare, LayoutDashboard } from 'lucide-react';

const Layout: React.FC = () => {
  const navItems = [
    { name: 'Agents', icon: Bot, path: '/agents' },
    { name: 'Workflows', icon: Network, path: '/workflows' },
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
