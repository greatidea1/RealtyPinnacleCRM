'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { DEAL_STAGES, STAGE_COLORS, STAGE_BG_COLORS, formatPriceShort, getInitials, getAvatarColor, type Deal } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { Plus, LayoutGrid, List, ArrowLeft, Pencil, Trash2, Calendar, Handshake, MapPin, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export function DealsPage() {
  const { user, navigate, openDealForm, openDeleteDialog } = useAppStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelineStats, setPipelineStats] = useState<Record<string, { count: number; value: number }>>({});
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals?userId=${user?.id}&role=${user?.role}`);
      const data = await res.json();
      setDeals(data.deals || []);
      const stats: Record<string, { count: number; value: number }> = {};
      DEAL_STAGES.forEach(s => stats[s] = { count: 0, value: 0 });
      (data.pipelineStats || []).forEach((s: any) => { stats[s.stage] = { count: s._count.stage, value: s._sum.dealValue || 0 }; });
      setPipelineStats(stats);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStageChange = async (dealId: string, newStage: string) => {
    setDeals(deals.map(d => d.id === dealId ? { ...d, stage: newStage as any } : d));
    try {
      await fetch('/api/deals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dealId, userId: user?.id, stage: newStage }) });
      fetchData();
    } catch {}
  };

  const filteredDeals = stageFilter === 'all' ? deals : deals.filter(d => d.stage === stageFilter);

  if (loading) return <div className="p-4 sm:p-6 space-y-4 overflow-x-auto"><div className="h-10 w-64 max-w-full shimmer rounded-xl" />{DEAL_STAGES.map((_, i) => <div key={i} className="h-40 shimmer rounded-xl inline-block w-64 sm:w-72 mr-4" />)}</div>;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto h-full">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-44 border-border bg-muted text-foreground/80"><SelectValue placeholder="All Stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s} ({pipelineStats[s]?.count || 0})</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex bg-muted rounded-lg p-0.5 border border-border">
            <button onClick={() => setViewMode('kanban')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'kanban' ? 'bg-accent shadow-sm text-cyan-400' : 'text-muted-foreground')}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-accent shadow-sm text-cyan-400' : 'text-muted-foreground')}><List className="w-4 h-4" /></button>
          </div>
        </div>
        <button onClick={() => openDealForm()} className="gradient-primary shadow-lg shadow-cyan-900/30 gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center"><Plus className="w-4 h-4" /> Add Deal</button>
      </div>

      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {DEAL_STAGES.map(stage => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);
            return (
              <div key={stage} className="flex-shrink-0 w-[min(100%,18rem)] sm:w-72">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_BG_COLORS[stage] }} />
                  <h3 className="text-sm font-bold text-foreground/80 flex-1">{stage}</h3>
                  <span className="text-xs font-semibold text-muted-foreground">{stageDeals.length}</span>
                </div>
                {stageValue > 0 && <p className="text-xs gradient-text-gold font-semibold mb-2">&#8377;{(stageValue / 100).toFixed(1)} Cr</p>}
                <div className="space-y-3">
                  {stageDeals.map(deal => (
                    <motion.div key={deal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate('deal-detail', deal.id)} className="kanban-card glass-card rounded-xl p-4 cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white', getAvatarColor(deal.client?.name || ''))}>{getInitials(deal.client?.name || '?')}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{deal.client?.name || '\u2014'}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{deal.property?.title}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold gradient-text-gold mb-1">{deal.dealValue ? formatPriceShort(deal.dealValue, 'Lakhs') : '\u2014'}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="w-3 h-3" /><span className="truncate">{deal.property?.locality}{deal.property?.city ? `, ${deal.property.city}` : ''}</span></div>
                      {deal.expectedCloseDate && <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1"><Calendar className="w-3 h-3" />{formatDate(deal.expectedCloseDate, { day: 'numeric', month: 'short' })}</div>}
                      <div className="mt-3 pt-2 border-t border-border">
                        <Select value={deal.stage} onValueChange={v => handleStageChange(deal.id, v)}>
                          <SelectTrigger className="h-7 text-[10px] border-border bg-muted text-foreground/80"><SelectValue /></SelectTrigger>
                          <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  ))}
                  {stageDeals.length === 0 && <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground/70">No deals</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'table' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Stage</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Property</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Client</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Value</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Close Date</th>
                  {user?.role === 'ADMIN' && <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Agent</th>}
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map(d => (
                  <tr key={d.id} onClick={() => navigate('deal-detail', d.id)} className="table-row-hover cursor-pointer border-b border-muted last:border-0">
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <Select value={d.stage} onValueChange={v => handleStageChange(d.id, v)}>
                        <SelectTrigger className={cn('h-7 w-32 text-[10px] border', STAGE_COLORS[d.stage])}><SelectValue /></SelectTrigger>
                        <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-foreground truncate max-w-[180px]">{d.property?.title || '\u2014'}</p><p className="text-[10px] text-muted-foreground">{d.property?.locality}, {d.property?.city}</p></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white', getAvatarColor(d.client?.name || ''))}>{getInitials(d.client?.name || '?')}</div><span className="text-sm text-foreground/80">{d.client?.name || '\u2014'}</span></div></td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-bold gradient-text-gold">{d.dealValue ? formatPriceShort(d.dealValue, 'Lakhs') : '\u2014'}</span></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{d.expectedCloseDate ? formatDate(d.expectedCloseDate, { day: 'numeric', month: 'short' }) : '\u2014'}</td>
                    {user?.role === 'ADMIN' && <td className="px-4 py-3 text-sm text-muted-foreground">{d.assignedTo?.name || '\u2014'}</td>}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate('deal-detail', d.id)} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openDeleteDialog('deal', d.id, `${d.property?.title} - ${d.client?.name}`)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* Deal Detail Panel */
export function DealDetail() {
  const { user, selectedId, navigate, goBack, openDealForm, openDeleteDialog } = useAppStore();
  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/deals?id=${selectedId}&userId=${user?.id}&role=${user?.role}`)
      .then(r => r.json()).then(d => { setDeal(d.deal || null); setLoading(false); }).catch(() => setLoading(false));
  }, [selectedId, user]);

  if (loading) return <div className="p-6"><div className="h-96 shimmer rounded-2xl" /></div>;
  if (!deal) return <div className="p-8 text-center text-muted-foreground">Deal not found</div>;

  const isOwner = deal.assignedToId === user?.id || user?.role === 'ADMIN';

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 self-start"><ArrowLeft className="w-4 h-4" /> Back to Deals</button>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => openDealForm(deal)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => openDeleteDialog('deal', deal.id, deal.property?.title)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        )}
      </div>
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
          <span className={cn('text-sm px-3 py-1 rounded-full border font-medium badge-glossy', STAGE_COLORS[deal.stage])}>{deal.stage}</span>
          <h1 className="text-xl font-bold text-foreground">Deal Details</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs text-muted-foreground uppercase mb-2 flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" />Property</h3>
            <button onClick={() => navigate('property-detail', deal.propertyId)} className="text-left">
              <p className="text-sm font-semibold text-cyan-400 hover:underline">{deal.property?.title}</p>
              <p className="text-xs text-muted-foreground">{deal.property?.locality}, {deal.property?.city}</p>
            </button>
          </div>
          <div>
            <h3 className="text-xs text-muted-foreground uppercase mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Client</h3>
            <button onClick={() => navigate('client-detail', deal.clientId)} className="text-left">
              <p className="text-sm font-semibold text-cyan-400 hover:underline">{deal.client?.name}</p>
              <p className="text-xs text-muted-foreground">{deal.client?.phone}</p>
            </button>
          </div>
          <div>
            <h3 className="text-xs text-muted-foreground uppercase mb-2">Deal Value</h3>
            <p className="text-2xl font-bold gradient-text-gold">{deal.dealValue ? formatPriceShort(deal.dealValue, 'Lakhs') : '\u2014'}</p>
          </div>
          <div>
            <h3 className="text-xs text-muted-foreground uppercase mb-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Expected Close</h3>
            <p className="text-sm text-foreground/80">{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set'}</p>
          </div>
        </div>
        {deal.notes && <div className="mt-6 pt-4 border-t border-border"><h3 className="text-xs text-muted-foreground uppercase mb-2">Notes</h3><p className="text-sm text-muted-foreground">{deal.notes}</p></div>}
      </div>
    </div>
  );
}

/* Deal Form */
export function DealForm() {
  const { user, showDealForm, editingDeal, closeDealForm } = useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ propertyId: '', clientId: '', stage: 'Lead', dealValue: '', expectedCloseDate: '', notes: '' });
  const [properties, setProperties] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [propSearch, setPropSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showDealForm) {
      setStep(0);
      if (editingDeal) {
        setForm({ propertyId: editingDeal.propertyId, clientId: editingDeal.clientId, stage: editingDeal.stage, dealValue: String(editingDeal.dealValue || ''), expectedCloseDate: editingDeal.expectedCloseDate?.split('T')[0] || '', notes: editingDeal.notes || '' });
      } else {
        setForm({ propertyId: '', clientId: '', stage: 'Lead', dealValue: '', expectedCloseDate: '', notes: '' });
      }
      fetch(`/api/properties?userId=${user?.id}&role=${user?.role}&limit=100`).then(r => r.json()).then(d => setProperties(d.properties || [])).catch(() => {});
      fetch(`/api/clients?userId=${user?.id}&role=${user?.role}&limit=100`).then(r => r.json()).then(d => setClients(d.clients || [])).catch(() => {});
    }
  }, [showDealForm, editingDeal, user]);

  const handleSubmit = async () => {
    if (!form.propertyId || !form.clientId || !form.dealValue) return;
    setLoading(true);
    try {
      const payload: any = { userId: user?.id, propertyId: form.propertyId, clientId: form.clientId, stage: form.stage, dealValue: parseFloat(form.dealValue), expectedCloseDate: form.expectedCloseDate || null, notes: form.notes || null };
      if (editingDeal) payload.id = editingDeal.id;
      await fetch('/api/deals', { method: editingDeal ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      closeDealForm();
    } catch {} finally { setLoading(false); }
  };

  const filteredProps = propSearch ? properties.filter(p => p.title.toLowerCase().includes(propSearch.toLowerCase()) || p.locality.toLowerCase().includes(propSearch.toLowerCase())) : properties;
  const filteredClients = clientSearch ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())) : clients;
  const selectedProp = properties.find(p => p.id === form.propertyId);
  const selectedClient = clients.find(c => c.id === form.clientId);

  return (
    <Dialog open={showDealForm} onOpenChange={open => { if (!open) closeDealForm(); }}>
      <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden bg-popover border-border text-foreground">
        <DialogHeader><DialogTitle className="text-foreground pr-8">{editingDeal ? 'Edit Deal' : 'Add New Deal'}</DialogTitle></DialogHeader>
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Select Property *</Label>
              <Input value={propSearch} onChange={e => setPropSearch(e.target.value)} placeholder="Search property..." className="border-border bg-muted text-foreground mb-2" />
              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                {filteredProps.map(p => (
                  <button key={p.id} onClick={() => setForm(f => ({ ...f, propertyId: p.id }))}
                    className={cn('w-full text-left p-2.5 rounded-lg text-sm transition-colors min-w-0', form.propertyId === p.id ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'hover:bg-sidebar-accent border border-transparent text-foreground/80')}>
                    <span className="font-medium truncate block">{p.title}</span><span className="text-muted-foreground text-xs truncate block">{p.locality}, {p.city}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end"><button onClick={() => setStep(1)} disabled={!form.propertyId} className="gradient-primary shadow-md shadow-cyan-900/30 px-4 py-2 rounded-xl text-sm font-medium text-white">Next</button></div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Select Client *</Label>
              <Input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search client..." className="border-border bg-muted text-foreground mb-2" />
              <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                {filteredClients.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, clientId: c.id }))}
                    className={cn('w-full text-left p-2.5 rounded-lg text-sm transition-colors min-w-0', form.clientId === c.id ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'hover:bg-sidebar-accent border border-transparent text-foreground/80')}>
                    <span className="font-medium truncate block">{c.name}</span><span className="text-muted-foreground text-xs truncate block">{c.phone}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={() => setStep(2)} disabled={!form.clientId} className="gradient-primary shadow-md shadow-cyan-900/30 px-4 py-2 rounded-xl text-sm font-medium text-white">Next</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            {selectedProp && <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg border border-border">Property: <strong className="text-foreground">{selectedProp.title}</strong></p>}
            {selectedClient && <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg border border-border">Client: <strong className="text-foreground">{selectedClient.name}</strong></p>}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Stage *</Label>
              <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                <SelectTrigger className="border-border bg-muted text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Deal Value (Lakhs) *</Label>
              <Input type="number" value={form.dealValue} onChange={e => setForm(f => ({ ...f, dealValue: e.target.value }))} placeholder="85" className="border-border bg-muted text-foreground" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Expected Close Date</Label>
              <Input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} className="border-border bg-muted text-foreground" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="border-border bg-muted text-foreground" />
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={handleSubmit} disabled={loading || !form.dealValue} className="gradient-primary shadow-md shadow-cyan-900/30 px-4 py-2 rounded-xl text-sm font-medium text-white">{loading ? 'Saving...' : editingDeal ? 'Update Deal' : 'Create Deal'}</button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}