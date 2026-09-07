'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { useCrmRefresh, useLoadingGate } from '@/hooks/use-crm-refresh';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, CheckSquare2, Clock,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Building2, User, Filter,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { Task, TaskPriority, Property, Client } from '@/lib/types';
import { PRIORITY_COLORS, timeAgo } from '@/lib/types';
import { formatDate, todayISODate, toISTDateString } from '@/lib/datetime';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterTab = 'all' | 'today' | 'upcoming' | 'completed';

export function TasksPage() {
  const { user, openTaskForm, openDeleteDialog } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const { loading, refreshing, begin, end } = useLoadingGate();
  const [filter, setFilter] = useState<FilterTab>('all');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    begin();
    try {
      const res = await fetch(`/api/tasks?filter=${filter}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error(e); }
    finally { end(); }
  }, [user, filter, begin, end]);

  useCrmRefresh(fetchTasks, [user, filter]);

  const toggleTask = async (task: Task) => {
    setTasks(tasks.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, isCompleted: !task.isCompleted }),
      });
    } catch {}
  };

  const getDueDateColor = (dueDate?: string, isCompleted?: boolean) => {
    if (isCompleted) return 'text-muted-foreground';
    if (!dueDate) return 'text-muted-foreground';
    const today = todayISODate();
    const d = toISTDateString(dueDate);
    if (d < today) return 'text-rose-400';
    if (d === today) return 'text-amber-400';
    return 'text-muted-foreground';
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="h-8 w-48 max-w-full shimmer rounded-lg" />
        <div className="h-10 w-full max-w-sm shimmer rounded-xl" />
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 shimmer rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className={cn('p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto transition-opacity', refreshing && 'opacity-70')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => openTaskForm()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-muted border border-border w-full sm:w-fit overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0',
              filter === tab.key
                ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground/80 hover:bg-accent'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <CheckSquare2 className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <h3 className="text-base font-semibold text-muted-foreground mb-1">No tasks found</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'completed' ? 'No completed tasks yet' : 'All caught up! Create a new task to get started.'}
            </p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'glass-card rounded-xl p-4 flex items-start gap-4 transition-all group',
                task.isCompleted && 'opacity-60'
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleTask(task)}
                className={cn(
                  'w-7 h-7 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                  task.isCompleted
                    ? 'bg-cyan-600 border-cyan-600'
                    : 'border-border group-hover:border-cyan-500'
                )}
              >
                {task.isCompleted && <span className="text-white text-xs font-bold">&#10003;</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {task.dueDate && (
                    <span className={cn('text-xs flex items-center gap-1', getDueDateColor(task.dueDate, task.isCompleted))}>
                      <Clock className="w-3 h-3" />
                      {formatDate(task.dueDate, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {task.property && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
                      <Building2 className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{task.property.title}</span>
                    </span>
                  )}
                  {task.client && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.client.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', PRIORITY_COLORS[task.priority])}>
                  {task.priority}
                </span>
                <button
                  onClick={() => openTaskForm(task)}
                  className="p-2 min-h-9 min-w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-cyan-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Edit task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openDeleteDialog('task', task.id, task.title)}
                  className="p-2 min-h-9 min-w-9 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/* Task Form Modal */
export function TaskForm() {
  const { user, showTaskForm, editingTask, closeTaskForm, bumpDataVersion } = useAppStore();
  const [form, setForm] = useState({
    title: '', description: '', dueDate: '', priority: 'Medium' as TaskPriority,
    propertyId: '', clientId: '',
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (showTaskForm) {
      setForm({
        title: editingTask?.title || '',
        description: editingTask?.description || '',
        dueDate: editingTask?.dueDate?.split('T')[0] || '',
        priority: editingTask?.priority || 'Medium',
        propertyId: editingTask?.propertyId || '',
        clientId: editingTask?.clientId || '',
      });
      setError('');
      fetch(`/api/properties?limit=100`)
        .then(r => r.json()).then(d => setProperties(d.properties || [])).catch(() => {});
      fetch(`/api/clients?limit=100`)
        .then(r => r.json()).then(d => setClients(d.clients || [])).catch(() => {});
    }
  }, [showTaskForm, editingTask, user]);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    try {
      const payload: any = {
        userId: user?.id,
        title: form.title,
        description: form.description || null,
        dueDate: form.dueDate || null,
        priority: form.priority,
        propertyId: form.propertyId || null,
        clientId: form.clientId || null,
      };
      if (editingTask) payload.id = editingTask.id;
      const res = await fetch('/api/tasks', {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Failed to save task');
        return;
      }
      bumpDataVersion();
      closeTaskForm();
    } catch {
      setError('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showTaskForm} onOpenChange={(open) => { if (!open) closeTaskForm(); }}>
      <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden bg-popover border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground pr-8">{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title *</Label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Follow up with client..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</Label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors resize-none"
              placeholder="Add details..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due Date</Label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger className="bg-muted border-border text-foreground w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Linked Property (Optional)</Label>
            <Select value={form.propertyId} onValueChange={v => setForm({ ...form, propertyId: v })}>
              <SelectTrigger className="bg-muted border-border text-foreground w-full">
                <SelectValue placeholder="Select property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.title} — {p.locality}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Linked Client (Optional)</Label>
            <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
              <SelectTrigger className="bg-muted border-border text-foreground w-full">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={closeTaskForm}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}