import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Groups closed deals into monthly sales buckets for a calendar year. */
function buildMonthlySales(
  deals: { dealValue: number | null; updatedAt: Date; expectedCloseDate: Date | null }[],
  year: number
) {
  const months = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    deals: 0,
    sales: 0,
  }));

  for (const deal of deals) {
    const closeDate = deal.expectedCloseDate || deal.updatedAt;
    if (closeDate.getFullYear() !== year) continue;
    const idx = closeDate.getMonth();
    months[idx].deals += 1;
    months[idx].sales += deal.dealValue || 0;
  }

  return months;
} // end buildMonthlySales

/** Groups closed deals into yearly sales buckets. */
function buildYearlySales(
  deals: { dealValue: number | null; updatedAt: Date; expectedCloseDate: Date | null }[]
) {
  const byYear = new Map<number, { year: number; deals: number; sales: number }>();

  for (const deal of deals) {
    const closeDate = deal.expectedCloseDate || deal.updatedAt;
    const year = closeDate.getFullYear();
    const current = byYear.get(year) || { year, deals: 0, sales: 0 };
    current.deals += 1;
    current.sales += deal.dealValue || 0;
    byYear.set(year, current);
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
} // end buildYearlySales

/**
 * GET /api/reports
 * Returns monthly/yearly sales summaries and completed (Closed) deals.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const yearParam = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const year = Number.isFinite(yearParam) ? yearParam : new Date().getFullYear();

    const where: Record<string, unknown> = { stage: 'Closed' };
    if (role !== 'ADMIN' && userId) where.assignedToId = userId;

    const closedDeals = await db.deal.findMany({
      where,
      include: {
        property: { select: { id: true, title: true, locality: true, city: true, propertyType: true } },
        client: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthSales = 0;
    let monthDeals = 0;
    let yearSales = 0;
    let yearDeals = 0;
    let allTimeSales = 0;

    for (const deal of closedDeals) {
      const value = deal.dealValue || 0;
      allTimeSales += value;
      const closeDate = deal.expectedCloseDate || deal.updatedAt;
      if (closeDate.getFullYear() === currentYear) {
        yearSales += value;
        yearDeals += 1;
        if (closeDate.getMonth() === currentMonth) {
          monthSales += value;
          monthDeals += 1;
        }
      }
    }

    const monthly = buildMonthlySales(closedDeals, year);
    const yearly = buildYearlySales(closedDeals);

    const completedDeals = closedDeals.map((deal) => ({
      id: deal.id,
      dealValue: deal.dealValue,
      stage: deal.stage,
      notes: deal.notes,
      closedAt: deal.expectedCloseDate || deal.updatedAt,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      property: deal.property,
      client: deal.client,
      assignedTo: deal.assignedTo,
    }));

    return NextResponse.json({
      summary: {
        monthSales,
        monthDeals,
        yearSales,
        yearDeals,
        allTimeSales,
        totalCompletedDeals: closedDeals.length,
        selectedYear: year,
      },
      monthly,
      yearly,
      completedDeals,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} // end GET
