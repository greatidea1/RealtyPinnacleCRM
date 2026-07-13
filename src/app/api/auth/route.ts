import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { ensureBackupAdmin, matchesBackupAdmin } from '@/lib/backup-admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password ?? '');

      // Diagnostic logging for debugging login credentials issues
      const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
      console.log('[AUTH DIAGNOSTIC] Login request received:', {
        typedEmail: email,
        typedEmailLength: email.length,
        typedPasswordLength: password.trim().length,
        envEmail: envEmail,
        envEmailLength: envEmail.length,
        envPasswordLength: envPassword.length,
        isMatchesBackupAdmin: matchesBackupAdmin(email, password)
      });

      if (envPassword.startsWith('"') && envPassword.endsWith('"')) {
        console.log('[AUTH DIAGNOSTIC WARNING] ADMIN_PASSWORD environment variable contains literal double quotes. This usually happens when wrapping values in env files.');
      }
      if (envPassword.startsWith("'") && envPassword.endsWith("'")) {
        console.log('[AUTH DIAGNOSTIC WARNING] ADMIN_PASSWORD environment variable contains literal single quotes.');
      }

      // Backup admin: match env credentials directly, then upsert with this app's bcrypt.
      if (matchesBackupAdmin(email, password)) {
        const user = await ensureBackupAdmin();
        if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
        const { password: _, ...safeUser } = user;
        return NextResponse.json({ user: safeUser });
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        console.log(`[AUTH DIAGNOSTIC] User not found in DB for email: ${email}`);
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      const valid = await compare(password.trim(), user.password);
      if (!valid) {
        console.log(`[AUTH DIAGNOSTIC] Password compare failed for user: ${email}`);
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (action === 'register') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const name = String(body.name || '').trim();

      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }

      // Check if this is the first user in the DB
      const userCount = await db.user.count();
      const isFirstUser = userCount === 0;
      const role = isFirstUser ? 'ADMIN' : 'AGENT';

      const hashed = await hash(password, 10);
      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashed,
          role,
          isActive: true,
        },
      });

      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (action === 'forgot-password') {
      const email = String(body.email || '').trim().toLowerCase();
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      return NextResponse.json({ message: 'Password reset link sent' });
    }

    if (action === 'reset-password') {
      const email = String(body.email || '').trim().toLowerCase();
      const { newPassword } = body;
      const hashed = await hash(String(newPassword), 10);
      await db.user.update({ where: { email }, data: { password: hashed } });
      return NextResponse.json({ message: 'Password reset successful' });
    }

    if (action === 'update-profile') {
      const { id, name, phone } = body;
      const user = await db.user.update({
        where: { id },
        data: { name, phone },
      });
      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (action === 'change-password') {
      const id = body.id || body.userId;
      const { currentPassword, newPassword } = body;
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const valid = await compare(String(currentPassword), user.password);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      const hashed = await hash(String(newPassword), 10);
      await db.user.update({ where: { id }, data: { password: hashed } });
      return NextResponse.json({ message: 'Password changed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
