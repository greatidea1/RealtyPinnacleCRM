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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (id) {
      const property = await db.property.findUnique({
        where: { id },
        include: {
          amenities: true,
          photos: true,
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
      });
      if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ property });
    }

    const where: any = {};
    if (role !== 'ADMIN' && userId) where.assignedToId = userId;
    if (status && status !== 'All') where.status = status;
    if (type) where.propertyType = type;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { locality: { contains: search } },
        { city: { contains: search } },
        { propertyId: { contains: search } },
      ];
    }

    const [properties, total, statusCounts] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.property.count({ where }),
      db.property.groupBy({
        by: ['status'],
        where: role !== 'ADMIN' && userId ? { assignedToId: userId } : undefined,
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = { All: 0 };
    statusCounts.forEach((s) => {
      counts[s.status] = s._count.status;
      counts.All += s._count.status;
    });

    return NextResponse.json({ properties, total, counts, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, amenities, newPhotos, _count, assignedTo, photos, ...data } = body;

    const property = await db.property.create({
      data: {
        ...data,
        assignedToId: data.assignedToId || userId,
      },
    });

    if (amenities && amenities.length > 0) {
      await db.propertyAmenity.createMany({
        data: amenities.map((a: string) => ({ propertyId: property.id, amenity: a })),
      });
    }

    if (newPhotos && newPhotos.length > 0) {
      await db.propertyPhoto.createMany({
        data: newPhotos.map((url: string) => ({ propertyId: property.id, url })),
      });
    }

    await logActivity(userId, 'Property', property.id, 'created', `Added new listing: ${property.title}`);
    await db.notification.create({
      data: {
        userId,
        type: 'system',
        title: 'Property Listed',
        description: `Your listing "${property.title}" has been created`,
        linkTo: `property:${property.id}`,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, amenities, _count, assignedTo, photos, newPhotos, ...data } = body;

    const existing = await db.property.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const property = await db.property.update({ where: { id }, data });

    if (amenities !== undefined) {
      await db.propertyAmenity.deleteMany({ where: { propertyId: id } });
      if (amenities.length > 0) {
        await db.propertyAmenity.createMany({
          data: amenities.map((a: string) => ({ propertyId: id, amenity: a })),
        });
      }
    }

    if (newPhotos && newPhotos.length > 0) {
      await db.propertyPhoto.createMany({
        data: newPhotos.map((url: string) => ({ propertyId: id, url })),
      });
    }

    await logActivity(userId, 'Property', id, 'updated', `Updated listing: ${property.title}`);
    return NextResponse.json({ property });
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

    const property = await db.property.findUnique({ where: { id } });
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.property.delete({ where: { id } });
    await logActivity(userId || '', 'Property', id, 'deleted', `Deleted listing: ${property.title}`);

    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}