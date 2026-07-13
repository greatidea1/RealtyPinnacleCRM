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

      // Backup admin: match env credentials directly, then upsert with this app's bcrypt.
      if (matchesBackupAdmin(email, password)) {
        const user = await ensureBackupAdmin();
        if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
        const { password: _, ...safeUser } = user;
        return NextResponse.json({ user: safeUser });
      }

      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      const valid = await compare(password.trim(), user.password);
      if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
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
