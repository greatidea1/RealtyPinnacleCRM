'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { LogIn, Home, Mail, Lock, ArrowRight, Eye, EyeOff, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Auth shell: login, forgot-password, and reset-password (invite-only accounts). */
export function AuthScreen() {
  const { currentPage } = useAppStore();
  if (currentPage === 'forgot-password') return <ForgotPasswordForm />;
  if (currentPage === 'reset-password') return <ResetPasswordForm />;
  if (currentPage === 'register') return <RegisterForm />;
  return <LoginForm />;
}
// End AuthScreen

/** Email/password sign-in for invited users. */
function LoginForm() {
  const { login, navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      login(data.user);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };
  // End handleSubmit

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Realty Pinnacle CRM</h2>
          <p className="text-xl text-white/70 mb-8">The complete real estate broker management platform</p>
          <div className="space-y-4">
            {['Manage listings and clients seamlessly', 'Track deals through every pipeline stage', 'Never miss a follow-up with smart tasks'].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">&#10003;</div>
                <span className="text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6 sm:mb-8 justify-center px-2">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-cyan-900/40 flex-shrink-0">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold gradient-text-primary leading-tight">Realty Pinnacle CRM</h1>
          </div>

          <div className="glass-card rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/30">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4 shadow-lg shadow-cyan-900/40">
                <LogIn className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-sm text-muted-foreground mt-1">Sign in with your invited account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">{error}</div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button type="button" onClick={() => navigate('forgot-password')} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit" disabled={loading}
                className={cn(
                  'w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40',
                  'gradient-primary hover:opacity-90 disabled:opacity-50'
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('register')}
                className="text-cyan-400 hover:text-cyan-300 font-medium underline transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
// End LoginForm

/** Request a password reset link (tokenized; link shown when email delivery is not configured). */
function ForgotPasswordForm() {
  const { navigate, setResetToken } = useAppStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot-password', email }),
      });
      const data = await res.json();
      if (data.resetUrl) setResetUrl(data.resetUrl);
      setSent(true);
    } catch {}
    finally { setLoading(false); }
  };
  // End handleSubmit

  /** Opens the in-app reset form using the token from the returned URL. */
  const openResetFromUrl = () => {
    try {
      const url = new URL(resetUrl);
      const token = url.searchParams.get('resetToken');
      if (token) {
        setResetToken(token);
        navigate('reset-password');
      }
    } catch {
      // ignore invalid URL
    }
  };
  // End openResetFromUrl

  return (
    <div className="min-h-screen flex bg-background items-center justify-center p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3 shadow-lg shadow-cyan-900/40">
            <Home className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">Reset Password</h1>
        </div>
        <div className="glass-card rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/30">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 mx-auto flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Reset link ready</h3>
              <p className="text-sm text-muted-foreground mb-4">
                If an account exists for {email}, use the one-time reset link below (valid for 60 minutes).
              </p>
              {resetUrl ? (
                <div className="space-y-3 mb-6 text-left">
                  <p className="text-xs font-mono break-all p-3 rounded-xl bg-muted border border-border text-foreground/80">{resetUrl}</p>
                  <button
                    type="button"
                    onClick={openResetFromUrl}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm gradient-primary shadow-lg shadow-cyan-900/30 hover:opacity-90"
                  >
                    Set New Password
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">No account was found, or the link could not be generated.</p>
              )}
              <button onClick={() => navigate('login')} className="text-sm text-cyan-400 font-semibold hover:text-cyan-300">Back to Sign In</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-2">Enter your email to get a one-time password reset link.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Email" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm gradient-primary shadow-lg shadow-cyan-900/30 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Get Reset Link'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => navigate('login')} className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">Back to Sign In</button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
// End ForgotPasswordForm

/** Sets a new password using a one-time reset token. */
function ResetPasswordForm() {
  const { navigate, resetToken, setResetToken } = useAppStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetToken) {
      setError('Missing or invalid reset link. Request a new one.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', token: resetToken, newPassword: password }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setResetToken(null);
      setDone(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };
  // End handleSubmit

  return (
    <div className="min-h-screen flex bg-background items-center justify-center p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-3 shadow-lg shadow-cyan-900/40">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text-primary">Choose New Password</h1>
        </div>
        <div className="glass-card rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/30">
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">Your password has been updated. You can sign in now.</p>
              <button
                type="button"
                onClick={() => navigate('login')}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm gradient-primary shadow-lg shadow-cyan-900/30 hover:opacity-90"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">{error}</div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm gradient-primary shadow-lg shadow-cyan-900/30 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Password'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => navigate('forgot-password')} className="text-sm text-cyan-400 hover:text-cyan-300 font-medium">
                  Request a new link
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
// End ResetPasswordForm

/** Registration form for new users. First user becomes ADMIN. */
function RegisterForm() {
  const { login, navigate } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', name, email, password }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      login(data.user);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Realty Pinnacle CRM</h2>
          <p className="text-xl text-white/70 mb-8">The complete real estate broker management platform</p>
          <div className="space-y-4">
            {['Manage listings and clients seamlessly', 'Track deals through every pipeline stage', 'Never miss a follow-up with smart tasks'].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">&#10003;</div>
                <span className="text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-6 sm:mb-8 justify-center px-2">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-cyan-900/40 flex-shrink-0">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold gradient-text-primary leading-tight">Realty Pinnacle CRM</h1>
          </div>

          <div className="glass-card rounded-3xl p-5 sm:p-8 shadow-2xl shadow-black/30">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4 shadow-lg shadow-cyan-900/40">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Create account</h2>
              <p className="text-sm text-muted-foreground mt-1">Get started with Realty Pinnacle</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm text-center">{error}</div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                  <input
                    type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-muted text-sm text-foreground outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-muted-foreground/70"
                    placeholder="Confirm Password"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/80">
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className={cn(
                  'w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30 hover:shadow-cyan-800/40',
                  'gradient-primary hover:opacity-90 disabled:opacity-50 mt-2'
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign Up <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('login')}
                className="text-cyan-400 hover:text-cyan-300 font-medium underline transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
