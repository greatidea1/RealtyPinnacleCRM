import { db } from '@/lib/db';
import { assignedScope, canAccessAssigned, requireAuth } from '@/lib/auth-guard';
import { resolveCityAndLocality } from '@/lib/locations';
import { NextRequest, NextResponse } from 'next/server';

/** Writes an activity log row for the given user/entity. */
async function logActivity(userId: string, entityType: string, entityId: string, action: string, description: string) {
  await db.activity.create({ data: { userId, entityType, entityId, action, description } });
}
// End logActivity

/** Resolves property city/locality against Location Master and syncs denormalized names. */
async function preparePropertyData(raw: Record<string, unknown>) {
  const { cityId, localityId, city, locality, ...rest } = raw;
  const location = await resolveCityAndLocality({
    cityId: typeof cityId === 'string' ? cityId : null,
    localityId: typeof localityId === 'string' ? localityId : null,
    city: typeof city === 'string' ? city : null,
    locality: typeof locality === 'string' ? locality : null,
  });

  if (!location.city || !location.locality) {
    throw new Error('City and Locality are required');
  }

  return { ...rest, ...location };
}
// End preparePropertyData

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const id = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const scope = assignedScope(user);

    if (id) {
      const property = await db.property.findFirst({
        where: { id, ...scope },
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

    const where: Record<string, unknown> = { ...scope };
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
        where: scope,
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = { All: 0 };
    statusCounts.forEach((s) => {
      counts[s.status] = s._count.status;
      counts.All += s._count.status;
    });

    return NextResponse.json({ properties, total, counts, page, limit });
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
    const { amenities, newPhotos, _count, assignedTo, photos, userId: _clientUserId, ...data } = body;
    let prepared: Record<string, unknown>;
    try {
      prepared = await preparePropertyData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid location';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Agents can only assign to themselves; admins may reassign.
    let assignedToId = user.id;
    if (user.role === 'ADMIN' && typeof prepared.assignedToId === 'string' && prepared.assignedToId) {
      assignedToId = prepared.assignedToId;
    }

    const property = await db.property.create({
      data: {
        ...(prepared as object),
        assignedToId,
      } as Parameters<typeof db.property.create>[0]['data'],
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

    await logActivity(user.id, 'Property', property.id, 'created', `Added new listing: ${property.title}`);
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'system',
        title: 'Property Listed',
        description: `Your listing "${property.title}" has been created`,
        linkTo: `property:${property.id}`,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
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
    const { id, amenities, _count, assignedTo, photos, newPhotos, userId: _clientUserId, ...data } = body;

    const existing = await db.property.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, existing.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let prepared: Record<string, unknown>;
    try {
      prepared = await preparePropertyData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid location';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Non-admins cannot reassign ownership.
    if (user.role !== 'ADMIN') {
      prepared.assignedToId = existing.assignedToId;
    }

    const property = await db.property.update({
      where: { id },
      data: prepared as Parameters<typeof db.property.update>[0]['data'],
    });

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

    await logActivity(user.id, 'Property', id, 'updated', `Updated listing: ${property.title}`);
    return NextResponse.json({ property });
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

    const property = await db.property.findUnique({ where: { id } });
    if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canAccessAssigned(user, property.assignedToId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.property.delete({ where: { id } });
    await logActivity(user.id, 'Property', id, 'deleted', `Deleted listing: ${property.title}`);

    return NextResponse.json({ message: 'Deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End DELETE
