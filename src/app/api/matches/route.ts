import { db } from '@/lib/db';
import { assignedScope, requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';
import { findMatchingClients, findMatchingProperties } from '@/lib/matching';
import type { Client, Property } from '@/lib/types';

/**
 * GET /api/matches
 * Bi-directional matching:
 * - direction=for-client&id=... → matching properties for a client
 * - direction=for-property&id=... → matching clients for a property
 * Supports minScore, search, type filter, page, and limit.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction');
    const id = searchParams.get('id');
    const search = (searchParams.get('search') || '').trim();
    const typeFilter = searchParams.get('type');
    const minScore = Math.max(0, parseInt(searchParams.get('minScore') || '0', 10) || 0);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));

    if (!direction || !id) {
      return NextResponse.json({ error: 'direction and id are required' }, { status: 400 });
    }

    const scope = assignedScope(auth.user);

    if (direction === 'for-client') {
      const client = await db.client.findFirst({
        where: { id, ...scope },
        include: { assignedTo: { select: { id: true, name: true, avatar: true } } },
      });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

      const propertyWhere: Record<string, unknown> = {
        ...scope,
        status: { in: ['Active', 'Pending'] },
      };
      if (typeFilter && typeFilter !== 'All') propertyWhere.propertyType = typeFilter;
      if (search) {
        propertyWhere.OR = [
          { title: { contains: search } },
          { locality: { contains: search } },
          { city: { contains: search } },
          { propertyId: { contains: search } },
        ];
      }

      const properties = await db.property.findMany({
        where: propertyWhere,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
        take: 500,
      });

      const matches = findMatchingProperties(client as unknown as Client, properties as unknown as Property[])
        .filter((m) => m.matchScore >= minScore);

      const total = matches.length;
      const start = (page - 1) * limit;
      const paged = matches.slice(start, start + limit).map(({ property, matchScore, breakdown, matchedCriteria }) => ({
        ...property,
        matchScore,
        breakdown,
        matchedCriteria,
      }));

      return NextResponse.json({
        direction,
        source: client,
        matches: paged,
        total,
        page,
        limit,
      });
    }

    if (direction === 'for-property') {
      const property = await db.property.findFirst({
        where: { id, ...scope },
        include: { assignedTo: { select: { id: true, name: true, avatar: true } } },
      });
      if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

      const clientWhere: Record<string, unknown> = {
        ...scope,
        status: { notIn: ['Closed Lost', 'Inactive'] },
      };
      if (typeFilter && typeFilter !== 'All') clientWhere.preferredType = typeFilter;
      if (search) {
        clientWhere.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          { preferredLocation: { contains: search } },
          { preferredCity: { contains: search } },
          { preferredLocality: { contains: search } },
          { email: { contains: search } },
        ];
      }

      const clients = await db.client.findMany({
        where: clientWhere,
        include: {
          assignedTo: { select: { id: true, name: true, avatar: true } },
          _count: { select: { deals: true, tasks: true } },
        },
        take: 500,
      });

      const matches = findMatchingClients(property as unknown as Property, clients as unknown as Client[])
        .filter((m) => m.matchScore >= minScore);

      const total = matches.length;
      const start = (page - 1) * limit;
      const paged = matches.slice(start, start + limit).map(({ client, matchScore, breakdown, matchedCriteria }) => ({
        ...client,
        matchScore,
        breakdown,
        matchedCriteria,
      }));

      return NextResponse.json({
        direction,
        source: property,
        matches: paged,
        total,
        page,
        limit,
      });
    }

    return NextResponse.json({ error: 'Invalid direction. Use for-client or for-property.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to compute matches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} // end GET
