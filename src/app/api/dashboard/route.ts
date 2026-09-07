import { db } from '@/lib/db';
import { assignedScope, requireAuth } from '@/lib/auth-guard';
import { endOfTodayIST, startOfTodayIST } from '@/lib/datetime';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const agentWhere = assignedScope(auth.user);
    const dayStart = startOfTodayIST();
    const dayEnd = endOfTodayIST();

    const [
      activeListings,
      activeClients,
      openDeals,
      pipelineValue,
      tasksDueToday,
      overdueTasks,
    ] = await Promise.all([
      db.property.count({ where: { ...agentWhere, status: 'Active' } }),
      db.client.count({
        where: {
          ...agentWhere,
          status: { notIn: ['Closed Won', 'Closed Lost', 'Inactive'] },
        },
      }),
      db.deal.count({ where: { ...agentWhere, stage: { not: 'Closed' } } }),
      db.deal.aggregate({
        where: { ...agentWhere, stage: { not: 'Closed' } },
        _sum: { dealValue: true },
      }),
      db.task.count({
        where: {
          ...agentWhere,
          isCompleted: false,
          dueDate: { gte: dayStart, lte: dayEnd },
        },
      }),
      db.task.count({
        where: {
          ...agentWhere,
          isCompleted: false,
          dueDate: { lt: dayStart },
        },
      }),
    ]);

    return NextResponse.json({
      activeListings,
      activeClients,
      openDeals,
      pipelineValue: pipelineValue._sum.dealValue || 0,
      tasksDueToday,
      overdueTasks,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
// End GET
