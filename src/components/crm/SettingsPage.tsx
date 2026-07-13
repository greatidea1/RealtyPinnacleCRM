'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Calendar, Plus, Pencil, Trash2,
  Key, Save, CheckCircle2, AlertCircle, Users, Lock,
} from 'lucide-react';
import type { User as UserType, UserRole } from '@/lib/types';
import { getInitials, getAvatarColor } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsPage() {
  const { user } = useAppStore();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserMsg, setNewUserMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setLoadingUsers(true);
      fetch(`/api/users?adminId=${user.id}`)
        .then(r => r.json())
        .then(d => { setUsers(d.users || []); setLoadingUsers(false); })
        .catch(() => setLoadingUsers(false));
    }
  }, [user]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile Section */}
      <ProfileSection user={user} />

      {/* Change Password */}
      <ChangePasswordSection user={user} />

      {/* Admin: User Management */}
      {user?.role === 'ADMIN' && (
        <UserManagement
          users={users}
          loading={loadingUsers}
          onRefresh={() => {
            setLoadingUsers(true);
            fetch(`/api/users?adminId=${user!.id}`)
              .then(r => r.json())
              .then(d => { setUsers(d.users || []); setLoadingUsers(false); })
              .catch(() => setLoadingUsers(false));
          }}
        />
      )}
    </div>
  );
}

/* Profile */
function ProfileSection({ user }: { user: any }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEdit = () => {
    setForm({ name: user.name, email: user.email, phone: user.phone || '' });
    setEditing(true);
    setMsg(null);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-profile', userId: user.id, ...form }),
      });
      const data = await res.json();
      if (data.error) { setMsg({ type: 'error', text: data.error }); return; }
      setMsg({ type: 'success', text: 'Profile updated successfully' });
      setEditing(false);
    } catch {
      setMsg({ type: 'error', text: 'Failed to update profile' });
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-bold text-foreground">Profile</h2>
        {!editing && (
          <button onClick={startEdit} className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg', getAvatarColor(user?.name || 'U'))}>
          {getInitials(user?.name || 'U')}
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">{user?.name}</h3>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border font-medium',
              user?.role === 'ADMIN' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30' : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
            )}>
              {user?.role}
            </span>
            {user?.createdAt && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Joined {formatDate(user.createdAt, { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm mb-4',
          msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        )}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Phone" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors">Cancel</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Name</p>
            <p className="text-sm text-foreground">{user?.name}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-foreground">{user?.email}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted border border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
            <p className="text-sm text-foreground">{user?.phone || 'Not set'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* Change Password */
function ChangePasswordSection({ user }: { user: any }) {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (form.newPw.length < 6) { setMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return; }
    if (form.newPw !== form.confirm) { setMsg({ type: 'error', text: 'Passwords do not match' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', userId: user.id, currentPassword: form.current, newPassword: form.newPw }),
      });
      const data = await res.json();
      if (data.error) { setMsg({ type: 'error', text: data.error }); return; }
      setMsg({ type: 'success', text: 'Password changed successfully' });
      setForm({ current: '', newPw: '', confirm: '' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to change password' });
    } finally { setLoading(false); }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Key className="w-4 h-4 text-cyan-400" />
        <h2 className="text-base font-bold text-foreground">Change Password</h2>
      </div>

      {msg && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm mb-4',
          msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
        )}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="space-y-4 max-w-md">
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Current Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={form.newPw} onChange={e => setForm({ ...form, newPw: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Min 6 characters" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors" />
          </div>
        </div>
        <button onClick={handleChange} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30 disabled:opacity-50">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
          Change Password
        </button>
      </div>
    </div>
  );
}

/* Admin User Management — invite-only account creation */
function UserManagement({ users, loading, onRefresh }: { users: UserType[]; loading: boolean; onRefresh: () => void }) {
  const { user } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'AGENT' as UserRole, phone: '', password: '' });
  const [addMsg, setAddMsg] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');

  const handleAdd = async () => {
    if (!addForm.name || !addForm.email) { setAddMsg('Name and email are required'); return; }
    if (addForm.password && addForm.password.length < 6) {
      setAddMsg('Temporary password must be at least 6 characters');
      return;
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user?.id,
          name: addForm.name,
          email: addForm.email,
          role: addForm.role,
          phone: addForm.phone || undefined,
          password: addForm.password || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setAddMsg(data.error); setCreatedPassword(''); return; }
      const temp = data.temporaryPassword || 'Welcome@123';
      setCreatedPassword(temp);
      setAddMsg(`Invite created for ${data.user.email}. Share the temporary password below.`);
      setAddForm({ name: '', email: '', role: 'AGENT', phone: '', password: '' });
      onRefresh();
    } catch { setAddMsg('Failed to invite user'); setCreatedPassword(''); }
  };

  const toggleActive = async (u: UserType) => {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user?.id, userId: u.id, isActive: !u.isActive }),
      });
      onRefresh();
    } catch {}
  };

  const changeRole = async (u: UserType, role: UserRole) => {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user?.id, userId: u.id, role }),
      });
      onRefresh();
    } catch {}
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-foreground">User Management</h2>
          <span className="text-xs text-muted-foreground">{users.length} users</span>
        </div>
        <button onClick={() => { setShowAdd(true); setAddMsg(''); setCreatedPassword(''); }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30 self-start">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>

      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setAddMsg(''); setCreatedPassword(''); } }}>
        <DialogContent className="sm:max-w-md w-full overflow-x-hidden bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground pr-8">Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {addMsg && (
              <div className={cn('p-3 rounded-xl text-sm',
                createdPassword || addMsg.includes('Invite created')
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              )}>
                {addMsg}
                {createdPassword && (
                  <p className="mt-2 font-mono text-sm text-foreground bg-muted rounded-lg px-3 py-2 border border-border break-all">
                    {createdPassword}
                  </p>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name *</Label>
              <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Full name" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</Label>
              <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Email" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role</Label>
                <Select value={addForm.role} onValueChange={v => setAddForm({ ...addForm, role: v as UserRole })}>
                  <SelectTrigger className="bg-muted border-border text-foreground w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGENT">Agent</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</Label>
                <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
                  placeholder="Phone" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Temporary password (optional)</Label>
              <input type="text" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Defaults to Welcome@123" />
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-2.5 rounded-lg border border-border">
              Share the email and temporary password with the invitee. They should change it after first login.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-foreground/80 bg-muted border border-border hover:bg-accent transition-colors">Close</button>
              <button onClick={handleAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white gradient-primary shadow-lg shadow-cyan-900/30">
                <Plus className="w-4 h-4" /> Send Invite
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 shimmer rounded-xl" />)}
        </div>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b border-secondary hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white', getAvatarColor(u.name))}>
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={v => changeRole(u, v as UserRole)}
                      disabled={u.id === user?.id}>
                      <SelectTrigger className={cn('h-7 w-24 text-[10px] border',
                        u.role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AGENT">Agent</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={u.id === user?.id}
                      className={cn(
                        'text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                        u.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-gray-500/15 text-muted-foreground border-gray-500/30'
                      )}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => toggleActive(u)}
                        className={cn(
                          'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                          u.isActive
                            ? 'text-rose-400 hover:bg-rose-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        )}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}