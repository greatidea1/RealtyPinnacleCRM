'use client';

import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard, Building2, Users, Handshake, CheckSquare2,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut, Home, GitCompareArrows, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'properties' as const, label: 'Properties', icon: Building2 },
  { id: 'clients' as const, label: 'Clients', icon: Users },
  { id: 'matches' as const, label: 'Matches', icon: GitCompareArrows },
  { id: 'deals' as const, label: 'Deals', icon: Handshake },
  { id: 'reports' as const, label: 'Reports', icon: BarChart3 },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare2 },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

/** Shared brand + nav + user block used by desktop aside and mobile drawer. */
function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { currentPage, navigate, logout, user, toggleSidebar } = useAppStore();

  /** Clears server session cookie then local auth state. */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore network errors on logout
    }
    logout();
  };
  // End handleLogout

  return (
    <>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-900/40">
          <Home className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <h1 className="text-base font-bold gradient-text-primary whitespace-nowrap">Realty Pinnacle</h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5 whitespace-nowrap">CRM</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentPage === item.id ||
            (item.id === 'notifications' && currentPage === 'notifications');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                navigate(item.id);
                onNavigate?.();
              }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group min-h-11',
                isActive
                  ? 'sidebar-active-pill text-cyan-400'
                  : 'text-muted-foreground hover:text-cyan-400/80 hover:bg-sidebar-accent'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-cyan-400' : 'text-muted-foreground group-hover:text-cyan-500/80'
                )}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/60">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
              user.role === 'ADMIN' ? 'bg-violet-600' : 'bg-cyan-600'
            )}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-10 min-w-10 flex items-center justify-center text-muted-foreground hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Collapse only on desktop aside */}
        {!onNavigate && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-11 rounded-xl text-muted-foreground hover:text-cyan-400 hover:bg-sidebar-accent transition-all text-sm"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </>
  );
} // end SidebarNav

/** Desktop sidebar + mobile slide-out drawer navigation. */
export function Sidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useAppStore();

  return (
    <>
      {/* Desktop / tablet landscape sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out relative z-30',
          sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <SidebarNav collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[min(100%,280px)] sm:max-w-[280px] bg-sidebar border-sidebar-border flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
} // end Sidebar
