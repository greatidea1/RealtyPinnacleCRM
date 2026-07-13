'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Filter } from 'lucide-react';
import type { Notification, NotificationType } from '@/lib/types';
import { timeAgo } from '@/lib/types';

const notifIcons: Record<string, string> = {
  deal_stage: '\u{1F504}', task_due: '\u23F0', task_overdue: '\u26A0\uFE0F', new_lead: '\u{1F464}', system: '\u2699\uFE0F',
};

const typeFilters: { key: string; label: string; types: NotificationType[] }[] = [
  { key: 'all', label: 'All', types: [] },
  { key: 'deals', label: 'Deals', types: ['deal_stage'] },
  { key: 'tasks', label: 'Tasks', types: ['task_due', 'task_overdue'] },
  { key: 'leads', label: 'Leads', types: ['new_lead'] },
  { key: 'system', label: 'System', types: ['system'] },
];

export function NotificationsPage() {
  const { user, navigate } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchNotifs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, [user]);

  const markRead = async (notif: Notification) => {
    if (notif.isRead) return;
    setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, action: 'mark-read', notificationId: notif.id }),
      });
      fetchNotifs();
    } catch {}
  };

  const markAllRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, action: 'mark-all-read' }),
      });
    } catch {}
  };

  const handleClick = (notif: Notification) => {
    markRead(notif);
    if (notif.linkTo) {
      const [type, id] = notif.linkTo.split(':');
      if (type === 'property') navigate('property-detail', id);
      else if (type === 'client') navigate('client-detail', id);
      else if (type === 'deal') navigate('deal-detail', id);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const activeFilter = typeFilters.find(f => f.key === typeFilter);
  const filtered = !activeFilter || activeFilter.types.length === 0
    ? notifications
    : notifications.filter(n => activeFilter.types.includes(n.type));

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-10 w-96 shimmer rounded-xl" />
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 shimmer rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Type Filters */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] w-fit">
        {typeFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              typeFilter === f.key
                ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#252839]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1d2b] flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-400 mb-1">No notifications</h3>
            <p className="text-sm text-gray-500">You&apos;re all up to date</p>
          </div>
        ) : (
          filtered.map((notif, i) => (
            <motion.button
              key={notif.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => handleClick(notif)}
              className={cn(
                'w-full glass-card rounded-xl p-4 flex items-start gap-4 text-left transition-all hover:border-cyan-500/20 group',
                !notif.isRead && 'border-l-2 border-l-cyan-500'
              )}
            >
              <span className="text-xl mt-0.5 flex-shrink-0">{notifIcons[notif.type] || '\u{1F514}'}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm',
                  !notif.isRead ? 'font-semibold text-white' : 'text-gray-300'
                )}>
                  {notif.title}
                </p>
                {notif.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.description}</p>
                )}
                <p className="text-[11px] text-gray-600 mt-1.5">{timeAgo(notif.createdAt)}</p>
              </div>
              {!notif.isRead && (
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 mt-1.5 flex-shrink-0 soft-pulse" />
              )}
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}