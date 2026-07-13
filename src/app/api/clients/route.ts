import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

async function logActivity(userId: string, entityType: string, entityId: string, action: string, description: string) {
  await db.activity.create({ data: { userId, entityType, entityId, action, description } });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (id) {
      const client = await db.client.findUnique({
        where: { id },
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          deals: {
            include: {
              property: { select: { id: true, title: true, locality: true, city: true } },
            },
          },
          _count: { select: { deals: true, tasks: true } },
        },
      });
      if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ client });
    }

    const where: any = {};
    if (role !== 'ADMIN' && userId) where.assignedToId = userId;
    if (type && type !== 'All') where.clientType = type;
    if (status && status !== 'All') where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { preferredLocation: { contains: search } },
      ];
    }

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.client.count({ where }),
    ]);

    return NextResponse.json({ clients, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, reminderDate, reminderNote, ...data } = body;

    const client = await db.client.create({
      data: {
        ...data,
        assignedToId: data.assignedToId || userId,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        reminderNote,
      },
    });

    if (reminderDate) {
      await db.task.create({
        data: {
          title: `Reminder: ${client.name}`,
          description: reminderNote || 'Client follow-up reminder',
          dueDate: new Date(reminderDate),
          priority: 'High',
          assignedToId: client.assignedToId,
          clientId: client.id,
        },
      });
    }

    await logActivity(userId, 'Client', client.id, 'created', `New lead: ${client.name}`);
    await db.notification.create({
      data: {
        userId,
        type: 'new_lead',
        title: 'New Lead',
        description: `${client.name} registered as ${client.clientType}`,
        linkTo: `client:${client.id}`,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, _count, assignedTo, deals, reminderDate, reminderNote, ...data } = body;

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const client = await db.client.update({
      where: { id },
      data: {
        ...data,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        reminderNote,
      },
    });

    await logActivity(userId, 'Client', id, 'updated', `Updated client: ${client.name}`);
    return NextResponse.json({ client });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const client = await db.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.client.delete({ where: { id } });
    await logActivity(userId || '', 'Client', id, 'deleted', `Deleted client: ${client.name}`);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}