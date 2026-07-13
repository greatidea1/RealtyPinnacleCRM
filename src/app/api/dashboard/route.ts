import { db } from '@/lib/db';
import { endOfTodayIST, startOfTodayIST } from '@/lib/datetime';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const role = searchParams.get('role') || 'AGENT';

    const agentWhere = role !== 'ADMIN' ? { assignedToId: userId } : {};
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
          dueDate: {
            gte: dayStart,
            lte: dayEnd,
          },
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}