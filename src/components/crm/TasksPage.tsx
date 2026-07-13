'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?userId=${user.id}&role=${user.role}&filter=${filter}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (task: Task) => {
    setTasks(tasks.map(t => t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t));
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, userId: user?.id, isCompleted: !task.isCompleted }),
      });
    } catch {}
  };

  const getDueDateColor = (dueDate?: string, isCompleted?: boolean) => {
    if (isCompleted) return 'text-gray-500';
    if (!dueDate) return 'text-gray-500';
    const today = todayISODate();
    const d = toISTDateString(dueDate);
    if (d < today) return 'text-rose-400';
    if (d === today) return 'text-amber-400';
    return 'text-gray-400';
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="h-10 w-96 shimmer rounded-xl" />
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 shimmer rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => openTaskForm()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              filter === tab.key
                ? 'bg-cyan-500/15 text-cyan-400 shadow-sm'
                : 'text-gray-400 hover:text-gray-300 hover:bg-[#252839]'
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
            <div className="w-16 h-16 rounded-2xl bg-[#1a1d2b] flex items-center justify-center mb-4">
              <CheckSquare2 className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-400 mb-1">No tasks found</h3>
            <p className="text-sm text-gray-500">
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
                  'w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                  task.isCompleted
                    ? 'bg-cyan-600 border-cyan-600'
                    : 'border-[#3a3d4a] group-hover:border-cyan-500'
                )}
              >
                {task.isCompleted && <span className="text-white text-xs font-bold">&#10003;</span>}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  task.isCompleted ? 'line-through text-gray-500' : 'text-white'
                )}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {task.dueDate && (
                    <span className={cn('text-xs flex items-center gap-1', getDueDateColor(task.dueDate, task.isCompleted))}>
                      <Clock className="w-3 h-3" />
                      {formatDate(task.dueDate, { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {task.property && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {task.property.title}
                    </span>
                  )}
                  {task.client && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> {task.client.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium badge-glossy', PRIORITY_COLORS[task.priority])}>
                  {task.priority}
                </span>
                <button
                  onClick={() => openTaskForm(task)}
                  className="p-1.5 rounded-lg hover:bg-[#1e2235] text-gray-500 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openDeleteDialog('task', task.id, task.title)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
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
  const { user, showTaskForm, editingTask, closeTaskForm } = useAppStore();
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
      fetch(`/api/properties?userId=${user?.id}&role=${user?.role}&limit=100`)
        .then(r => r.json()).then(d => setProperties(d.properties || [])).catch(() => {});
      fetch(`/api/clients?userId=${user?.id}&role=${user?.role}&limit=100`)
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
      await fetch('/api/tasks', {
        method: editingTask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      closeTaskForm();
    } catch {
      setError('Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showTaskForm} onOpenChange={(open) => { if (!open) closeTaskForm(); }}>
      <DialogContent className="max-w-lg bg-[#1e2130] border-[#2a2d3a] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

          <div>
            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Title *</Label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Follow up with client..."
            />
          </div>

          <div>
            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Description</Label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/50 transition-colors resize-none"
              placeholder="Add details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Due Date</Label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1a1d2b] border border-[#2a2d3a] text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger className="bg-[#1a1d2b] border-[#2a2d3a] text-white">
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
            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Linked Property (Optional)</Label>
            <Select value={form.propertyId} onValueChange={v => setForm({ ...form, propertyId: v })}>
              <SelectTrigger className="bg-[#1a1d2b] border-[#2a2d3a] text-white">
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
            <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Linked Client (Optional)</Label>
            <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
              <SelectTrigger className="bg-[#1a1d2b] border-[#2a2d3a] text-white">
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
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-[#1a1d2b] border border-[#2a2d3a] hover:bg-[#252839] transition-colors"
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