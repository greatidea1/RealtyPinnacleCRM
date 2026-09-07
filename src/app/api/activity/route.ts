import { db } from '@/lib/db';
import { isAdmin, requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const where = isAdmin(auth.user) ? {} : { userId: auth.user.id };

    const activities = await db.activity.findMany({
      where,
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({ activities });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET
