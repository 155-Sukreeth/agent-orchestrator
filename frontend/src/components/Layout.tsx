import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bot, Network, ActivitySquare, LayoutDashboard, Database, Link as LinkIcon } from 'lucide-react';

const Layout: React.FC = () => {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/agents' },
    { name: 'Builder', icon: Network, path: '/workflows/new' },
    { name: 'Knowledge', icon: Database, path: '/knowledge' },
    { name: 'Connections', icon: LinkIcon, path: '/connections' },
    { name: 'Monitor', icon: ActivitySquare, path: '/monitor' },
  ];

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(prev => {
        const newWidth = prev + e.movementX;
        return Math.min(Math.max(newWidth, 150), 400);
      });
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100">
      {/* Sidebar */}
      <aside 
        id="global-sidebar" 
        style={{ width: sidebarWidth }}
        className="relative flex flex-col border-r border-white/10 glass z-20 transition-all duration-300 ease-in-out shrink-0"
      >
        {/* Resize Handle */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-2 translate-x-1/2 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); isResizing.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
        />
        
        <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
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
