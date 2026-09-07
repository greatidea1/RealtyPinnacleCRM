import { db } from '@/lib/db';
import { getSessionUserId } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Loads the authenticated user from the session cookie (DB-verified role). */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const userId = getSessionUserId(req);
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
}
// End getSessionUser

/** Requires an authenticated session user; returns 401 JSON when missing. */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}
// End requireAuth

/** Requires an authenticated ADMIN session; returns 403 when not admin. */
export async function requireAdminAuth(
  req: NextRequest
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth;
  if (auth.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return auth;
}
// End requireAdminAuth

/** Prisma where fragment that scopes assigned records to the current user (admins see all). */
export function assignedScope(user: SessionUser): { assignedToId?: string } {
  if (user.role === 'ADMIN') return {};
  return { assignedToId: user.id };
}
// End assignedScope

/** Returns true when the session user may access a record owned by assignedToId. */
export function canAccessAssigned(user: SessionUser, assignedToId: string): boolean {
  return user.role === 'ADMIN' || user.id === assignedToId;
}
// End canAccessAssigned

/** Strips password and returns a client-safe user object. */
export function toSafeUser(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? undefined,
    avatar: user.avatar ?? undefined,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
// End toSafeUser
