'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import {
  type Client,
  type Property,
  type PropertyType,
  formatPrice,
  formatPriceShort,
  getInitials,
  getAvatarColor,
} from '@/lib/types';
import { formatClientLocation } from '@/lib/matching';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  Search, Users, Building2, GitCompareArrows, MapPin, BedDouble,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Phone, Eye,
} from 'lucide-react';

const PAGE_SIZE = 10;
const LIST_PAGE_SIZE = 8;
const PROPERTY_TYPES: ('All' | PropertyType)[] = ['All', 'Apartment', 'Villa', 'Penthouse', 'Commercial', 'Plot', 'Studio'];
const MIN_SCORE_OPTIONS = [
  { value: 0, label: 'Any score' },
  { value: 25, label: '25%+' },
  { value: 50, label: '50%+' },
  { value: 75, label: '75%+' },
  { value: 100, label: '100%' },
];

type MatchedProperty = Property & {
  matchScore: number;
  matchedCriteria?: string[];
};

type MatchedClient = Client & {
  matchScore: number;
  matchedCriteria?: string[];
};

/** Returns Tailwind classes for a match-score pill based on percentage strength. */
function matchScoreClass(score: number): string {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (score >= 50) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (score >= 25) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
} // end matchScoreClass

/** Compact score badge used in match result rows. */
function MatchScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-semibold badge-glossy', matchScoreClass(score))}>
      {score}%
    </span>
  );
} // end MatchScoreBadge

/** Reusable pagination controls for list and result tables. */
function PaginationBar({
  page,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 || total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPageChange(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground hover:text-cyan-400 transition-colors">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground hover:text-cyan-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pn: number;
          if (totalPages <= 5) pn = i + 1;
          else if (page <= 3) pn = i + 1;
          else if (page >= totalPages - 2) pn = totalPages - 4 + i;
          else pn = page - 2 + i;
          return (
            <button
              key={pn}
              type="button"
              onClick={() => onPageChange(pn)}
              className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-colors', page === pn ? 'gradient-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-cyan-400')}
            >
              {pn}
            </button>
          );
        })}
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground hover:text-cyan-400 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground hover:text-cyan-400 transition-colors">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} // end PaginationBar

/** Clients tab: pick a client to auto-find matching properties. */
function ClientsMatchTab() {
  const { user, navigate } = useAppStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [matches, setMatches] = useState<MatchedProperty[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [matchPage, setMatchPage] = useState(1);
  const [matchLoading, setMatchLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [resultSearchInput, setResultSearchInput] = useState('');
  const [resultSearch, setResultSearch] = useState('');

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        role: user.role,
        page: String(listPage),
        limit: String(LIST_PAGE_SIZE),
      });
      if (search) params.set('search', search);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setClients(data.clients || []);
      setListTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    } finally {
      setListLoading(false);
    }
  }, [user, search, listPage]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const fetchMatches = useCallback(async () => {
    if (!user || !selectedClient) {
      setMatches([]);
      setMatchTotal(0);
      return;
    }
    setMatchLoading(true);
    try {
      const params = new URLSearchParams({
        direction: 'for-client',
        id: selectedClient.id,
        userId: user.id,
        role: user.role,
        page: String(matchPage),
        limit: String(PAGE_SIZE),
        minScore: String(minScore),
      });
      if (typeFilter !== 'All') params.set('type', typeFilter);
      if (resultSearch) params.set('search', resultSearch);
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      setMatches(data.matches || []);
      setMatchTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch property matches', err);
    } finally {
      setMatchLoading(false);
    }
  }, [user, selectedClient, matchPage, minScore, typeFilter, resultSearch]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  /** Selects a client and resets match result pagination/filters. */
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setMatchPage(1);
    setResultSearch('');
    setResultSearchInput('');
  }; // end handleSelectClient

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 lg:gap-6">
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col min-h-[420px]">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-foreground">Select Client</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setListPage(1); setSearch(searchInput); } }}
              className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70"
              placeholder="Search clients..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {listLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 shimmer rounded-xl" />)}</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No clients found</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {clients.map((client) => {
                const active = selectedClient?.id === client.id;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        'w-full text-left rounded-xl px-3 py-3 transition-all border',
                        active
                          ? 'bg-cyan-500/10 border-cyan-500/30 shadow-sm'
                          : 'border-transparent hover:bg-sidebar-accent/70'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', getAvatarColor(client.name))}>
                          {getInitials(client.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[client.preferredType, client.preferredBeds != null ? `${client.preferredBeds} BHK` : null, formatClientLocation(client) || null]
                              .filter(Boolean)
                              .join(' · ') || 'No preferences set'}
                          </p>
                          {(client.preferredLocality || client.preferredCity) && (
                            <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {[client.preferredLocality, client.preferredCity].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <PaginationBar page={listPage} total={listTotal} pageSize={LIST_PAGE_SIZE} onPageChange={setListPage} />
      </div>

      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4">
          {selectedClient ? (
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Matching for</p>
                <h3 className="text-lg font-bold text-foreground">{selectedClient.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {[
                    selectedClient.preferredType,
                    selectedClient.preferredBeds != null ? `${selectedClient.preferredBeds} BHK` : null,
                    selectedClient.preferredLocality ? `Locality: ${selectedClient.preferredLocality}` : null,
                    selectedClient.preferredCity ? `City: ${selectedClient.preferredCity}` : null,
                    !selectedClient.preferredLocality && !selectedClient.preferredCity && selectedClient.preferredLocation
                      ? selectedClient.preferredLocation
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Add city, locality, and other preferences for better matches'}
                  {(selectedClient.budgetMin || selectedClient.budgetMax) && (
                    <span className="ml-2 gradient-text-gold font-medium">
                      {selectedClient.budgetMin && formatPrice(selectedClient.budgetMin, 'Lakhs')}
                      {selectedClient.budgetMin && selectedClient.budgetMax && ' – '}
                      {selectedClient.budgetMax && formatPrice(selectedClient.budgetMax, 'Lakhs')}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">{matchTotal}</span> matching propert{matchTotal === 1 ? 'y' : 'ies'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <GitCompareArrows className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Select a client</p>
                <p className="text-xs text-muted-foreground">Matching properties appear automatically based on type, city, locality, and bedrooms.</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={resultSearchInput}
                onChange={(e) => setResultSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setMatchPage(1); setResultSearch(resultSearchInput); } }}
                disabled={!selectedClient}
                className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70 disabled:opacity-50"
                placeholder="Filter matching properties..."
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setMatchPage(1); }}
              disabled={!selectedClient}
              className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground/80 outline-none disabled:opacity-50"
            >
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>
            <select
              value={minScore}
              onChange={(e) => { setMinScore(Number(e.target.value)); setMatchPage(1); }}
              disabled={!selectedClient}
              className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground/80 outline-none disabled:opacity-50"
            >
              {MIN_SCORE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-base font-semibold text-muted-foreground mb-1">No client selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">Choose a client from the list to see properties that match their requirements.</p>
            </div>
          ) : matchLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-base font-semibold text-muted-foreground mb-1">No matching properties</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">Try lowering the minimum score or updating the client&apos;s preferred type, location, or bedrooms.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Property ID</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Title</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Price</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">City</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Locality</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Bedrooms</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Area</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Match</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((property, i) => (
                      <motion.tr
                        key={property.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="table-row-hover cursor-pointer border-b border-muted last:border-0"
                        onClick={() => navigate('property-detail', property.id)}
                      >
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{property.propertyId || '—'}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground truncate max-w-[220px]">{property.title}</p>
                          <p className="text-[10px] text-muted-foreground">{property.propertyType}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold gradient-text-gold">{formatPriceShort(property.price, property.priceUnit)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/80">{property.city}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{property.locality}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5" />{property.bedrooms != null ? `${property.bedrooms} BHK` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/80">
                          {property.carpetArea ? `${property.carpetArea} sqft` : property.builtUpArea ? `${property.builtUpArea} sqft` : '—'}
                        </td>
                        <td className="px-4 py-3"><MatchScoreBadge score={property.matchScore} /></td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate('property-detail', property.id)}
                            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={matchPage} total={matchTotal} pageSize={PAGE_SIZE} onPageChange={setMatchPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
} // end ClientsMatchTab

/** Properties tab: pick a property to auto-find matching clients. */
function PropertiesMatchTab() {
  const { user, navigate } = useAppStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const [matches, setMatches] = useState<MatchedClient[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [matchPage, setMatchPage] = useState(1);
  const [matchLoading, setMatchLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [minScore, setMinScore] = useState(0);
  const [resultSearchInput, setResultSearchInput] = useState('');
  const [resultSearch, setResultSearch] = useState('');

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        role: user.role,
        page: String(listPage),
        limit: String(LIST_PAGE_SIZE),
      });
      if (search) params.set('search', search);
      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setListTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch properties', err);
    } finally {
      setListLoading(false);
    }
  }, [user, search, listPage]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const fetchMatches = useCallback(async () => {
    if (!user || !selectedProperty) {
      setMatches([]);
      setMatchTotal(0);
      return;
    }
    setMatchLoading(true);
    try {
      const params = new URLSearchParams({
        direction: 'for-property',
        id: selectedProperty.id,
        userId: user.id,
        role: user.role,
        page: String(matchPage),
        limit: String(PAGE_SIZE),
        minScore: String(minScore),
      });
      if (typeFilter !== 'All') params.set('type', typeFilter);
      if (resultSearch) params.set('search', resultSearch);
      const res = await fetch(`/api/matches?${params}`);
      const data = await res.json();
      setMatches(data.matches || []);
      setMatchTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch client matches', err);
    } finally {
      setMatchLoading(false);
    }
  }, [user, selectedProperty, matchPage, minScore, typeFilter, resultSearch]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  /** Selects a property and resets match result pagination/filters. */
  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setMatchPage(1);
    setResultSearch('');
    setResultSearchInput('');
  }; // end handleSelectProperty

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 lg:gap-6">
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col min-h-[420px]">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-foreground">Select Property</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setListPage(1); setSearch(searchInput); } }}
              className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70"
              placeholder="Search properties..."
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {listLoading ? (
            <div className="p-3 space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 shimmer rounded-xl" />)}</div>
          ) : properties.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No properties found</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {properties.map((property) => {
                const active = selectedProperty?.id === property.id;
                return (
                  <li key={property.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectProperty(property)}
                      className={cn(
                        'w-full text-left rounded-xl px-3 py-3 transition-all border',
                        active
                          ? 'bg-cyan-500/10 border-cyan-500/30 shadow-sm'
                          : 'border-transparent hover:bg-sidebar-accent/70'
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground truncate">{property.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {[property.propertyId, property.propertyType, property.bedrooms != null ? `${property.bedrooms} BHK` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {property.locality}, {property.city}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <PaginationBar page={listPage} total={listTotal} pageSize={LIST_PAGE_SIZE} onPageChange={setListPage} />
      </div>

      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-4">
          {selectedProperty ? (
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Matching for</p>
                <h3 className="text-lg font-bold text-foreground">{selectedProperty.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {[selectedProperty.propertyType, selectedProperty.bedrooms != null ? `${selectedProperty.bedrooms} BHK` : null, `${selectedProperty.locality}, ${selectedProperty.city}`]
                    .filter(Boolean)
                    .join(' · ')}
                  <span className="ml-2 gradient-text-gold font-medium">
                    {formatPriceShort(selectedProperty.price, selectedProperty.priceUnit)}
                  </span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">{matchTotal}</span> matching client{matchTotal === 1 ? '' : 's'}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <GitCompareArrows className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Select a property</p>
                <p className="text-xs text-muted-foreground">Matching clients appear automatically based on type, city, locality, and bedrooms.</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={resultSearchInput}
                onChange={(e) => setResultSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setMatchPage(1); setResultSearch(resultSearchInput); } }}
                disabled={!selectedProperty}
                className="w-full pl-9 pr-4 py-2.5 h-10 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors placeholder:text-muted-foreground/70 disabled:opacity-50"
                placeholder="Filter matching clients..."
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setMatchPage(1); }}
              disabled={!selectedProperty}
              className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground/80 outline-none disabled:opacity-50"
            >
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>
            <select
              value={minScore}
              onChange={(e) => { setMinScore(Number(e.target.value)); setMatchPage(1); }}
              disabled={!selectedProperty}
              className="h-10 px-3 rounded-xl bg-muted border border-border text-sm text-foreground/80 outline-none disabled:opacity-50"
            >
              {MIN_SCORE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {!selectedProperty ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-base font-semibold text-muted-foreground mb-1">No property selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">Choose a property from the list to see clients whose requirements match.</p>
            </div>
          ) : matchLoading ? (
            <div className="p-4 space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 shimmer rounded-xl" />)}</div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-base font-semibold text-muted-foreground mb-1">No matching clients</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">Try lowering the minimum score or check that clients have preferred type, location, and bedrooms set.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Client Name</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Contact</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Required Type</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">City</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Locality</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Budget</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Bedrooms</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Match</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((client, i) => (
                      <motion.tr
                        key={client.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="table-row-hover cursor-pointer border-b border-muted last:border-0"
                        onClick={() => navigate('client-detail', client.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', getAvatarColor(client.name))}>
                              {getInitials(client.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{client.name}</p>
                              <p className="text-[10px] text-muted-foreground">{client.clientType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground/80 inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {client.phone}
                          </span>
                          {client.email && <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">{client.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/80">{client.preferredType || '—'}</td>
                        <td className="px-4 py-3 text-sm text-foreground/80">
                          {client.preferredCity || (!client.preferredLocality ? (client.preferredLocation || '—') : '—')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.preferredLocality || (!client.preferredCity ? (client.preferredLocation || '—') : '—')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {client.budgetMin || client.budgetMax ? (
                            <span className="text-sm font-medium gradient-text-gold">
                              {client.budgetMin && formatPrice(client.budgetMin, 'Lakhs')}
                              {client.budgetMin && client.budgetMax && ' – '}
                              {client.budgetMax && formatPrice(client.budgetMax, 'Lakhs')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/70">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground/80">
                          {client.preferredBeds != null ? `${client.preferredBeds} BHK` : '—'}
                        </td>
                        <td className="px-4 py-3"><MatchScoreBadge score={client.matchScore} /></td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => navigate('client-detail', client.id)}
                            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={matchPage} total={matchTotal} pageSize={PAGE_SIZE} onPageChange={setMatchPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
} // end PropertiesMatchTab

/** Main Matches page with Clients ↔ Properties bi-directional matching tabs. */
export function MatchesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Matches</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Automatically match clients to properties and properties to clients by type, city, locality, and bedrooms.
        </p>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList className="h-11 p-1 bg-muted/80 border border-border rounded-xl">
          <TabsTrigger
            value="clients"
            className="rounded-lg px-4 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
          >
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger
            value="properties"
            className="rounded-lg px-4 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-400 data-[state=active]:shadow-none"
          >
            <Building2 className="w-4 h-4" />
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-0">
          <ClientsMatchTab />
        </TabsContent>
        <TabsContent value="properties" className="mt-0">
          <PropertiesMatchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
} // end MatchesPage
