'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  type Client, type Deal,
  PRIORITY_COLORS, CLIENT_STATUS_COLORS, STAGE_COLORS,
  getInitials, getAvatarColor, formatPrice, timeAgo,
} from '@/lib/types';
import { formatDateLong } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, Pencil, Trash2, CheckCircle2,
  MapPin, Building2, BedDouble, Sofa, Banknote, Bell, CalendarClock, Handshake, User,
} from 'lucide-react';
import type { Task } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  Buyer: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Seller: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Tenant: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Landlord: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Investor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export function ClientDetail() {
  const { user, selectedId, goBack, openClientForm, openDeleteDialog, navigate } = useAppStore();
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);

  useEffect(() => {
    if (!user || !selectedId) return;
    const fetchClient = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ id: selectedId, userId: user.id, role: user.role });
        const res = await fetch(`/api/clients?${params}`);
        const data = await res.json();
        setClient(data.client || null);
        setDeals(data.deals || []);
      } catch { }
      finally { setLoading(false); }
    };
    fetchClient();
  }, [user, selectedId]);

  useEffect(() => {
    if (!selectedId || !user) return;
    fetch(`/api/tasks?userId=${user.id}&role=${user.role}&filter=all`)
      .then(r => r.json()).then(d => setTasks((d.tasks || []).filter((t: Task) => t.clientId === selectedId))).catch(() => {});
  }, [selectedId, user]);

  const handleMarkReminderDone = async () => {
    if (!client || !user) return;
    setMarkingDone(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, userId: user.id, reminderDone: true }),
      });
      const data = await res.json();
      if (data.client) setClient(data.client);
    } catch {}
    finally { setMarkingDone(false); }
  };

  if (loading) return <div className="p-6"><div className="h-96 shimmer rounded-2xl" /></div>;
  if (!client) return <div className="p-8 text-center text-muted-foreground">Client not found</div>;

  const isOwner = client.assignedToId === user?.id || user?.role === 'ADMIN';
  const hasBudget = client.budgetMin || client.budgetMax;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => openClientForm(client)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => openDeleteDialog('client', client.id, client.name)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-lg', getAvatarColor(client.name))}>
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-xl font-bold text-foreground truncate">{client.name}</h1>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium badge-glossy', TYPE_COLORS[client.clientType])}>{client.clientType}</span>
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium badge-glossy', PRIORITY_COLORS[client.priority])}>{client.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"><Phone className="w-3.5 h-3.5" /> Call</a>
                  {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-medium hover:bg-sky-500/20 transition-colors"><Mail className="w-3.5 h-3.5" /> Email</a>}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem icon={Phone} label="Phone" value={client.phone} />
              {client.alternatePhone && <InfoItem icon={Phone} label="Alt Phone" value={client.alternatePhone} />}
              {client.email && <InfoItem icon={Mail} label="Email" value={client.email} />}
              {client.leadSource && <InfoItem icon={User} label="Lead Source" value={client.leadSource} />}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0 mt-0.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={cn('text-[11px] px-2.5 py-1 rounded-full border font-medium badge-glossy', CLIENT_STATUS_COLORS[client.status])}>{client.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Requirements</h2>
            {hasBudget ? (
              <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 border border-cyan-500/15">
                <p className="text-xs text-cyan-400 font-medium mb-1">Budget Range</p>
                <p className="text-2xl font-bold gradient-text-gold">
                  {client.budgetMin ? formatPrice(client.budgetMin, 'Lakhs') : '—'}
                  {client.budgetMin && client.budgetMax && ' — '}
                  {client.budgetMax ? formatPrice(client.budgetMax, 'Lakhs') : ''}
                </p>
              </div>
            ) : <div className="mb-5 p-4 rounded-xl bg-muted border border-border"><p className="text-xs text-muted-foreground">No budget specified</p></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {client.preferredLocation && <InfoItem icon={MapPin} label="Location" value={client.preferredLocation} />}
              {client.preferredType && <InfoItem icon={Building2} label="Type" value={client.preferredType} />}
              {client.preferredBeds && <InfoItem icon={BedDouble} label="Beds" value={`${client.preferredBeds} BHK`} />}
              {client.preferredFurnish && <InfoItem icon={Sofa} label="Furnishing" value={client.preferredFurnish} />}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Notes</h2>
            {client.notes ? <div className="bg-muted rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar"><p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{client.notes}</p></div> : <p className="text-sm text-muted-foreground text-center py-4">No notes</p>}
          </div>

          {client.reminderDate && (
            <div className={cn('glass-card rounded-2xl p-6', client.reminderDone && 'opacity-60')}>
              <div className="flex items-center gap-2 mb-3"><Bell className="w-4 h-4 text-amber-400" /><h2 className="text-sm font-bold text-foreground">Reminder</h2>
                {client.reminderDone && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">Done</span>}
              </div>
              <p className="text-sm text-foreground/80 mb-1">{formatDateLong(client.reminderDate)}</p>
              {client.reminderNote && <p className="text-xs text-muted-foreground mb-3">{client.reminderNote}</p>}
              {!client.reminderDone && <button onClick={handleMarkReminderDone} disabled={markingDone} className="w-full py-2 rounded-xl gradient-primary text-white text-sm font-medium border-0 shadow-sm hover:shadow-md transition-all"><CheckCircle2 className="w-4 h-4 mr-2" />{markingDone ? 'Marking...' : 'Mark Done'}</button>}
            </div>
          )}

          {deals.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Handshake className="w-4 h-4 text-amber-400" />Deals ({deals.length})</h2>
              <div className="space-y-2">
                {deals.map(d => (
                  <button key={d.id} onClick={() => navigate('deal-detail', d.id)} className="w-full text-left p-3 rounded-xl hover:bg-sidebar-accent transition-colors flex items-center justify-between">
                    <div><p className="text-sm text-foreground font-medium">{d.property?.title || '—'}</p><p className="text-xs text-muted-foreground">{d.property?.locality}</p></div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', STAGE_COLORS[d.stage])}>{d.stage}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-bold text-foreground mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total Deals" value={String(client._count?.deals || 0)} />
              <StatBox label="Tasks" value={String(client._count?.tasks || 0)} />
              <StatBox label="Added" value={timeAgo(client.createdAt)} />
              <StatBox label="Updated" value={timeAgo(client.updatedAt)} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0 mt-0.5"><Icon className="w-4 h-4 text-cyan-400" /></div>
      <div><p className="text-xs text-muted-foreground mb-0.5">{label}</p><p className="text-sm font-medium text-foreground/80">{value}</p></div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (<div className="bg-muted rounded-xl p-3 text-center border border-border"><p className="text-lg font-bold text-foreground">{value}</p><p className="text-[11px] text-muted-foreground mt-0.5">{label}</p></div>);
}