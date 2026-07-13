import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_TEMP_PASSWORD = 'Welcome@123';

/** Resolves the requesting admin id from query or body field variants. */
function getAdminId(source: { get?: (k: string) => string | null } | Record<string, unknown>): string | null {
  if (typeof (source as URLSearchParams).get === 'function') {
    const sp = source as URLSearchParams;
    return sp.get('adminId') || sp.get('userId');
  }
  const body = source as Record<string, unknown>;
  const id = body.adminId || body.adminUserId;
  return typeof id === 'string' ? id : null;
}
// End getAdminId

/** Ensures the requester is an active ADMIN. */
async function requireAdmin(adminId: string | null) {
  if (!adminId) return null;
  const admin = await db.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== 'ADMIN' || !admin.isActive) return null;
  return admin;
}
// End requireAdmin

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = await requireAdmin(getAdminId(searchParams));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, phone: true, avatar: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** Invite/create a user (admin-only). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = await requireAdmin(getAdminId(body));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, email, role, phone, password } = body;
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const tempPassword = (typeof password === 'string' && password.length >= 6)
      ? password
      : DEFAULT_TEMP_PASSWORD;
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

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      temporaryPassword: tempPassword,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = await requireAdmin(getAdminId(body));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const targetUserId = body.userId || body.targetUserId;
    if (!targetUserId) return NextResponse.json({ error: 'User id required' }, { status: 400 });

    const data: { role?: string; isActive?: boolean } = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const user = await db.user.update({ where: { id: targetUserId }, data });
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
