'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

export function DeleteDialog() {
  const { user, showDeleteDialog, deleteTarget, closeDeleteDialog } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!deleteTarget || !user) return;
    setLoading(true);
    setError('');
    try {
      const typeMap: Record<string, string> = {
        property: '/api/properties',
        client: '/api/clients',
        deal: '/api/deals',
        task: '/api/tasks',
      };
      const endpoint = typeMap[deleteTarget.type] || `/api/${deleteTarget.type}s`;
      const res = await fetch(`${endpoint}?id=${deleteTarget.id}&userId=${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      closeDeleteDialog();
    } catch {
      setError('Failed to delete. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
      <DialogContent className="sm:max-w-md w-full overflow-x-hidden bg-popover border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground pr-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <span className="min-w-0">Delete {deleteTarget?.type || 'Item'}?</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2 break-words">
          Are you sure you want to delete <span className="text-foreground font-semibold">&ldquo;{deleteTarget?.name}&rdquo;</span>? This action cannot be undone.
        </p>
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={closeDeleteDialog}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}