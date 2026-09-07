import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const notifications = await db.notification.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await db.notification.count({
      where: { userId: auth.user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { action, notificationId } = body;

    if (action === 'mark-read' && notificationId) {
      const existing = await db.notification.findFirst({
        where: { id: notificationId, userId: auth.user.id },
      });
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      await db.notification.update({ where: { id: notificationId }, data: { isRead: true } });
      return NextResponse.json({ message: 'Marked as read' });
    }

    if (action === 'mark-all-read') {
      await db.notification.updateMany({
        where: { userId: auth.user.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All marked as read' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End PUT
