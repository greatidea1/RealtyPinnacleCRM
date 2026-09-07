import { db } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth-guard';
import { generateTempPassword } from '@/lib/session';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

/** Lists all users (admin-only, session-based). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminAuth(req);
    if ('error' in auth) return auth.error;

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET

/** Invite/create a user with a generated or admin-supplied temporary password. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { name, email, role, phone, password } = body;
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const tempPassword =
      typeof password === 'string' && password.length >= 6
        ? password
        : generateTempPassword();
    const hashed = await hash(tempPassword, 10);

    const user = await db.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        password: hashed,
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        phone: phone || null,
      },
    });

    return NextResponse.json(
      {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        temporaryPassword: tempPassword,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End POST

/** Update role/active status, or reset a user's password (admin-only). */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdminAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const targetUserId = body.userId || body.targetUserId;
    if (!targetUserId) return NextResponse.json({ error: 'User id required' }, { status: 400 });

    if (body.action === 'reset-password') {
      const tempPassword =
        typeof body.password === 'string' && body.password.length >= 6
          ? body.password
          : generateTempPassword();
      const hashed = await hash(tempPassword, 10);
      const user = await db.user.update({
        where: { id: targetUserId },
        data: { password: hashed },
      });
      await db.passwordResetToken.deleteMany({ where: { userId: targetUserId } });
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
        },
        temporaryPassword: tempPassword,
      });
    }

    const data: { role?: string; isActive?: boolean } = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const user = await db.user.update({ where: { id: targetUserId }, data });
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End PUT
