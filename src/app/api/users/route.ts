import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only ADMIN can list users
    const requester = await db.user.findUnique({ where: { id: userId } });
    if (!requester || requester.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, phone: true, avatar: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminUserId, name, email, role, phone } = body;

    const admin = await db.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const defaultPassword = await hash('Welcome@123', 10);
    const user = await db.user.create({
      data: { name, email, password: defaultPassword, role: role || 'AGENT', phone },
    });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminUserId, targetUserId, role, isActive } = body;

    const admin = await db.user.findUnique({ where: { id: adminUserId } });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data: any = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;

    const user = await db.user.update({ where: { id: targetUserId }, data });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}