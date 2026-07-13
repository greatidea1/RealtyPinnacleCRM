import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const stage = searchParams.get('stage');
    const id = searchParams.get('id');

    if (id) {
      const deal = await db.deal.findUnique({
        where: { id },
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

    const where: any = {};
    if (role !== 'ADMIN' && userId) where.assignedToId = userId;
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

    // Pipeline stats
    const pipelineStats = await db.deal.groupBy({
      by: ['stage'],
      where: role !== 'ADMIN' && userId ? { assignedToId: userId } : undefined,
      _count: { stage: true },
      _sum: { dealValue: true },
    });

    return NextResponse.json({ deals, pipelineStats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, expectedCloseDate, ...data } = body;

    const deal = await db.deal.create({
      data: {
        ...data,
        assignedToId: data.assignedToId || userId,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      },
    });

    await db.activity.create({
      data: {
        userId,
        entityType: 'Deal',
        entityId: deal.id,
        action: 'created',
        description: `Created deal for ${data.stage} stage`,
      },
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, expectedCloseDate, property, client, assignedTo, tasks, ...data } = body;

    const existing = await db.deal.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const deal = await db.deal.update({
      where: { id },
      data: {
        ...data,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      },
    });

    // Log stage change
    if (data.stage && data.stage !== existing.stage) {
      await db.activity.create({
        data: {
          userId,
          entityType: 'Deal',
          entityId: id,
          action: 'status_changed',
          description: `Deal moved from ${existing.stage} to ${data.stage}`,
        },
      });

      // Notify
      await db.notification.create({
        data: {
          userId,
          type: 'deal_stage',
          title: 'Deal Stage Updated',
          description: `Deal moved to ${data.stage} stage`,
          linkTo: `deal:${id}`,
        },
      });
    }

    return NextResponse.json({ deal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await db.deal.delete({ where: { id } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}