'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getGreeting, formatPrice, timeAgo, getInitials, getAvatarColor, type DashboardStats, type Activity, type Task, DEAL_STAGES, STAGE_BG_COLORS } from '@/lib/types';
import { formatDate, isOverdueIST } from '@/lib/datetime';
import { Building2, Users, Handshake, AlertTriangle, Clock, ArrowRight, Plus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const statCards = [
  { key: 'activeListings' as const, label: 'Active Listings', icon: Building2, gradient: 'from-cyan-500 to-blue-600', shadow: 'shadow-cyan-900/30' },
  { key: 'activeClients' as const, label: 'Active Clients', icon: Users, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-900/30' },
  { key: 'openDeals' as const, label: 'Open Deals', icon: Handshake, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-900/30' },
  { key: 'pipelineValue' as const, label: 'Pipeline Value', icon: Handshake, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-900/30', isValue: true },
];

const activityIcons: Record<string, string> = {
  created: '\u{1F195}', updated: '\u270F\uFE0F', status_changed: '\u{1F504}', deleted: '\u{1F5D1}\uFE0F',
};

export function DashboardPage() {
  const { user, navigate, openPropertyForm, openClientForm, dataVersion } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelineData, setPipelineData] = useState<Record<string, { count: number; value: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [statsRes, actRes, taskRes, dealRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/activity'),
          fetch('/api/tasks?filter=all'),
          fetch('/api/deals'),
        ]);
        const [statsData, actData, taskData, dealData] = await Promise.all([
          statsRes.json(), actRes.json(), taskRes.json(), dealRes.json(),
        ]);
        setStats(statsData);
        setActivities(actData.activities || []);
        setTasks((taskData.tasks || []).slice(0, 5));
        const pipeline: Record<string, { count: number; value: number }> = {};
        DEAL_STAGES.forEach(s => pipeline[s] = { count: 0, value: 0 });
        (dealData.pipelineStats || []).forEach((s: any) => {
          pipeline[s.stage] = { count: s._count.stage, value: s._sum.dealValue || 0 };
        });
        setPipelineData(pipeline);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user, dataVersion]);

  const toggleTask = async (task: Task) => {
    const updated = { ...task, isCompleted: !task.isCompleted };
    setTasks(tasks.map(t => t.id === task.id ? updated : t));
    await fetch('/api/tasks', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: task.id, isCompleted: !task.isCompleted }),
    });
    if (stats) setStats({ ...stats, tasksDueToday: Math.max(0, stats.tasksDueToday - (task.isCompleted ? 0 : 1)) });
  };

  if (loading) return <DashboardSkeleton />;

  const totalDeals = Object.values(pipelineData).reduce((sum, p) => sum + p.count, 0);

  return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{getGreeting()}, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s what&apos;s happening with your real estate business today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openPropertyForm()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40 transition-all">
            <Plus className="w-4 h-4" /> Add Property
          </button>
          <button onClick={() => openClientForm()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground/80 text-sm font-medium hover:bg-accent transition-all">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card glass-card-hover rounded-2xl p-5 stat-card-glow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {card.isValue ? formatPrice(stats?.[card.key] || 0, 'Lakhs') : (stats?.[card.key] || 0)}
                </p>
              </div>
              <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', card.gradient, card.shadow)}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overdue warning */}
      {(stats?.overdueTasks || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">
            You have <span className="font-bold text-rose-400">{stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}</span>.
            <button onClick={() => navigate('tasks')} className="font-semibold underline ml-1 text-rose-400">View Tasks</button>
          </p>
        </motion.div>
      )}

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">Deal Pipeline</h2>
            <button onClick={() => navigate('deals')} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex rounded-xl overflow-hidden h-10 mb-4">
            {DEAL_STAGES.map(stage => {
              const pct = totalDeals > 0 ? (pipelineData[stage]?.count || 0) / totalDeals * 100 : 0;
              return (
                <div
                  key={stage}
                  className="pipeline-segment flex items-center justify-center text-[10px] font-bold text-foreground transition-all cursor-default"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: STAGE_BG_COLORS[stage] }}
                  title={`${stage}: ${pipelineData[stage]?.count || 0} deals`}
                >
                  {pct > 8 && `${pipelineData[stage]?.count || 0}`}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEAL_STAGES.map(stage => (
              <div key={stage} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_BG_COLORS[stage] }} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{stage}</span>
                <span className="text-xs font-bold text-foreground">{pipelineData[stage]?.count || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">Upcoming Tasks</h2>
            <button onClick={() => navigate('tasks')} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {tasks.filter(t => !t.isCompleted).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming tasks</p>
            ) : (
              tasks.filter(t => !t.isCompleted).map(task => (
                <div key={task.id} className={cn(
                  'flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-sidebar-accent group',
                  task.isCompleted && 'opacity-50'
                )}>
                  <button
                    onClick={() => toggleTask(task)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
                      task.isCompleted ? 'bg-cyan-600 border-cyan-600' : 'border-border group-hover:border-cyan-500'
                    )}
                  >
                    {task.isCompleted && <span className="text-foreground text-xs font-bold">&#10003;</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className={cn('text-xs mt-0.5 flex items-center gap-1', isOverdueIST(task.dueDate) ? 'text-rose-400' : 'text-muted-foreground')}>
                        <Clock className="w-3 h-3" /> {formatDate(task.dueDate, { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                    task.priority === 'High' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                    task.priority === 'Medium' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-sky-500/15 text-sky-400 border-sky-500/30'
                  )}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-base font-bold text-foreground mb-5">Recent Activity</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            activities.slice(0, 15).map(act => (
              <div key={act.id} className="flex items-start gap-3 group">
                <div className="relative flex-shrink-0">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', getAvatarColor(act.user?.name || 'U'))}>
                    {getInitials(act.user?.name || 'Unknown')}
                  </div>
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] border-2 border-card',
                    act.action === 'created' ? 'bg-cyan-500' : act.action === 'deleted' ? 'bg-rose-500' : 'bg-amber-500'
                  )}>
                    {activityIcons[act.action] || '\u2022'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80">
                    <span className="font-semibold text-foreground">{act.user?.name || 'Unknown'}</span>{' '}
                    {act.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(act.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div><div className="h-8 w-64 shimmer rounded-lg" /><div className="h-4 w-48 shimmer rounded-lg mt-2" /></div>
        <div className="flex gap-2"><div className="h-10 w-32 shimmer rounded-xl" /><div className="h-10 w-32 shimmer rounded-xl" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 shimmer rounded-2xl" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 h-64 shimmer rounded-2xl" /><div className="h-64 shimmer rounded-2xl" /></div>
      <div className="h-48 shimmer rounded-2xl" />
    </div>
  );
}