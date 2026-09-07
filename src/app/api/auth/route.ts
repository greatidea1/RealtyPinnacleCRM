import { db } from '@/lib/db';
import { getSessionUser, requireAuth, toSafeUser } from '@/lib/auth-guard';
import {
  clearSessionCookie,
  generateResetToken,
  hashResetToken,
  setSessionCookie,
} from '@/lib/session';
import { compare, hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { isEnvAdmin, ensureEnvAdminInDb } from '@/lib/backup-admin';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Builds the public app origin for reset links. */
function getAppOrigin(req: NextRequest): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  if (host) return `${proto}://${host}`;
  return req.nextUrl.origin;
}
// End getAppOrigin

/** Returns the current session user (no password). */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: toSafeUser(user) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password ?? '');

      if (isEnvAdmin(email, password)) {
        const user = await ensureEnvAdminInDb();
        if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
        const { password: _, ...safeUser } = user;
        const res = NextResponse.json({ user: safeUser });
        setSessionCookie(res, user.id);
        return res;
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      const valid = await compare(password.trim(), user.password);
      if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      const { password: _, ...safeUser } = user;
      const res = NextResponse.json({ user: safeUser });
      setSessionCookie(res, user.id);
      return res;
    }

    if (action === 'logout') {
      const res = NextResponse.json({ message: 'Logged out' });
      clearSessionCookie(res);
      return res;
    }

    if (action === 'register') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const name = String(body.name || '').trim();

      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      const userCount = await db.user.count();
      const isFirstUser = userCount === 0;
      const role = isFirstUser ? 'ADMIN' : 'AGENT';

      const hashed = await hash(password, 10);
      const user = await db.user.create({
        data: { name, email, password: hashed, role, isActive: true },
      });

      const { password: _, ...safeUser } = user;
      const res = NextResponse.json({ user: safeUser });
      setSessionCookie(res, user.id);
      return res;
    }

    if (action === 'forgot-password') {
      const email = String(body.email || '').trim().toLowerCase();
      const generic = {
        message: 'If an account exists for that email, a password reset link is ready.',
      };

      const user = await db.user.findUnique({ where: { email } });
      if (!user || !user.isActive) {
        return NextResponse.json(generic);
      }

      await db.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const rawToken = generateResetToken();
      const tokenHash = hashResetToken(rawToken);
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${getAppOrigin(req)}/?resetToken=${encodeURIComponent(rawToken)}`;
      // No SMTP configured yet — return the one-time link so the user/admin can complete reset.
      return NextResponse.json({ ...generic, resetUrl, expiresInMinutes: 60 });
    }

    if (action === 'reset-password') {
      const token = String(body.token || '').trim();
      const newPassword = String(body.newPassword || '');
      if (!token || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Valid reset token and a password of at least 6 characters are required' },
          { status: 400 }
        );
      }

      const tokenHash = hashResetToken(token);
      const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
      }

      const hashed = await hash(newPassword, 10);
      await db.$transaction([
        db.user.update({ where: { id: record.userId }, data: { password: hashed } }),
        db.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        db.passwordResetToken.deleteMany({
          where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        }),
      ]);

      const res = NextResponse.json({ message: 'Password reset successful' });
      clearSessionCookie(res);
      return res;
    }

    if (action === 'update-profile') {
      const auth = await requireAuth(req);
      if ('error' in auth) return auth.error;

      const name = String(body.name || '').trim();
      const phone = body.phone != null ? String(body.phone).trim() : null;
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

      const user = await db.user.update({
        where: { id: auth.user.id },
        data: { name, phone: phone || null },
      });
      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (action === 'change-password') {
      const auth = await requireAuth(req);
      if ('error' in auth) return auth.error;

      const currentPassword = String(body.currentPassword ?? '');
      const newPassword = String(body.newPassword ?? '');
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      const dbUser = await db.user.findUnique({ where: { id: auth.user.id } });
      if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await compare(currentPassword, dbUser.password);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });

      const hashed = await hash(newPassword, 10);
      await db.user.update({ where: { id: auth.user.id }, data: { password: hashed } });
      return NextResponse.json({ message: 'Password changed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End POST
