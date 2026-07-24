'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import type { Client } from '@/lib/types';
import { getInitials, getAvatarColor, formatPrice, PRIORITY_COLORS, CLIENT_STATUS_COLORS } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { ArrowLeft, Pencil, Trash2, Phone, Mail, User, Calendar } from 'lucide-react';

export function ClientDetailPage() {
  const { user, selectedId, navigate, goBack, openClientForm, openDeleteDialog } = useAppStore();
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([
      fetch(`/api/clients?id=${selectedId}&userId=${user?.id}&role=${user?.role}`).then(r => r.json()),
      fetch(`/api/deals?userId=${user?.id}&role=${user?.role}`).then(r => r.json()),
      fetch(`/api/tasks?userId=${user?.id}&role=${user?.role}&filter=all`).then(r => r.json()),
    ]).then(([cData, dData, tData]) => {
      setClient(cData.client || null);
      setDeals((dData.deals || []).filter((d: any) => d.clientId === selectedId));
      setTasks((tData.tasks || []).filter((t: any) => t.clientId === selectedId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedId, user]);

  if (loading) return <div className="p-4 sm:p-6"><div className="h-96 shimmer rounded-2xl" /></div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found</div>;

  const isOwner = client.assignedToId === user?.id || user?.role === 'ADMIN';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 self-start"><ArrowLeft className="w-4 h-4" /> Back to Clients</button>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => openClientForm(client)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => openDeleteDialog('client', client.id, client.name)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn('w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg flex-shrink-0', getAvatarColor(client.name))}>
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{client.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
              {client.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', PRIORITY_COLORS[client.priority])}>{client.priority}</span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', CLIENT_STATUS_COLORS[client.status])}>{client.status}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-cyan-500/15 text-cyan-400 border-cyan-500/30">{client.clientType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Requirements</h3>
          <div className="space-y-2">
            {client.budgetMin || client.budgetMax ? (
              <div className="flex justify-between py-2 border-b border-muted">
                <span className="text-xs text-muted-foreground">Budget</span>
                <span className="text-sm font-semibold gradient-text-gold">
                  {client.budgetMin ? formatPrice(client.budgetMin, 'Lakhs') : ''}{client.budgetMin && client.budgetMax ? ' - ' : ''}{client.budgetMax ? formatPrice(client.budgetMax, 'Lakhs') : ''}
                </span>
              </div>
            ) : null}
            {(client.preferredLocality || client.preferredLocation) && (
              <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0">
                <span className="text-xs text-muted-foreground flex-shrink-0">Preferred Locality</span>
                <span className="text-xs text-foreground/80 text-right break-words min-w-0">{client.preferredLocality || client.preferredLocation}</span>
              </div>
            )}
            {client.preferredCity && (
              <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0">
                <span className="text-xs text-muted-foreground flex-shrink-0">Preferred City</span>
                <span className="text-xs text-foreground/80 text-right break-words min-w-0">{client.preferredCity}</span>
              </div>
            )}
            {client.preferredType && <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0"><span className="text-xs text-muted-foreground flex-shrink-0">Preferred Type</span><span className="text-xs text-foreground/80 text-right break-words min-w-0">{client.preferredType}</span></div>}
            {client.preferredBeds && <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0"><span className="text-xs text-muted-foreground flex-shrink-0">Preferred Beds</span><span className="text-xs text-foreground/80 text-right">{client.preferredBeds} BHK</span></div>}
            {client.preferredFurnish && <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0"><span className="text-xs text-muted-foreground flex-shrink-0">Furnishing</span><span className="text-xs text-foreground/80 text-right">{client.preferredFurnish}</span></div>}
            {client.leadSource && <div className="flex justify-between gap-3 py-2 border-b border-muted min-w-0"><span className="text-xs text-muted-foreground flex-shrink-0">Lead Source</span><span className="text-xs text-foreground/80 text-right">{client.leadSource}</span></div>}
            <div className="flex justify-between gap-3 py-2 min-w-0"><span className="text-xs text-muted-foreground flex-shrink-0">Created</span><span className="text-xs text-foreground/80 text-right">{formatDate(client.createdAt)}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-3">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes || 'No notes added'}</p>
          </div>
          {client.reminderDate && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-400" /> Reminder</h3>
              <p className="text-sm text-foreground/80">{formatDate(client.reminderDate, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {client.reminderNote && <p className="text-xs text-muted-foreground mt-1">{client.reminderNote}</p>}
              <span className={cn('mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium', client.reminderDone ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')}>
                {client.reminderDone ? 'Done' : 'Pending'}
              </span>
            </div>
          )}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-3">Deals ({deals.length})</h3>
            {deals.length === 0 ? <p className="text-xs text-muted-foreground">No deals yet</p> : deals.map(d => (
              <button key={d.id} onClick={() => navigate('deal-detail', d.id)} className="w-full text-left p-2 rounded-lg hover:bg-sidebar-accent transition-colors mb-1">
                <p className="text-sm text-foreground">{d.property?.title}</p>
                <p className="text-[10px] text-muted-foreground">{d.stage}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}