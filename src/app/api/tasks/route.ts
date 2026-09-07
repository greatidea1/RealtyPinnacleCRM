import { db } from '@/lib/db';
import { assignedScope, canAccessAssigned, requireAuth } from '@/lib/auth-guard';
import { endOfTodayIST, startOfTodayIST } from '@/lib/datetime';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const id = searchParams.get('id');
    const scope = assignedScope(user);

    if (id) {
      const task = await db.task.findFirst({
        where: { id, ...scope },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          property: { select: { id: true, title: true, locality: true } },
          client: { select: { id: true, name: true } },
          deal: { select: { id: true, stage: true } },
        },
      });
      if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ task });
    }

    const where: Record<string, unknown> = { ...scope };
    const dayStart = startOfTodayIST();
    const dayEnd = endOfTodayIST();

    if (filter === 'today') {
      where.dueDate = { gte: dayStart, lte: dayEnd };
      where.isCompleted = false;
    } else if (filter === 'upcoming') {
      where.dueDate = { gt: dayEnd };
      where.isCompleted = false;
    } else if (filter === 'completed') {
      where.isCompleted = true;
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        property: { select: { id: true, title: true, locality: true } },
        client: { select: { id: true, name: true } },
        deal: { select: { id: true, stage: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { dueDate, userId: _clientUserId, ...data } = body;

    let assignedToId = user.id;
    if (user.role === 'ADMIN' && data.assignedToId) {
      assignedToId = data.assignedToId;
    }

    const task = await db.task.create({
      data: {
        ...data,
        assignedToId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await db.activity.create({
      data: {
        userId: user.id,
        entityType: 'Task',
        entityId: task.id,
        action: 'created',
        description: `Created task: ${task.title}`,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End POST

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const body = await req.json();
    const { id, assignedTo, property, client, deal, userId: _clientUserId, ...data } = body;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role !== 'ADMIN') {
      data.assignedToId = existing.assignedToId;
    }

    const task = await db.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    if (data.isCompleted && !existing.isCompleted) {
      await db.activity.create({
        data: {
          userId: user.id,
          entityType: 'Task',
          entityId: id,
          action: 'updated',
          description: `Completed: ${task.title}`,
        },
      });
    }

    return NextResponse.json({ task });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End PUT

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.task.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End DELETE
