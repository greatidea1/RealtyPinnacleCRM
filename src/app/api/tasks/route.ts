import { db } from '@/lib/db';
import { endOfTodayIST, startOfTodayIST } from '@/lib/datetime';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const filter = searchParams.get('filter') || 'all'; // all, today, upcoming, completed
    const id = searchParams.get('id');

    if (id) {
      const task = await db.task.findUnique({
        where: { id },
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

    const where: any = {};
    if (role !== 'ADMIN' && userId) where.assignedToId = userId;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, dueDate, ...data } = body;

    const task = await db.task.create({
      data: {
        ...data,
        assignedToId: data.assignedToId || userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await db.activity.create({
      data: {
        userId,
        entityType: 'Task',
        entityId: task.id,
        action: 'created',
        description: `Created task: ${task.title}`,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, assignedTo, property, client, deal, ...data } = body;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

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
          userId,
          entityType: 'Task',
          entityId: id,
          action: 'updated',
          description: `Completed: ${task.title}`,
        },
      });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.task.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}