'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useCrmRefresh, useLoadingGate } from '@/hooks/use-crm-refresh';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Plus, LayoutGrid, List, Eye, Pencil, Trash2,
  BedDouble, Bath, Maximize2, MapPin, ArrowLeft,
  ChevronLeft, ChevronRight, Navigation, Building2,
  X, Calendar, Shield, Hash, User, Phone, Mail,
} from 'lucide-react';
import type { Property, PropertyStatus, PropertyType } from '@/lib/types';
import { STATUS_COLORS, formatPrice, formatPriceShort, ALL_AMENITIES, getInitials, getAvatarColor, timeAgo, PRIORITY_COLORS, STAGE_COLORS } from '@/lib/types';
import { LocationCombobox } from '@/components/crm/LocationCombobox';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

const PROPERTY_TYPES: PropertyType[] = ['Apartment', 'Villa', 'Penthouse', 'Commercial', 'Plot', 'Studio'];
const STATUS_FILTERS = [{ label: 'All', value: '' }, { label: 'Active', value: 'Active' }, { label: 'Pending', value: 'Pending' }, { label: 'Sold', value: 'Sold' }];
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'];
const AGE_OPTIONS = ['New Construction', '0-5 Years', '5-10 Years', '10-20 Years', '20+ Years'];
const FURNISH_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
const PAGE_SIZE = 12;

const STEP_TITLES = ['Basic Info', 'Location', 'Pricing & Details', 'Amenities', 'Contact & RERA'];

/* ─── Properties List ───────────────────────────────────────────────────── */

export function PropertiesListPage() {
  const { user, navigate, openPropertyForm, openDeleteDialog } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const { loading, refreshing, begin, end } = useLoadingGate();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchProps = useCallback(async () => {
    if (!user) return;
    begin();
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setStatusCounts(data.counts || data.statusCounts || {});
    } catch {} finally { end(); }
  }, [user, statusFilter, typeFilter, search, page, begin, end]);

  useCrmRefresh(fetchProps, [user, statusFilter, typeFilter, search, page]);
  const handleSearch = () => { setPage(1); setSearch(searchInput); };
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) return <div className="p-4 sm:p-6 space-y-4"><div className="h-8 w-48 max-w-full shimmer rounded-lg" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-48 shimmer rounded-2xl" />)}</div></div>;

  return (
    <div className={cn('p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto transition-opacity', refreshing && 'opacity-70')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Properties</h1><p className="text-sm text-muted-foreground mt-0.5">{total} listing{total !== 1 ? 's' : ''}</p></div>
        <button onClick={() => openPropertyForm()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-cyan-900/30"><Plus className="w-4 h-4" /> Add Property</button>
      </div>

      {/* Toolbar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70" placeholder="Search by title, locality..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  statusFilter === f.value ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'text-muted-foreground border-border hover:border-border')}>
                {f.label} {f.value && statusCounts[f.value] ? `(${statusCounts[f.value]})` : ''}
              </button>
            ))}
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="h-8 px-3 rounded-lg bg-muted border border-border text-xs text-foreground/80 outline-none">
              <option value="">All Types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex bg-muted rounded-lg p-0.5 border border-border">
              <button onClick={() => setViewMode('table')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-accent text-cyan-400' : 'text-muted-foreground')}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('grid')} className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-accent text-cyan-400' : 'text-muted-foreground')}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Property</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Type</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Locality</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">City</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Price</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                {user?.role === 'ADMIN' && <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Agent</th>}
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
              </tr></thead>
              <tbody>
                {properties.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                    className="table-row-hover cursor-pointer border-b border-muted last:border-0" onClick={() => navigate('property-detail', p.id)}>
                    <td className="px-4 py-3"><p className="text-sm font-semibold text-foreground truncate max-w-[200px]">{p.title}</p><p className="text-[10px] text-muted-foreground">{p.propertyId || ''}{p.propertyId && ' · '}{p.bedrooms || 0}BHK &middot; {p.carpetArea || 0} sqft</p></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.propertyType}</td>
                    <td className="px-4 py-3"><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{p.locality || '—'}</p></td>
                    <td className="px-4 py-3 text-sm text-foreground/80">{p.city || '—'}</td>
                    <td className="px-4 py-3 text-right"><span className="text-sm font-bold gradient-text-gold">{formatPriceShort(p.price, p.priceUnit)}</span></td>
                    <td className="px-4 py-3"><span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', STATUS_COLORS[p.status])}>{p.status}</span></td>
                    {user?.role === 'ADMIN' && <td className="px-4 py-3"><div className="flex items-center gap-2"><div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white', getAvatarColor(p.assignedTo?.name || ''))}>{getInitials(p.assignedTo?.name || '')}</div><span className="text-xs text-muted-foreground">{p.assignedTo?.name || ''}</span></div></td>}
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate('property-detail', p.id)} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openPropertyForm(p)} className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => openDeleteDialog('property', p.id, p.title)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Showing {(page-1)*PAGE_SIZE+1}&ndash;{Math.min(page*PAGE_SIZE, total)} of {total}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
                {Array.from({length: Math.min(5, totalPages)}, (_, i) => { let pn: number; if (totalPages<=5) pn=i+1; else if (page<=3) pn=i+1; else if (page>=totalPages-2) pn=totalPages-4+i; else pn=page-2+i; return <button key={pn} onClick={() => setPage(pn)} className={cn('w-8 h-8 rounded-lg text-xs font-medium', page===pn ? 'gradient-primary text-white' : 'text-muted-foreground hover:bg-sidebar-accent')}>{pn}</button>; })}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {properties.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate('property-detail', p.id)} className="glass-card glass-card-hover rounded-2xl overflow-hidden cursor-pointer group">
              <div className="h-36 bg-gradient-to-br from-[#1a2030] to-[#13151e] flex items-center justify-center relative">
                <Building2 className="w-12 h-12 text-gray-700" />
                <span className={cn('absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[p.status])}>{p.status}</span>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-foreground truncate mb-0.5">{p.title}</p>
                {p.propertyId && <p className="text-[10px] text-cyan-400 font-mono mb-1">{p.propertyId}</p>}
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="w-3 h-3" />{p.locality}, {p.city}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
                  {p.bedrooms && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.bedrooms} Bed</span>}
                  {p.bathrooms && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.bathrooms} Bath</span>}
                  {p.carpetArea && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{p.carpetArea} sqft</span>}
                </div>
                <p className="text-lg font-bold gradient-text-gold">{formatPrice(p.price, p.priceUnit)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Property Detail ───────────────────────────────────────────────────── */

export function PropertyDetailPage() {
  const { user, selectedId, navigate, goBack, openPropertyForm, openDeleteDialog } = useAppStore();
  const [property, setProperty] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) return;
    Promise.all([
      fetch(`/api/properties?id=${selectedId}&userId=${user?.id}&role=${user?.role}`).then(r => r.json()),
      fetch(`/api/deals?userId=${user?.id}&role=${user?.role}`).then(r => r.json()),
      fetch(`/api/tasks?userId=${user?.id}&role=${user?.role}&filter=all`).then(r => r.json()),
    ]).then(([propData, dealData, taskData]) => {
      setProperty(propData.property || null);
      setDeals((dealData.deals || []).filter((d: any) => d.propertyId === selectedId));
      setTasks((taskData.tasks || []).filter((t: any) => t.propertyId === selectedId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedId, user]);

  if (loading) return <div className="p-6"><div className="h-96 shimmer rounded-2xl" /></div>;
  if (!property) return <div className="p-8 text-center text-muted-foreground">Property not found</div>;

  const isOwner = property.assignedToId === user?.id || user?.role === 'ADMIN';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400"><ArrowLeft className="w-4 h-4" /> Back to Properties</button>
        {isOwner && (
          <div className="flex gap-2">
            <button onClick={() => openPropertyForm(property)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20"><Pencil className="w-3.5 h-3.5" /> Edit</button>
            <button onClick={() => openDeleteDialog('property', property.id, property.title)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-[#1a2030] to-[#13151e] flex items-center justify-center relative">
          <Building2 className="w-20 h-20 text-gray-700" />
          <div className="absolute bottom-4 left-6">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[property.status])}>{property.status}</span>
              <span className="text-xs px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{property.propertyType}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{property.title}</h1>
          </div>
          <div className="absolute bottom-4 right-6 text-right">
            <p className="text-2xl font-bold gradient-text-gold">{formatPrice(property.price, property.priceUnit)}</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {property.bedrooms && <InfoPill icon={BedDouble} label="Bedrooms" value={`${property.bedrooms}`} />}
          {property.bathrooms && <InfoPill icon={Bath} label="Bathrooms" value={`${property.bathrooms}`} />}
          {property.carpetArea && <InfoPill icon={Maximize2} label="Carpet Area" value={`${property.carpetArea} sqft`} />}
          {property.floorNumber && <InfoPill icon={Layers} label="Floor" value={`${property.floorNumber} of ${property.totalFloors || '?'}`} />}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Location */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400" /> Location</h3>
          <div className="space-y-2.5">
            <DetailRow label="Address" value={property.fullAddress} />
            <DetailRow label="Locality" value={property.locality} />
            <DetailRow label="City" value={property.city} />
            {property.pincode && <DetailRow label="Pincode" value={property.pincode} />}
            {property.landmark && <DetailRow label="Landmark" value={property.landmark} />}
          </div>
          {property.latitude && property.longitude && (
            <div className="mt-4 rounded-xl overflow-hidden h-48 bg-sidebar border border-border">
              <StaticMap lat={property.latitude} lng={property.longitude} />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-400" /> Details</h3>
          <div className="space-y-2.5">
            <DetailRow label="Project" value={property.projectName} />
            <DetailRow label="Developer" value={property.developerName} />
            <DetailRow label="RERA No." value={property.reraNumber} />
            <DetailRow label="Facing" value={property.facing} />
            <DetailRow label="Age" value={property.ageOfProperty} />
            <DetailRow label="Furnishing" value={property.furnishing} />
            {property.builtUpArea && <DetailRow label="Built-up Area" value={`${property.builtUpArea} sqft`} />}
          </div>
        </div>

        {/* Contact */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><User className="w-4 h-4 text-cyan-400" /> Contact</h3>
          <div className="space-y-2.5">
            <DetailRow label="Contact Person" value={property.contactPerson} />
            <DetailRow label="Phone" value={property.contactPhone} />
            <DetailRow label="Email" value={property.contactEmail} />
            <DetailRow label="Designation" value={property.contactDesignation} />
          </div>
        </div>

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map(a => (
                <span key={a.id} className="text-[10px] px-2.5 py-1 rounded-full bg-muted border border-border text-foreground/80">{a.amenity}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Linked Deals & Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Deals ({deals.length})</h3>
          {deals.length === 0 ? <p className="text-xs text-muted-foreground">No deals linked</p> : deals.map(d => (
            <button key={d.id} onClick={() => navigate('deal-detail', d.id)} className="w-full text-left p-2 rounded-lg hover:bg-sidebar-accent transition-colors mb-1">
              <p className="text-sm text-foreground">{d.client?.name}</p>
              <p className="text-[10px] text-muted-foreground">{d.stage} &middot; {d.dealValue ? formatPriceShort(d.dealValue, 'Lakhs') : ''}</p>
            </button>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Tasks ({tasks.length})</h3>
          {tasks.length === 0 ? <p className="text-xs text-muted-foreground">No tasks linked</p> : tasks.slice(0, 5).map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg mb-1">
              <span className={cn('w-4 h-4 rounded border flex items-center justify-center text-[8px]', t.isCompleted ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-border')}>
                {t.isCompleted ? '\u2713' : ''}
              </span>
              <span className={cn('text-sm flex-1', t.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground/80')}>{t.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-cyan-400" /></div>
      <div><p className="text-[10px] text-muted-foreground uppercase">{label}</p><p className="text-sm font-semibold text-foreground">{value}</p></div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div className="flex justify-between py-1.5 border-b border-muted"><span className="text-xs text-muted-foreground">{label}</span><span className="text-xs text-foreground/80 text-right max-w-[60%] truncate">{value}</span></div>;
}

function Layers(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>; }

/* ─── Static Map for Detail View ────────────────────────────────────────── */

function StaticMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <iframe
      width="100%" height="100%" style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)' }}
      loading="lazy" referrerPolicy="no-referrer-when-downgrade"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`}
    />
  );
}

/* ─── Property Form ──────────────────────────────────────────────────────── */

export function PropertyForm() {
  const { user, showPropertyForm, editingProperty, closePropertyForm, bumpDataVersion } = useAppStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '', propertyType: 'Apartment' as PropertyType, bedrooms: '', bathrooms: '',
    carpetArea: '', builtUpArea: '', price: '', priceUnit: 'Lakhs',
    floorNumber: '', totalFloors: '', ageOfProperty: '', facing: '',
    locality: '', city: '', cityId: '', localityId: '', pincode: '', fullAddress: '', landmark: '',
    latitude: '', longitude: '', reraNumber: '', developerName: '',
    projectName: '', contactPerson: '', contactPhone: '', contactEmail: '',
    contactDesignation: '', description: '', furnishing: '',
    status: 'Active' as PropertyStatus, amenities: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]);

  useEffect(() => {
    if (!showPropertyForm) return;
    let cancelled = false;
    setStep(0);
    setError('');

    /** Hydrates form state and resolves Location Master IDs for legacy free-text values. */
    const hydrate = async () => {
      if (editingProperty) {
        const p = editingProperty;
        let cityId = p.cityId || '';
        let localityId = p.localityId || '';
        if ((p.city || p.locality) && (!cityId || !localityId)) {
          try {
            if (p.city && !cityId) {
              const cityRes = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-city', name: p.city }),
              });
              const cityData = await cityRes.json();
              if (cityData.city) cityId = cityData.city.id;
            }
            if (p.locality && cityId && !localityId) {
              const locRes = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-locality', name: p.locality, cityId }),
              });
              const locData = await locRes.json();
              if (locData.locality) localityId = locData.locality.id;
            }
          } catch { /* keep free-text values */ }
        }
        if (cancelled) return;
        setForm({
          title: p.title, propertyType: p.propertyType, bedrooms: String(p.bedrooms || ''),
          bathrooms: String(p.bathrooms || ''), carpetArea: String(p.carpetArea || ''),
          builtUpArea: String(p.builtUpArea || ''), price: String(p.price),
          priceUnit: p.priceUnit, floorNumber: String(p.floorNumber || ''),
          totalFloors: String(p.totalFloors || ''), ageOfProperty: p.ageOfProperty || '',
          facing: p.facing || '', locality: p.locality, city: p.city, cityId, localityId,
          pincode: p.pincode || '', fullAddress: p.fullAddress, landmark: p.landmark || '',
          latitude: String(p.latitude || ''), longitude: String(p.longitude || ''),
          reraNumber: p.reraNumber || '', developerName: p.developerName || '',
          projectName: p.projectName || '', contactPerson: p.contactPerson || '',
          contactPhone: p.contactPhone || '', contactEmail: p.contactEmail || '',
          contactDesignation: p.contactDesignation || '', description: p.description || '',
          furnishing: p.furnishing || '', status: p.status,
          amenities: p.amenities?.map(a => a.amenity) || [],
        });
        if (p.latitude && p.longitude) setMapCenter([p.latitude, p.longitude]);
      } else {
        setForm({ title: '', propertyType: 'Apartment', bedrooms: '', bathrooms: '', carpetArea: '', builtUpArea: '', price: '', priceUnit: 'Lakhs', floorNumber: '', totalFloors: '', ageOfProperty: '', facing: '', locality: '', city: '', cityId: '', localityId: '', pincode: '', fullAddress: '', landmark: '', latitude: '', longitude: '', reraNumber: '', developerName: '', projectName: '', contactPerson: '', contactPhone: '', contactEmail: '', contactDesignation: '', description: '', furnishing: '', status: 'Active', amenities: [] });
        setMapCenter([18.5204, 73.8567]);
      }
    };
    // End hydrate

    hydrate();
    return () => { cancelled = true; };
  }, [showPropertyForm, editingProperty]);

  const toggleAmenity = (a: string) => {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price) { setError('Title and price are required'); setStep(0); return; }
    if (!form.city || !form.locality) { setError('City and Locality are required'); setStep(1); return; }
    setLoading(true); setError('');
    try {
      const payload: any = {
        userId: user?.id,
        title: form.title, propertyType: form.propertyType,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        carpetArea: form.carpetArea ? parseInt(form.carpetArea) : null,
        builtUpArea: form.builtUpArea ? parseInt(form.builtUpArea) : null,
        price: parseFloat(form.price), priceUnit: form.priceUnit,
        floorNumber: form.floorNumber ? parseInt(form.floorNumber) : null,
        totalFloors: form.totalFloors ? parseInt(form.totalFloors) : null,
        ageOfProperty: form.ageOfProperty || null, facing: form.facing || null,
        locality: form.locality, city: form.city,
        cityId: form.cityId || null, localityId: form.localityId || null,
        pincode: form.pincode || null,
        fullAddress: form.fullAddress || form.locality, landmark: form.landmark || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        reraNumber: form.reraNumber || null, developerName: form.developerName || null,
        projectName: form.projectName || null, contactPerson: form.contactPerson || null,
        contactPhone: form.contactPhone || null, contactEmail: form.contactEmail || null,
        contactDesignation: form.contactDesignation || null, description: form.description || null,
        furnishing: form.furnishing || null, status: form.status,
        amenities: form.amenities,
      };
      if (editingProperty) payload.id = editingProperty.id;
      const res = await fetch('/api/properties', {
        method: editingProperty ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error || 'Failed to save property');
        return;
      }
      bumpDataVersion();
      closePropertyForm();
    } catch { setError('Failed to save property'); }
    finally { setLoading(false); }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70';
  const selectCls = 'w-full bg-muted border-border text-foreground';

  return (
    <Dialog open={showPropertyForm} onOpenChange={open => { if (!open) closePropertyForm(); }}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-popover border-border text-foreground">
        <DialogHeader><DialogTitle className="text-foreground pr-8">{editingProperty ? 'Edit Property' : 'Add New Property'}</DialogTitle></DialogHeader>

        {/* Step tracker */}
        <div className="flex items-center gap-1 sm:gap-2 mb-6 min-w-0">
          {STEP_TITLES.map((t, i) => (
            <div key={i} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                i < step ? 'step-completed text-foreground' : i === step ? 'step-active text-cyan-400' : 'step-pending text-muted-foreground'
              )}>{i < step ? '\u2713' : i + 1}</div>
              <span className={cn('text-[10px] hidden md:block truncate', i === step ? 'text-cyan-400' : 'text-muted-foreground')}>{t}</span>
              {i < STEP_TITLES.length - 1 && <div className="flex-1 h-px bg-border mx-1 min-w-2" />}
            </div>
          ))}
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm mb-4">{error}</div>}

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Property Title *</Label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Property title" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type *</Label><Select value={form.propertyType} onValueChange={v => setForm({ ...form, propertyType: v as PropertyType })}><SelectTrigger className={selectCls}><SelectValue /></SelectTrigger><SelectContent>{PROPERTY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label><Select value={form.status} onValueChange={v => setForm({ ...form, status: v as PropertyStatus })}><SelectTrigger className={selectCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Sold">Sold</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bedrooms</Label><input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} className={inputCls} placeholder="3" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bathrooms</Label><input type="number" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} className={inputCls} placeholder="2" /></div>
              <div className="col-span-1"><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Carpet Area (sqft)</Label><input type="number" value={form.carpetArea} onChange={e => setForm({ ...form, carpetArea: e.target.value })} className={inputCls} placeholder="1200" /></div>
              <div className="col-span-1"><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Built-up (sqft)</Label><input type="number" value={form.builtUpArea} onChange={e => setForm({ ...form, builtUpArea: e.target.value })} className={inputCls} placeholder="1400" /></div>
            </div>
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={cn(inputCls, 'resize-none')} placeholder="Property description..." /></div>
            <div className="flex justify-end"><button onClick={() => setStep(1)} className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-medium text-white">Next</button></div>
          </div>
        )}

        {/* Step 1: Location with Map */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">City *</Label>
                <LocationCombobox
                  mode="city"
                  valueId={form.cityId}
                  valueName={form.city}
                  placeholder="Select city"
                  allowClear={false}
                  onSelect={(sel) => {
                    setForm((f) => ({
                      ...f,
                      cityId: sel?.id || '',
                      city: sel?.name || '',
                      localityId: '',
                      locality: '',
                    }));
                  }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Locality *</Label>
                <LocationCombobox
                  mode="locality"
                  valueId={form.localityId}
                  valueName={form.locality}
                  cityId={form.cityId}
                  cityName={form.city}
                  placeholder="Select locality"
                  allowClear={false}
                  onSelect={(sel) => {
                    setForm((f) => ({
                      ...f,
                      localityId: sel?.id || '',
                      locality: sel?.name || '',
                    }));
                  }}
                />
              </div>
            </div>
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Address</Label><input value={form.fullAddress} onChange={e => setForm({ ...form, fullAddress: e.target.value })} className={inputCls} placeholder="Full address" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pincode</Label><input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} className={inputCls} placeholder="411045" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Landmark</Label><input value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })} className={inputCls} placeholder="Landmark" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Latitude</Label><input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className={inputCls} placeholder="18.5204" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Longitude</Label><input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className={inputCls} placeholder="73.8567" /></div>
            </div>

            {/* OpenStreetMap Picker */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Pin Location on Map
              </Label>
              <div className="rounded-xl overflow-hidden border border-border h-64">
                <MapPicker
                  center={mapCenter}
                  onPositionChange={(lat, lng) => {
                    setForm(f => ({ ...f, latitude: String(lat), longitude: String(lng) }));
                    setMapCenter([lat, lng]);
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1">Click on the map to set the exact property location. Coordinates will be filled automatically.</p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={() => setStep(2)} className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-medium text-white">Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Pricing & Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price *</Label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="85" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Price Unit</Label><Select value={form.priceUnit} onValueChange={v => setForm({ ...form, priceUnit: v })}><SelectTrigger className={selectCls}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lakhs">Lakhs</SelectItem><SelectItem value="Crore">Crore</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Floor No.</Label><input type="number" value={form.floorNumber} onChange={e => setForm({ ...form, floorNumber: e.target.value })} className={inputCls} placeholder="5" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Total Floors</Label><input type="number" value={form.totalFloors} onChange={e => setForm({ ...form, totalFloors: e.target.value })} className={inputCls} placeholder="20" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Age</Label><Select value={form.ageOfProperty} onValueChange={v => setForm({ ...form, ageOfProperty: v })}><SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{AGE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Facing</Label><Select value={form.facing} onValueChange={v => setForm({ ...form, facing: v })}><SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{FACING_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Furnishing</Label><Select value={form.furnishing} onValueChange={v => setForm({ ...form, furnishing: v })}><SelectTrigger className={selectCls}><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{FURNISH_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={() => setStep(3)} className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-medium text-white">Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Amenities */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ALL_AMENITIES.map(a => (
                <button key={a} onClick={() => toggleAmenity(a)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    form.amenities.includes(a) ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'text-muted-foreground border-border hover:border-border')}>
                  {a}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={() => setStep(4)} className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-medium text-white">Next</button>
            </div>
          </div>
        )}

        {/* Step 4: Contact & RERA */}
        {step === 4 && (
          <div className="space-y-4">
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Project Name</Label><input value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} className={inputCls} placeholder="Project name" /></div>
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Developer Name</Label><input value={form.developerName} onChange={e => setForm({ ...form, developerName: e.target.value })} className={inputCls} placeholder="Developer name" /></div>
            <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">RERA Number</Label><input value={form.reraNumber} onChange={e => setForm({ ...form, reraNumber: e.target.value })} className={inputCls} placeholder="P52100012345" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Contact Person</Label><input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className={inputCls} placeholder="Contact person" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</Label><input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} className={inputCls} placeholder="+91 98765 43210" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</Label><input type="email" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} className={inputCls} placeholder="Email" /></div>
              <div><Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Designation</Label><input value={form.contactDesignation} onChange={e => setForm({ ...form, contactDesignation: e.target.value })} className={inputCls} placeholder="Designation" /></div>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 gradient-primary px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg shadow-cyan-900/30 disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {editingProperty ? 'Update Property' : 'Create Property'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}