'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { City, LocationMasterRow } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Pencil, Trash2, Upload, Download, Merge, Search,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Admin Location Master: search, CSV import/export, edit, delete, merge, and bulk actions. */
export function LocationMasterSection() {
  const { user } = useAppStore();
  const [locations, setLocations] = useState<LocationMasterRow[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<LocationMasterRow | null>(null);
  const [mergeSource, setMergeSource] = useState<LocationMasterRow | null>(null);
  const [bulkSources, setBulkSources] = useState<LocationMasterRow[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);

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
      setSelectedIds(new Set());
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

  const selectedRows = useMemo(
    () => sortedLocations.filter((r) => selectedIds.has(r.id)),
    [sortedLocations, selectedIds]
  );

  const allVisibleSelected =
    sortedLocations.length > 0 && sortedLocations.every((r) => selectedIds.has(r.id));
  const someVisibleSelected =
    sortedLocations.some((r) => selectedIds.has(r.id)) && !allVisibleSelected;

  /** Toggles selection for a single locality row. */
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  // End toggleSelect

  /** Selects or clears all currently visible locality rows. */
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedLocations.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  // End toggleSelectAll

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

  /** Opens single-row or bulk edit dialog for the current selection. */
  const openEditForSelection = (row?: LocationMasterRow) => {
    const rows = row ? [row] : selectedRows;
    if (rows.length === 0) return;
    setMsg(null);
    if (rows.length === 1) {
      setBulkEditMode(false);
      setEditing(rows[0]);
      setEditForm({ locality: rows[0].locality, cityId: rows[0].cityId });
    } else {
      setBulkEditMode(true);
      setEditing(null);
      setEditForm({ locality: '', cityId: rows[0].cityId });
    }
    setShowEdit(true);
  };
  // End openEditForSelection

  /** Saves single or bulk locality edits. */
  const handleEdit = async () => {
    if (!editForm.cityId) {
      setMsg({ type: 'error', text: 'City is required' });
      return;
    }
    if (!bulkEditMode && (!editing || !editForm.locality.trim())) {
      setMsg({ type: 'error', text: 'Locality and City are required' });
      return;
    }

    setBusy(true);
    try {
      if (bulkEditMode) {
        let updated = 0;
        const errors: string[] = [];
        for (const row of selectedRows) {
          const res = await fetch('/api/locations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminId: user?.id,
              entity: 'locality',
              id: row.id,
              name: row.locality,
              cityId: editForm.cityId,
            }),
          });
          const data = await res.json();
          if (!res.ok) errors.push(`${row.locality}: ${data.error || 'failed'}`);
          else updated += 1;
        }
        if (errors.length) {
          setMsg({ type: 'error', text: `Updated ${updated}; errors: ${errors.slice(0, 3).join('; ')}` });
        } else {
          setMsg({ type: 'success', text: `Updated city for ${updated} localities` });
        }
      } else if (editing) {
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
      }
      setShowEdit(false);
      setEditing(null);
      setBulkEditMode(false);
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Failed to update location' });
    } finally {
      setBusy(false);
    }
  };
  // End handleEdit

  /** Deletes one locality that is not referenced by clients or properties. */
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

  /** Deletes all selected localities that are unused. */
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`Delete ${selectedRows.length} selected localit${selectedRows.length === 1 ? 'y' : 'ies'}? Referenced rows will be skipped.`)) {
      return;
    }
    setBusy(true);
    try {
      let deleted = 0;
      const errors: string[] = [];
      for (const row of selectedRows) {
        const res = await fetch(`/api/locations?entity=locality&id=${encodeURIComponent(row.id)}&adminId=${user?.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) errors.push(`${row.locality}: ${data.error || 'failed'}`);
        else deleted += 1;
      }
      if (errors.length) {
        setMsg({
          type: 'error',
          text: `Deleted ${deleted}; ${errors.length} failed (e.g. ${errors[0]})`,
        });
      } else {
        setMsg({ type: 'success', text: `Deleted ${deleted} localit${deleted === 1 ? 'y' : 'ies'}` });
      }
      await load();
    } catch {
      setMsg({ type: 'error', text: 'Bulk delete failed' });
    } finally {
      setBusy(false);
    }
  };
  // End handleBulkDelete

  /** Opens merge dialog for one row or the current multi-selection. */
  const openMergeForSelection = (row?: LocationMasterRow) => {
    setMsg(null);
    if (row) {
      setMergeSource(row);
      setBulkSources([]);
      setMergeTargetId('');
    } else {
      if (selectedRows.length < 2) {
        setMsg({ type: 'error', text: 'Select at least 2 localities to merge' });
        return;
      }
      setMergeSource(null);
      setBulkSources(selectedRows);
      setMergeTargetId(selectedRows[0].id);
    }
    setShowMerge(true);
  };
  // End openMergeForSelection

  /** Merges one or many source localities into the chosen target. */
  const handleMerge = async () => {
    if (!mergeTargetId) {
      setMsg({ type: 'error', text: 'Select a target locality to merge into' });
      return;
    }

    const sources = mergeSource
      ? [mergeSource]
      : bulkSources.filter((s) => s.id !== mergeTargetId);

    if (sources.length === 0) {
      setMsg({ type: 'error', text: 'Nothing to merge into the selected target' });
      return;
    }

    setBusy(true);
    try {
      let merged = 0;
      const errors: string[] = [];
      for (const source of sources) {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'merge',
            adminId: user?.id,
            sourceLocalityId: source.id,
            targetLocalityId: mergeTargetId,
          }),
        });
        const data = await res.json();
        if (!res.ok) errors.push(`${source.locality}: ${data.error || 'failed'}`);
        else merged += 1;
      }
      if (errors.length) {
        setMsg({ type: 'error', text: `Merged ${merged}; errors: ${errors.slice(0, 3).join('; ')}` });
      } else {
        setMsg({
          type: 'success',
          text: merged === 1
            ? 'Localities merged'
            : `Merged ${merged} localities into the target`,
        });
      }
      setShowMerge(false);
      setMergeSource(null);
      setBulkSources([]);
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
      setListExpanded(true);
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

  const mergeTargets = mergeSource
    ? sortedLocations.filter((l) => l.id !== mergeSource.id)
    : bulkSources.length > 0
      ? bulkSources
      : sortedLocations;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
                setListExpanded(true);
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

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value.trim()) setListExpanded(true);
          }}
          placeholder="Search cities or localities..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
        />
      </div>

      {/* Fold / unfold list */}
      <button
        type="button"
        onClick={() => setListExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-muted/60 border border-border hover:bg-muted transition-colors mb-3"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {listExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
          Locations list
          <span className="text-xs font-normal text-muted-foreground">
            {loading ? 'Loading…' : `${locations.length} total`}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
          </span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          {listExpanded ? 'Collapse' : 'Expand'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {listExpanded && (
          <motion.div
            key="locations-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-xs font-medium text-cyan-400 px-1">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => openEditForSelection()}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground/90 bg-muted border border-border hover:bg-accent disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => openMergeForSelection()}
                  disabled={busy || selectedIds.size < 2}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 disabled:opacity-50"
                >
                  <Merge className="w-3.5 h-3.5" /> Merge
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                >
                  Clear
                </button>
              </div>
            )}

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
                      <th className="text-left px-4 py-3 w-10">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                          onCheckedChange={(v) => toggleSelectAll(v === true)}
                          aria-label="Select all locations"
                        />
                      </th>
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
                        className={cn(
                          'border-b border-secondary hover:bg-muted/50 transition-colors',
                          selectedIds.has(row.id) && 'bg-cyan-500/5'
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={(v) => toggleSelect(row.id, v === true)}
                            aria-label={`Select ${row.locality}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{row.locality}</td>
                        <td className="px-4 py-3 text-sm text-foreground/80">{row.city}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.propertyCount} prop · {row.clientCount} client
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Edit"
                              onClick={() => openEditForSelection(row)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Merge duplicate"
                              onClick={() => openMergeForSelection(row)}
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
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Edit (single or bulk city move) */}
      <Dialog open={showEdit} onOpenChange={(open) => { setShowEdit(open); if (!open) { setBulkEditMode(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {bulkEditMode ? `Edit ${selectedRows.length} Locations` : 'Edit Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {bulkEditMode ? (
              <p className="text-sm text-muted-foreground">
                Move all selected localities to a city. Locality names stay the same.
              </p>
            ) : (
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Locality *</Label>
                <input
                  value={editForm.locality}
                  onChange={(e) => setEditForm({ ...editForm, locality: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm outline-none focus:border-cyan-500/50"
                />
              </div>
            )}
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
      <Dialog open={showMerge} onOpenChange={(open) => { setShowMerge(open); if (!open) { setMergeSource(null); setBulkSources([]); } }}>
        <DialogContent className="sm:max-w-md bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="pr-8">
              {bulkSources.length > 0 ? 'Merge Selected Localities' : 'Merge Duplicate Locality'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              {bulkSources.length > 0 ? (
                <>
                  Merge <span className="text-foreground font-medium">{bulkSources.length} selected</span> localities
                  into one target. Clients and properties are reassigned.
                </>
              ) : (
                <>
                  Merge <span className="text-foreground font-medium">{mergeSource?.locality}</span>
                  {mergeSource ? ` (${mergeSource.city})` : ''} into another locality. All clients and properties will be reassigned.
                </>
              )}
            </p>
            {bulkSources.length > 0 && (
              <ul className="max-h-28 overflow-y-auto text-xs text-muted-foreground space-y-1 rounded-lg bg-muted border border-border p-2.5">
                {bulkSources.map((s) => (
                  <li key={s.id}>{s.locality} — {s.city}</li>
                ))}
              </ul>
            )}
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
