import { db } from '@/lib/db';
import { assignedScope, canAccessAssigned, isAdmin, requireAuth } from '@/lib/auth-guard';
import { resolveClientPreferredLocation } from '@/lib/locations';
import { NextRequest, NextResponse } from 'next/server';

/** Writes an activity log row for the given user/entity. */
async function logActivity(userId: string, entityType: string, entityId: string, action: string, description: string) {
  await db.activity.create({ data: { userId, entityType, entityId, action, description } });
}
// End logActivity

/** Strips non-Prisma client fields and resolves preferred location against Location Master. */
async function prepareClientData(raw: Record<string, unknown>) {
  const {
    preferredCityId,
    preferredLocalityId,
    preferredCity,
    preferredLocality,
    preferredLocation: _ignoredPreferredLocation,
    ...rest
  } = raw;

  const location = await resolveClientPreferredLocation({
    preferredCityId: typeof preferredCityId === 'string' ? preferredCityId : null,
    preferredLocalityId: typeof preferredLocalityId === 'string' ? preferredLocalityId : null,
    preferredCity: typeof preferredCity === 'string' ? preferredCity : null,
    preferredLocality: typeof preferredLocality === 'string' ? preferredLocality : null,
  });

  return { ...rest, ...location };
}
// End prepareClientData

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const scope = assignedScope(user);

    if (id) {
      const client = await db.client.findFirst({
        where: { id, ...scope },
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

    const where: Record<string, unknown> = { ...scope };
    if (type && type !== 'All') where.clientType = type;
    if (status && status !== 'All') where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { preferredLocation: { contains: search } },
        { preferredCity: { contains: search } },
        { preferredLocality: { contains: search } },
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
    const { reminderDate, reminderNote, userId: _clientUserId, ...data } = body;
    const prepared = (await prepareClientData(data)) as Record<string, unknown>;

    let assignedToId = user.id;
    if (isAdmin(user) && typeof prepared.assignedToId === 'string' && prepared.assignedToId) {
      assignedToId = prepared.assignedToId;
    }

    const client = await db.client.create({
      data: {
        ...(prepared as object),
        assignedToId,
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        reminderNote,
      } as Parameters<typeof db.client.create>[0]['data'],
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

    await logActivity(user.id, 'Client', client.id, 'created', `New lead: ${client.name}`);
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'new_lead',
        title: 'New Lead',
        description: `${client.name} registered as ${client.clientType}`,
        linkTo: `client:${client.id}`,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
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
    const { id, _count, assignedTo, deals, reminderDate, reminderNote, userId: _clientUserId, ...data } = body;

    const existing = await db.client.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prepared = await prepareClientData(data);
    if (!isAdmin(user)) {
      (prepared as Record<string, unknown>).assignedToId = existing.assignedToId;
    }

    const client = await db.client.update({
      where: { id },
      data: {
        ...(prepared as object),
        reminderDate: reminderDate ? new Date(reminderDate) : null,
        reminderNote,
      } as Parameters<typeof db.client.update>[0]['data'],
    });

    await logActivity(user.id, 'Client', id, 'updated', `Updated client: ${client.name}`);
    return NextResponse.json({ client });
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

    const client = await db.client.findUnique({ where: { id } });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, client.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.client.delete({ where: { id } });
    await logActivity(user.id, 'Client', id, 'deleted', `Deleted client: ${client.name}`);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End DELETE
