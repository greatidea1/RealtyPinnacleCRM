'use client';

import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard, Building2, Users, Handshake, CheckSquare2,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut, Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'properties' as const, label: 'Properties', icon: Building2 },
  { id: 'clients' as const, label: 'Clients', icon: Users },
  { id: 'deals' as const, label: 'Deals', icon: Handshake },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare2 },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { currentPage, sidebarCollapsed, toggleSidebar, navigate, logout, user } = useAppStore();

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[#13151e] border-r border-[#232738] transition-all duration-300 ease-in-out relative z-30',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#232738] flex-shrink-0">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-900/40">
          <Home className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-bold gradient-text-primary whitespace-nowrap">Realty Pinnacle</h1>
            <p className="text-[10px] text-gray-500 -mt-0.5 whitespace-nowrap">CRM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentPage === item.id ||
            (item.id === 'notifications' && currentPage === 'notifications');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'sidebar-active-pill text-cyan-400'
                  : 'text-gray-400 hover:text-cyan-400/80 hover:bg-[#1a1f30]'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-cyan-500/80'
                )}
              />
              {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle + User */}
      <div className="border-t border-[#232738] p-3 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#1a1f30]/60">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
              user.role === 'ADMIN' ? 'bg-violet-600' : 'bg-cyan-600'
            )}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.role}</p>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-rose-400 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:text-cyan-400 hover:bg-[#1a1f30] transition-all text-sm"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}