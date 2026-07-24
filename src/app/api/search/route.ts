import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const userId = searchParams.get('userId') || '';
    const role = searchParams.get('role') || 'AGENT';

    if (!q.trim()) return NextResponse.json({ properties: [], clients: [] });

    const agentWhere = role !== 'ADMIN' ? { assignedToId: userId } : {};

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}