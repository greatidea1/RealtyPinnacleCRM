'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { Search, Bell, ChevronRight, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_COLORS, PRIORITY_COLORS, formatPriceShort, type Property, type Client, type Notification } from '@/lib/types';
import { timeAgo, getInitials, getAvatarColor } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/crm/ThemeToggle';

const notifIcons: Record<string, string> = {
  deal_stage: '\u{1F504}', task_due: '\u23F0', task_overdue: '\u26A0\uFE0F', new_lead: '\u{1F464}', system: '\u2699\uFE0F',
};

/** Top navigation bar with breadcrumbs, search, theme toggle, and notifications. */
export function TopBar() {
  const { user, currentPage, searchQuery, searchOpen, searchTab,
    setSearchQuery, setSearchOpen, setSearchTab, navigate, notifPanelOpen,
    setNotifPanelOpen, setMobileNavOpen } = useAppStore();
  const [searchResults, setSearchResults] = useState<{ properties: Property[]; clients: Client[] }>({ properties: [], clients: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const notifRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = getPageBreadcrumbs(currentPage);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) return;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&userId=${user?.id}&role=${user?.role}`);
        const data = await res.json();
        setSearchResults(data);
      } catch {}
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, user]);

  useEffect(() => {
    if (!user) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`, { signal: ctrl.signal });
        const data = await res.json();
        if (!ctrl.signal.aborted) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {}
    })();
    return () => ctrl.abort();
  }, [user, notifPanelOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifPanelOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, action: 'mark-read', notificationId: id }) });
    const res = await fetch(`/api/notifications?userId=${user?.id}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id, action: 'mark-all-read' }) });
    const res = await fetch(`/api/notifications?userId=${user?.id}`);
    const data = await res.json();
    setNotifications(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  };

  const handleResultClick = (type: string, id: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (type === 'property') navigate('property-detail', id);
    else if (type === 'client') navigate('client-detail', id);
  };

  const filteredProps = searchTab === 'all' || searchTab === 'properties' ? searchResults.properties : [];
  const filteredClients = searchTab === 'all' || searchTab === 'clients' ? searchResults.clients : [];
  const hasResults = filteredProps.length > 0 || filteredClients.length > 0;

  return (
    <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between gap-2 px-3 sm:px-4 md:px-6 sticky top-0 z-20 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Breadcrumb — hide on very small screens when mobile search is open */}
        <div className={cn('items-center gap-1.5 text-sm min-w-0', mobileSearchOpen ? 'hidden' : 'hidden sm:flex')}>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />}
              <button
                onClick={() => navigate(b.page as any)}
                className={cn(
                  'transition-colors truncate max-w-[120px] md:max-w-none',
                  i === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-cyan-400'
                )}
              >
                {b.label}
              </button>
            </span>
          ))}
        </div>

        {/* Mobile page title when breadcrumbs hidden */}
        <p className={cn('sm:hidden text-sm font-semibold text-foreground truncate', mobileSearchOpen && 'hidden')}>
          {breadcrumbs[breadcrumbs.length - 1]?.label}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative">
          {/* Mobile: icon toggles expandable search */}
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(true);
              setSearchOpen(true);
            }}
            className={cn(
              'md:hidden w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors',
              mobileSearchOpen && 'hidden'
            )}
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>

          <div
            className={cn(
              'items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2 focus-within:border-cyan-500/40 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all',
              mobileSearchOpen
                ? 'flex absolute right-0 top-1/2 -translate-y-1/2 w-[min(100vw-5.5rem,20rem)] z-50'
                : 'hidden md:flex w-56 lg:w-72'
            )}
          >
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search..."
              className="bg-transparent text-sm outline-none flex-1 min-w-0 placeholder:text-muted-foreground/70 text-foreground"
            />
            {(searchQuery || mobileSearchOpen) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                  setMobileSearchOpen(false);
                }}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <AnimatePresence>
            {searchOpen && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 bg-popover rounded-2xl shadow-2xl shadow-black/20 border border-border overflow-hidden z-50 right-0 w-[min(100vw-1.5rem,24rem)] md:left-0 md:right-auto md:w-full"
              >
                <div className="flex border-b border-border px-2 pt-2 overflow-x-auto">
                  {(['all', 'properties', 'clients'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSearchTab(tab)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors capitalize flex-shrink-0',
                        searchTab === tab ? 'text-cyan-400 bg-cyan-500/10' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="max-h-80 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {!hasResults && (
                    <div className="py-8 text-center text-muted-foreground text-sm">No results found</div>
                  )}
                  {filteredProps.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleResultClick('property', p.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left min-w-0"
                    >
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <BuildingIcon className="w-5 h-5 text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.locality}, {p.city}</p>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-sm font-semibold gradient-text-gold">{formatPriceShort(p.price, p.priceUnit)}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', STATUS_COLORS[p.status])}>{p.status}</span>
                      </div>
                    </button>
                  ))}
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleResultClick('client', c.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left min-w-0"
                    >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', getAvatarColor(c.name))}>
                        {getInitials(c.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', PRIORITY_COLORS[c.priority])}>{c.priority}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/20">{c.clientType}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ThemeToggle className="flex-shrink-0" />

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifPanelOpen(!notifPanelOpen)}
            className="relative w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-rose-900/50">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-[min(100vw-1.5rem,24rem)] bg-popover rounded-2xl shadow-2xl shadow-black/20 border border-border overflow-hidden z-50"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium whitespace-nowrap">
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No notifications</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          markRead(n.id);
                          if (n.linkTo) {
                            const [type, id] = n.linkTo.split(':');
                            if (type === 'property') navigate('property-detail', id);
                            else if (type === 'client') navigate('client-detail', id);
                            else if (type === 'deal') navigate('deal-detail', id);
                          }
                          setNotifPanelOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b border-muted min-w-0',
                          !n.isRead && 'bg-cyan-500/5'
                        )}
                      >
                        <span className="text-lg mt-0.5 flex-shrink-0">{notifIcons[n.type] || '\u{1F514}'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm break-words', !n.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0 soft-pulse" />}
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-border">
                  <button
                    onClick={() => { setNotifPanelOpen(false); navigate('notifications'); }}
                    className="w-full text-center py-2.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-border">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg flex-shrink-0',
            user?.role === 'ADMIN' ? 'bg-gradient-to-br from-violet-600 to-purple-700' : 'bg-gradient-to-br from-cyan-600 to-blue-700'
          )}>
            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate max-w-[140px]">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
} // end TopBar

/** Building outline icon used in search result rows. */
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
} // end BuildingIcon

/** Maps the current page id to breadcrumb trail entries. */
function getPageBreadcrumbs(page: string) {
  const map: Record<string, { label: string; page: string }[]> = {
    'dashboard': [{ label: 'Dashboard', page: 'dashboard' }],
    'properties': [{ label: 'Properties', page: 'properties' }],
    'property-detail': [{ label: 'Properties', page: 'properties' }, { label: 'Property Details', page: 'property-detail' }],
    'clients': [{ label: 'Clients', page: 'clients' }],
    'client-detail': [{ label: 'Clients', page: 'clients' }, { label: 'Client Details', page: 'client-detail' }],
    'matches': [{ label: 'Matches', page: 'matches' }],
    'deals': [{ label: 'Deals', page: 'deals' }],
    'reports': [{ label: 'Reports', page: 'reports' }],
    'deal-detail': [{ label: 'Deals', page: 'deals' }, { label: 'Deal Details', page: 'deal-detail' }],
    'tasks': [{ label: 'Tasks', page: 'tasks' }],
    'notifications': [{ label: 'Notifications', page: 'notifications' }],
    'settings': [{ label: 'Settings', page: 'settings' }],
  };
  return map[page] || [{ label: page, page }];
} // end getPageBreadcrumbs
