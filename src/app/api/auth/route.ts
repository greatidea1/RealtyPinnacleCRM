import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'login') {
      const { email, password } = body;
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      const valid = await compare(password, user.password);
      if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      if (!user.isActive) return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (action === 'register') {
      const { name, email, password } = body;
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      const hashed = await hash(password, 10);
      const user = await db.user.create({
        data: { name, email, password: hashed, role: 'AGENT' },
      });
      const { password: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser }, { status: 201 });
    }

    if (action === 'forgot-password') {
      const { email } = body;
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
      // In production, send reset email. For mock, just return success.
      return NextResponse.json({ message: 'Password reset link sent' });
    }

    if (action === 'reset-password') {
      const { email, newPassword } = body;
      const hashed = await hash(newPassword, 10);
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
      const { id, currentPassword, newPassword } = body;
      const user = await db.user.findUnique({ where: { id } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const valid = await compare(currentPassword, user.password);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      const hashed = await hash(newPassword, 10);
      await db.user.update({ where: { id }, data: { password: hashed } });
      return NextResponse.json({ message: 'Password changed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}