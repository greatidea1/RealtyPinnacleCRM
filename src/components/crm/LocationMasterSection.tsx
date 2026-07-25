'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { City, LocationMasterRow } from '@/lib/types';
import { motion } from 'framer-motion';
import {
  MapPin, Plus, Pencil, Trash2, Upload, Download, Merge, Search,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Admin Location Master: search, CSV import/export, edit, delete, and merge localities. */
export function LocationMasterSection() {
  const { user } = useAppStore();
  const [locations, setLocations] = useState<LocationMasterRow[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<LocationMasterRow | null>(null);
  const [mergeSource, setMergeSource] = useState<LocationMasterRow | null>(null);

  const [addForm, setAddForm] = useState({ locality: '', city: '' });
  const [editForm, setEditForm] = useState({ locality: '', cityId: '' });
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  /** Loads Location Master rows from the API. */
  const load = useCallback(async (q = search) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      const res = await fetch(`/api/locations?${params.toString()}`);
      const data = await res.json();
      setLocations(data.locations || []);
      setCities(data.cities || []);
    } catch {
      setMsg({ type: 'error', text: 'Failed to load locations' });
    } finally {
      setLoading(false);
    }
  }, [user, search]);
  // End load

  useEffect(() => {
    load('');
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { load(search); }, 250);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => {
      const cityCmp = a.city.localeCompare(b.city);
      return cityCmp !== 0 ? cityCmp : a.locality.localeCompare(b.locality);
    }),
    [locations]
  );

  /** Creates a new city–locality pair in Location Master. */
  const handleAdd = async () => {
    if (!addForm.locality.trim() || !addForm.city.trim()) {
      setMsg({ type: 'error', text: 'Locality and City are required' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          locality: addForm.locality,
          city: addForm.city,
          adminId: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Failed to add' }); return; }
      setMsg({ type: 'success', text: 'Location added' });
      setShowAdd(false);
      setAddForm({ locality: '', city: '' });
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Failed to add location' });
    } finally {
      setBusy(false);
    }
  };
  // End handleAdd

  /** Saves edits to a locality (name and/or city). */
  const handleEdit = async () => {
    if (!editing) return;
    if (!editForm.locality.trim() || !editForm.cityId) {
      setMsg({ type: 'error', text: 'Locality and City are required' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user?.id,
          entity: 'locality',
          id: editing.id,
          name: editForm.locality,
          cityId: editForm.cityId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Failed to update' }); return; }
      setMsg({ type: 'success', text: 'Location updated' });
      setShowEdit(false);
      setEditing(null);
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Failed to update location' });
    } finally {
      setBusy(false);
    }
  };
  // End handleEdit

  /** Deletes a locality that is not referenced by clients or properties. */
  const handleDelete = async (row: LocationMasterRow) => {
    if (!confirm(`Delete locality "${row.locality}" in ${row.city}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/locations?entity=locality&id=${encodeURIComponent(row.id)}&adminId=${user?.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Failed to delete' }); return; }
      setMsg({ type: 'success', text: 'Location deleted' });
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Failed to delete location' });
    } finally {
      setBusy(false);
    }
  };
  // End handleDelete

  /** Merges a duplicate locality into a target locality, reassigning references. */
  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId) {
      setMsg({ type: 'error', text: 'Select a target locality to merge into' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge',
          adminId: user?.id,
          sourceLocalityId: mergeSource.id,
          targetLocalityId: mergeTargetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Failed to merge' }); return; }
      setMsg({ type: 'success', text: data.message || 'Localities merged' });
      setShowMerge(false);
      setMergeSource(null);
      setMergeTargetId('');
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Failed to merge localities' });
    } finally {
      setBusy(false);
    }
  };
  // End handleMerge

  /** Imports City–Locality rows from CSV (Column A Locality, Column B City). */
  const handleImport = async () => {
    if (!importText.trim()) {
      setMsg({ type: 'error', text: 'Paste or upload CSV content first' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', csv: importText, adminId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Import failed' }); return; }
      setMsg({
        type: 'success',
        text: `Imported ${data.created} new, skipped ${data.skipped} duplicates (${data.citiesCreated} new cities).`,
      });
      setShowImport(false);
      setImportText('');
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Import failed' });
    } finally {
      setBusy(false);
    }
  };
  // End handleImport

  /** Downloads Location Master as CSV. */
  const handleExport = async () => {
    try {
      const res = await fetch(`/api/locations?action=export&adminId=${user?.id}`);
      if (!res.ok) {
        const data = await res.json();
        setMsg({ type: 'error', text: data.error || 'Export failed' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'location-master.csv';
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'CSV exported' });
    } catch {
      setMsg({ type: 'error', text: 'Export failed' });
    }
  };
  // End handleExport

  /** Reads a selected CSV file into the import textarea. */
  const handleFileUpload = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ''));
    reader.readAsText(file);
  };
  // End handleFileUpload

  const mergeTargets = sortedLocations.filter((l) => l.id !== mergeSource?.id);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-foreground">Location Master</h2>
          <span className="text-xs text-muted-foreground">{locations.length} localities</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowImport(true); setMsg(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch('/api/locations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'seed', adminId: user?.id }),
                });
                const data = await res.json();
                if (!res.ok) { setMsg({ type: 'error', text: data.error || 'Sync failed' }); return; }
                setMsg({
                  type: 'success',
                  text: `Synced ${data.linkedProperties} properties and ${data.linkedClients} clients into Location Master.`,
                });
                await load();
              } catch {
                setMsg({ type: 'error', text: 'Sync failed' });
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors disabled:opacity-50"
          >
            Sync Existing
          </button>
          <button
            onClick={() => { setShowAdd(true); setMsg(null); setAddForm({ locality: '', city: '' }); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30"
          >
            <Plus className="w-3.5 h-3.5" /> Add Location
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Central City / Locality directory used by Client and Property forms. CSV format: Column A = Locality, Column B = City.
      </p>

      {msg && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm mb-4',
          msg.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        )}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities or localities..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 shimmer rounded-xl" />)}
        </div>
      ) : sortedLocations.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground">
          No locations yet. Import a CSV or add cities and localities manually.
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Locality</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">City</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Usage</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedLocations.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-secondary hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.locality}</td>
                  <td className="px-4 py-3 text-sm text-foreground/80">{row.city}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.propertyCount} prop · {row.clientCount} client
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Edit"
                        onClick={() => {
                          setEditing(row);
                          setEditForm({ locality: row.locality, cityId: row.cityId });
                          setShowEdit(true);
                          setMsg(null);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Merge duplicate"
                        onClick={() => {
                          setMergeSource(row);
                          setMergeTargetId('');
                          setShowMerge(true);
                          setMsg(null);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete"
                        disabled={busy}
                        onClick={() => handleDelete(row)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Locality *</Label>
              <input
                value={addForm.locality}
                onChange={(e) => setAddForm({ ...addForm, locality: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm outline-none focus:border-cyan-500/50"
                placeholder="e.g. Andheri West"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">City *</Label>
              <input
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm outline-none focus:border-cyan-500/50"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm bg-muted border border-border">Cancel</button>
              <button onClick={handleAdd} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">Edit Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Locality *</Label>
              <input
                value={editForm.locality}
                onChange={(e) => setEditForm({ ...editForm, locality: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">City *</Label>
              <Select value={editForm.cityId} onValueChange={(v) => setEditForm({ ...editForm, cityId: v })}>
                <SelectTrigger className="bg-muted border-border text-foreground w-full">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {[...cities].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2.5 rounded-xl text-sm bg-muted border border-border">Cancel</button>
              <button onClick={handleEdit} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge */}
      <Dialog open={showMerge} onOpenChange={setShowMerge}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">Merge Duplicate Locality</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Merge <span className="text-foreground font-medium">{mergeSource?.locality}</span>
              {mergeSource ? ` (${mergeSource.city})` : ''} into another locality. All clients and properties will be reassigned.
            </p>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Merge into *</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger className="bg-muted border-border text-foreground w-full">
                  <SelectValue placeholder="Select target locality" />
                </SelectTrigger>
                <SelectContent>
                  {mergeTargets.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.locality} — {l.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowMerge(false)} className="px-4 py-2.5 rounded-xl text-sm bg-muted border border-border">Cancel</button>
              <button onClick={handleMerge} disabled={busy || !mergeTargetId} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                Merge
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">Import CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Expected format: <code className="text-cyan-400">Locality,City</code> (header optional). Duplicate City–Locality pairs are ignored; missing cities are created automatically.
            </p>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Upload file</Label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-cyan-500/15 file:text-cyan-400"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Or paste CSV</Label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-mono outline-none focus:border-cyan-500/50 resize-none"
                placeholder={'Locality,City\nAndheri West,Mumbai\nKoregaon Park,Pune'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 rounded-xl text-sm bg-muted border border-border">Cancel</button>
              <button onClick={handleImport} disabled={busy} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// End LocationMasterSection
