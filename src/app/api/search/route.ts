import { db } from '@/lib/db';
import { assignedScope, requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    if (!q.trim()) return NextResponse.json({ properties: [], clients: [] });

    const agentWhere = assignedScope(auth.user);

    const [properties, clients] = await Promise.all([
      db.property.findMany({
        where: {
          ...agentWhere,
          OR: [
            { title: { contains: q } },
            { locality: { contains: q } },
            { city: { contains: q } },
          ],
        },
        take: 10,
        select: { id: true, title: true, locality: true, city: true, propertyType: true, price: true, priceUnit: true, status: true },
      }),
      db.client.findMany({
        where: {
          ...agentWhere,
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
            { preferredLocation: { contains: q } },
            { preferredCity: { contains: q } },
            { preferredLocality: { contains: q } },
          ],
        },
        take: 10,
        select: { id: true, name: true, phone: true, clientType: true, priority: true, status: true },
      }),
    ]);

    return NextResponse.json({ properties, clients });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET
