import { db } from '@/lib/db';
import { assignedScope, canAccessAssigned, requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const id = searchParams.get('id');
    const scope = assignedScope(user);

    if (id) {
      const deal = await db.deal.findFirst({
        where: { id, ...scope },
        include: {
          property: { select: { id: true, title: true, locality: true, city: true, propertyType: true, price: true, priceUnit: true, status: true } },
          client: { select: { id: true, name: true, phone: true, email: true, avatar: true, clientType: true } },
          assignedTo: { select: { id: true, name: true, avatar: true } },
          tasks: true,
        },
      });
      if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ deal });
    }

    const where: Record<string, unknown> = { ...scope };
    if (stage) where.stage = stage;

    const deals = await db.deal.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, locality: true, city: true, propertyType: true, price: true, priceUnit: true, status: true } },
        client: { select: { id: true, name: true, phone: true, avatar: true, clientType: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const pipelineStats = await db.deal.groupBy({
      by: ['stage'],
      where: scope,
      _count: { stage: true },
      _sum: { dealValue: true },
    });

    return NextResponse.json({ deals, pipelineStats });
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
    const { expectedCloseDate, userId: _clientUserId, ...data } = body;

    let assignedToId = user.id;
    if (user.role === 'ADMIN' && data.assignedToId) {
      assignedToId = data.assignedToId;
    }

    const deal = await db.deal.create({
      data: {
        ...data,
        assignedToId,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      },
    });

    await db.activity.create({
      data: {
        userId: user.id,
        entityType: 'Deal',
        entityId: deal.id,
        action: 'created',
        description: `Created deal for ${data.stage} stage`,
      },
    });

    return NextResponse.json({ deal }, { status: 201 });
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
    const { id, expectedCloseDate, property, client, assignedTo, tasks, userId: _clientUserId, ...data } = body;

    const existing = await db.deal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role !== 'ADMIN') {
      data.assignedToId = existing.assignedToId;
    }

    const deal = await db.deal.update({
      where: { id },
      data: {
        ...data,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      },
    });

    if (data.stage && data.stage !== existing.stage) {
      await db.activity.create({
        data: {
          userId: user.id,
          entityType: 'Deal',
          entityId: id,
          action: 'status_changed',
          description: `Deal moved from ${existing.stage} to ${data.stage}`,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          type: 'deal_stage',
          title: 'Deal Stage Updated',
          description: `Deal moved to ${data.stage} stage`,
          linkTo: `deal:${id}`,
        },
      });
    }

    return NextResponse.json({ deal });
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

    const existing = await db.deal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.deal.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End DELETE
