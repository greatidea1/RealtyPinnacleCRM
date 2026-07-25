import { db } from '@/lib/db';
import {
  buildLocationCsv,
  findOrCreateCity,
  findOrCreateLocality,
  normalizeLocationName,
  parseLocationCsv,
  seedLocationsFromExistingData,
} from '@/lib/locations';
import { NextRequest, NextResponse } from 'next/server';

/** Resolves admin id from query params or JSON body. */
function getAdminId(source: { get?: (k: string) => string | null } | Record<string, unknown>): string | null {
  if (typeof (source as URLSearchParams).get === 'function') {
    const sp = source as URLSearchParams;
    return sp.get('adminId') || sp.get('userId');
  }
  const body = source as Record<string, unknown>;
  const id = body.adminId || body.userId;
  return typeof id === 'string' ? id : null;
}
// End getAdminId

/** Ensures the requester is an active ADMIN. */
async function requireAdmin(adminId: string | null) {
  if (!adminId) return null;
  const admin = await db.user.findUnique({ where: { id: adminId } });
  if (!admin || admin.role !== 'ADMIN' || !admin.isActive) return null;
  return admin;
}
// End requireAdmin

/** Lists cities, localities, or export CSV. Available to all authenticated users for reads. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const search = (searchParams.get('search') || '').trim();
    const cityId = searchParams.get('cityId');

    if (action === 'export') {
      const admin = await requireAdmin(getAdminId(searchParams));
      if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      const localities = await db.locality.findMany({
        include: { city: true },
        orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
      });
      const csv = buildLocationCsv(
        localities.map((l) => ({ locality: l.name, city: l.city.name }))
      );
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="location-master.csv"',
        },
      });
    }

    if (action === 'cities') {
      const cities = await db.city.findMany({
        where: search
          ? { name: { contains: search, mode: 'insensitive' } }
          : undefined,
        include: { _count: { select: { localities: true } } },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ cities });
    }

    if (action === 'localities') {
      const localities = await db.locality.findMany({
        where: {
          ...(cityId ? { cityId } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { city: { name: { contains: search, mode: 'insensitive' } } },
                ],
              }
            : {}),
        },
        include: { city: true, _count: { select: { properties: true, clients: true } } },
        orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
      });
      return NextResponse.json({ localities });
    }

    // Default: flat Location Master rows (locality + city)
    const localities = await db.locality.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { city: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      include: {
        city: true,
        _count: { select: { properties: true, clients: true } },
      },
      orderBy: [{ city: { name: 'asc' } }, { name: 'asc' }],
    });

    const cities = await db.city.findMany({
      include: { _count: { select: { localities: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      locations: localities.map((l) => ({
        id: l.id,
        locality: l.name,
        localityId: l.id,
        city: l.city.name,
        cityId: l.cityId,
        propertyCount: l._count.properties,
        clientCount: l._count.clients,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
      cities,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load locations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Creates cities/localities, imports CSV, merges duplicates, or seeds from existing data. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'create';

    if (action === 'create-city' || action === 'create-locality' || action === 'create') {
      // Agents may add city/locality from Client/Property modals
      if (action === 'create-city') {
        if (!body.name?.trim()) return NextResponse.json({ error: 'City name is required' }, { status: 400 });
        const city = await findOrCreateCity(body.name);
        return NextResponse.json({ city }, { status: 201 });
      }

      if (action === 'create-locality') {
        if (!body.name?.trim()) return NextResponse.json({ error: 'Locality name is required' }, { status: 400 });
        let cityId = body.cityId as string | undefined;
        if (!cityId && body.cityName?.trim()) {
          const city = await findOrCreateCity(body.cityName);
          cityId = city.id;
        }
        if (!cityId) return NextResponse.json({ error: 'City is required to add a locality' }, { status: 400 });
        const locality = await findOrCreateLocality(cityId, body.name);
        const withCity = await db.locality.findUnique({
          where: { id: locality.id },
          include: { city: true },
        });
        return NextResponse.json({ locality: withCity }, { status: 201 });
      }

      // create city+locality pair
      if (!body.city?.trim() || !body.locality?.trim()) {
        return NextResponse.json({ error: 'City and Locality are required' }, { status: 400 });
      }
      const city = await findOrCreateCity(body.city);
      const locality = await findOrCreateLocality(city.id, body.locality);
      return NextResponse.json({
        city,
        locality: await db.locality.findUnique({ where: { id: locality.id }, include: { city: true } }),
      }, { status: 201 });
    }

    const admin = await requireAdmin(getAdminId(body));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'import') {
      if (typeof body.csv !== 'string') {
        return NextResponse.json({ error: 'CSV content is required' }, { status: 400 });
      }
      let rows: { locality: string; city: string }[];
      try {
        rows = parseLocationCsv(body.csv);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid CSV format';
        return NextResponse.json({ error: message }, { status: 400 });
      }

      let created = 0;
      let skipped = 0;
      const citiesCreated = new Set<string>();

      for (const row of rows) {
        const cityBefore = await db.city.findFirst({
          where: { name: { equals: row.city, mode: 'insensitive' } },
        });
        const city = await findOrCreateCity(row.city);
        if (!cityBefore) citiesCreated.add(city.id);

        const existingLocality = await db.locality.findFirst({
          where: { cityId: city.id, name: { equals: row.locality, mode: 'insensitive' } },
        });
        if (existingLocality) {
          skipped += 1;
          continue;
        }
        await findOrCreateLocality(city.id, row.locality);
        created += 1;
      }

      return NextResponse.json({
        message: 'Import complete',
        created,
        skipped,
        citiesCreated: citiesCreated.size,
        totalRows: rows.length,
      });
    }

    if (action === 'merge') {
      const sourceId = body.sourceLocalityId as string | undefined;
      const targetId = body.targetLocalityId as string | undefined;
      if (!sourceId || !targetId) {
        return NextResponse.json({ error: 'sourceLocalityId and targetLocalityId are required' }, { status: 400 });
      }
      if (sourceId === targetId) {
        return NextResponse.json({ error: 'Cannot merge a locality into itself' }, { status: 400 });
      }

      const [source, target] = await Promise.all([
        db.locality.findUnique({ where: { id: sourceId }, include: { city: true } }),
        db.locality.findUnique({ where: { id: targetId }, include: { city: true } }),
      ]);
      if (!source || !target) {
        return NextResponse.json({ error: 'Locality not found' }, { status: 404 });
      }

      await db.$transaction(async (tx) => {
        await tx.property.updateMany({
          where: { localityId: sourceId },
          data: {
            localityId: targetId,
            locality: target.name,
            cityId: target.cityId,
            city: target.city.name,
          },
        });
        await tx.client.updateMany({
          where: { preferredLocalityId: sourceId },
          data: {
            preferredLocalityId: targetId,
            preferredLocality: target.name,
            preferredCityId: target.cityId,
            preferredCity: target.city.name,
            preferredLocation: `${target.name}, ${target.city.name}`,
          },
        });
        await tx.locality.delete({ where: { id: sourceId } });

        // Remove empty source city if unused
        const remaining = await tx.locality.count({ where: { cityId: source.cityId } });
        if (remaining === 0) {
          const props = await tx.property.count({ where: { cityId: source.cityId } });
          const clients = await tx.client.count({ where: { preferredCityId: source.cityId } });
          if (props === 0 && clients === 0) {
            await tx.city.delete({ where: { id: source.cityId } }).catch(() => undefined);
          }
        }
      });

      return NextResponse.json({
        message: `Merged "${source.name}" into "${target.name}"`,
        target: await db.locality.findUnique({ where: { id: targetId }, include: { city: true } }),
      });
    }

    if (action === 'seed') {
      const result = await seedLocationsFromExistingData();
      return NextResponse.json({ message: 'Seed complete', ...result });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Updates a locality or city name (admin-only). */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = await requireAdmin(getAdminId(body));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entity = body.entity || 'locality';

    if (entity === 'city') {
      const id = body.id as string | undefined;
      const name = normalizeLocationName(body.name || '');
      if (!id || !name) return NextResponse.json({ error: 'City id and name are required' }, { status: 400 });

      const duplicate = await db.city.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
      });
      if (duplicate) return NextResponse.json({ error: 'A city with this name already exists' }, { status: 409 });

      const city = await db.city.update({ where: { id }, data: { name } });
      await db.property.updateMany({ where: { cityId: id }, data: { city: name } });
      await db.client.updateMany({
        where: { preferredCityId: id },
        data: { preferredCity: name },
      });
      // Refresh preferredLocation for affected clients
      const clients = await db.client.findMany({
        where: { preferredCityId: id },
        select: { id: true, preferredLocality: true },
      });
      for (const c of clients) {
        await db.client.update({
          where: { id: c.id },
          data: {
            preferredLocation: [c.preferredLocality, name].filter(Boolean).join(', ') || null,
          },
        });
      }

      return NextResponse.json({ city });
    }

    const id = body.id as string | undefined;
    const name = normalizeLocationName(body.name || body.locality || '');
    const cityId = body.cityId as string | undefined;
    if (!id || !name) return NextResponse.json({ error: 'Locality id and name are required' }, { status: 400 });

    const existing = await db.locality.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Locality not found' }, { status: 404 });

    const nextCityId = cityId || existing.cityId;
    const city = await db.city.findUnique({ where: { id: nextCityId } });
    if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });

    const duplicate = await db.locality.findFirst({
      where: {
        cityId: nextCityId,
        name: { equals: name, mode: 'insensitive' },
        NOT: { id },
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'This City–Locality combination already exists' }, { status: 409 });
    }

    const locality = await db.locality.update({
      where: { id },
      data: { name, cityId: nextCityId },
      include: { city: true },
    });

    await db.property.updateMany({
      where: { localityId: id },
      data: { locality: name, cityId: nextCityId, city: city.name },
    });
    await db.client.updateMany({
      where: { preferredLocalityId: id },
      data: {
        preferredLocality: name,
        preferredCityId: nextCityId,
        preferredCity: city.name,
        preferredLocation: `${name}, ${city.name}`,
      },
    });

    return NextResponse.json({ locality });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Deletes a locality or empty city (admin-only). Blocks delete when still referenced. */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = await requireAdmin(getAdminId(searchParams));
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const entity = searchParams.get('entity') || 'locality';
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (entity === 'city') {
      const city = await db.city.findUnique({
        where: { id },
        include: { _count: { select: { localities: true, properties: true, clients: true } } },
      });
      if (!city) return NextResponse.json({ error: 'City not found' }, { status: 404 });
      if (city._count.localities > 0 || city._count.properties > 0 || city._count.clients > 0) {
        return NextResponse.json({
          error: 'Cannot delete city while it still has localities or referenced records. Merge or reassign first.',
        }, { status: 409 });
      }
      await db.city.delete({ where: { id } });
      return NextResponse.json({ message: 'City deleted' });
    }

    const locality = await db.locality.findUnique({
      where: { id },
      include: { city: true, _count: { select: { properties: true, clients: true } } },
    });
    if (!locality) return NextResponse.json({ error: 'Locality not found' }, { status: 404 });
    if (locality._count.properties > 0 || locality._count.clients > 0) {
      return NextResponse.json({
        error: `Cannot delete "${locality.name}" — used by ${locality._count.properties} propert${locality._count.properties === 1 ? 'y' : 'ies'} and ${locality._count.clients} client${locality._count.clients === 1 ? '' : 's'}. Merge into another locality first.`,
      }, { status: 409 });
    }

    const cityId = locality.cityId;
    await db.locality.delete({ where: { id } });

    const remaining = await db.locality.count({ where: { cityId } });
    if (remaining === 0) {
      const props = await db.property.count({ where: { cityId } });
      const clients = await db.client.count({ where: { preferredCityId: cityId } });
      if (props === 0 && clients === 0) {
        await db.city.delete({ where: { id: cityId } }).catch(() => undefined);
      }
    }

    return NextResponse.json({ message: 'Locality deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete location';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
