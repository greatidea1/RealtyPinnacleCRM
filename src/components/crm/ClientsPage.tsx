'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  type Client, type ClientType,
  PRIORITY_COLORS, CLIENT_STATUS_COLORS,
  getInitials, getAvatarColor, formatPrice, timeAgo,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Search, Plus, SlidersHorizontal, Eye, Pencil, Trash2, Users, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const CLIENT_TYPES: ('All' | ClientType)[] = ['All', 'Buyer', 'Seller', 'Tenant', 'Landlord', 'Investor'];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'priority', label: 'Priority' },
];

const TYPE_COLORS: Record<ClientType, string> = {
  Buyer: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Seller: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Tenant: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Landlord: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Investor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const PAGE_SIZE = 10;

export function ClientsPage() {
  const { user, navigate, openClientForm, openDeleteDialog } = useAppStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id, role: user.role, page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (typeFilter !== 'All') params.set('type', typeFilter);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch (err) { console.error('Failed to fetch clients', err); }
    finally { setLoading(false); }
  }, [user, search, typeFilter, sort, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} client{total !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => openClientForm()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40 transition-all">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-white outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600"
              placeholder="Search by name, phone, or location..." />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-gray-300 outline-none">
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="h-10 px-3 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-gray-300 outline-none">
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1d2b] flex items-center justify-center mb-4"><Users className="w-8 h-8 text-gray-600" /></div>
            <h3 className="text-base font-semibold text-gray-400 mb-1">No clients found</h3>
            <p className="text-sm text-gray-500">{search || typeFilter !== 'All' ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first client.'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#232738]">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Phone</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Priority</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Budget</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                    {user?.role === 'ADMIN' && <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Assigned To</th>}
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, i) => (
                    <motion.tr key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="table-row-hover cursor-pointer border-b border-[#1a1d2b] last:border-0" onClick={() => navigate('client-detail', client.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm', getAvatarColor(client.name))}>{getInitials(client.name)}</div>
                          <div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{client.name}</p><p className="text-xs text-gray-500">{timeAgo(client.createdAt)}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-gray-300">{client.phone}</span></td>
                      <td className="px-4 py-3"><span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium badge-glossy', TYPE_COLORS[client.clientType])}>{client.clientType}</span></td>
                      <td className="px-4 py-3"><span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium badge-glossy', PRIORITY_COLORS[client.priority])}>{client.priority}</span></td>
                      <td className="px-4 py-3">
                        {client.budgetMin || client.budgetMax ? (
                          <span className="text-sm font-medium gradient-text-gold">{client.budgetMin && formatPrice(client.budgetMin, 'Lakhs')}{client.budgetMin && client.budgetMax && ' - '}{client.budgetMax && formatPrice(client.budgetMax, 'Lakhs')}</span>
                        ) : <span className="text-xs text-gray-600">&mdash;</span>}
                      </td>
                      <td className="px-4 py-3"><span className={cn('text-[11px] px-2 py-0.5 rounded-full border font-medium badge-glossy', CLIENT_STATUS_COLORS[client.status])}>{client.status}</span></td>
                      {user?.role === 'ADMIN' && (
                        <td className="px-4 py-3">
                          {client.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white', getAvatarColor(client.assignedTo.name))}>{getInitials(client.assignedTo.name)}</div>
                              <span className="text-xs text-gray-400 truncate max-w-[100px]">{client.assignedTo.name}</span>
                            </div>
                          ) : <span className="text-xs text-gray-600">&mdash;</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => navigate('client-detail', client.id)} className="p-1.5 rounded-lg hover:bg-[#1a1f30] text-gray-500 hover:text-cyan-400 transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openClientForm(client)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-gray-500 hover:text-amber-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => openDeleteDialog('client', client.id, client.name)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#232738]">
                <p className="text-xs text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, total)} of {total}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-[#1a1f30] disabled:opacity-30 text-gray-500 hover:text-cyan-400 transition-colors"><ChevronsLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-[#1a1f30] disabled:opacity-30 text-gray-500 hover:text-cyan-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pn: number;
                    if (totalPages <= 5) pn = i + 1;
                    else if (page <= 3) pn = i + 1;
                    else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                    else pn = page - 2 + i;
                    return (<button key={pn} onClick={() => setPage(pn)} className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors', page === pn ? 'gradient-primary text-white shadow-sm' : 'text-gray-400 hover:bg-[#1a1f30] hover:text-cyan-400')}>{pn}</button>);
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-[#1a1f30] disabled:opacity-30 text-gray-500 hover:text-cyan-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-[#1a1f30] disabled:opacity-30 text-gray-500 hover:text-cyan-400 transition-colors"><ChevronsRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}