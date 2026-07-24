'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { formatPrice, getInitials, getAvatarColor } from '@/lib/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart3, CalendarDays, CalendarRange, Handshake, IndianRupee,
  ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface ReportSummary {
  monthSales: number;
  monthDeals: number;
  yearSales: number;
  yearDeals: number;
  allTimeSales: number;
  totalCompletedDeals: number;
  selectedYear: number;
}

interface MonthlyPoint {
  month: number;
  label: string;
  deals: number;
  sales: number;
}

interface YearlyPoint {
  year: number;
  deals: number;
  sales: number;
}

interface CompletedDeal {
  id: string;
  dealValue?: number | null;
  closedAt: string;
  property?: { id: string; title: string; locality: string; city: string; propertyType: string } | null;
  client?: { id: string; name: string; phone: string } | null;
  assignedTo?: { id: string; name: string; avatar?: string | null } | null;
}

const monthlyChartConfig = {
  sales: { label: 'Sales (₹L)', color: '#22d3ee' },
  deals: { label: 'Deals', color: '#38bdf8' },
} satisfies ChartConfig;

const yearlyChartConfig = {
  sales: { label: 'Sales (₹L)', color: '#a78bfa' },
  deals: { label: 'Deals', color: '#818cf8' },
} satisfies ChartConfig;

const PAGE_SIZE = 10;

/** Formats a rupee amount stored in Lakhs for report cards and tables. */
function formatSalesLakhs(value: number): string {
  if (!value) return '₹0L';
  if (value >= 100) {
    const crores = value / 100;
    return `₹${crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2)} Cr`;
  }
  return formatPrice(value, 'Lakhs');
} // end formatSalesLakhs

/** Sales & completed-deals reports with monthly and yearly breakdowns. */
export function ReportsPage() {
  const { user, navigate } = useAppStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [yearly, setYearly] = useState<YearlyPoint[]>([]);
  const [completedDeals, setCompletedDeals] = useState<CompletedDeal[]>([]);
  const [page, setPage] = useState(1);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: user.id,
        role: user.role,
        year: String(year),
      });
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      setSummary(data.summary || null);
      setMonthly(data.monthly || []);
      setYearly(data.yearly || []);
      setCompletedDeals(data.completedDeals || []);
      setPage(1);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }, [user, year]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const totalPages = Math.max(1, Math.ceil(completedDeals.length / PAGE_SIZE));
  const pagedDeals = completedDeals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="h-8 w-48 shimmer rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 shimmer rounded-2xl" />)}
        </div>
        <div className="h-72 shimmer rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monthly sales, yearly sales, and completed deals performance.
          </p>
        </div>
        <div className="flex items-center gap-2 glass-card rounded-xl px-2 py-1.5">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[4.5rem] text-center">{year}</span>
          <button
            type="button"
            onClick={() => setYear((y) => Math.min(new Date().getFullYear(), y + 1))}
            disabled={year >= new Date().getFullYear()}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'This Month Sales', value: formatSalesLakhs(summary?.monthSales || 0), sub: `${summary?.monthDeals || 0} deals`, icon: CalendarDays, tone: 'from-cyan-500 to-blue-600' },
          { label: 'This Year Sales', value: formatSalesLakhs(summary?.yearSales || 0), sub: `${summary?.yearDeals || 0} deals`, icon: CalendarRange, tone: 'from-violet-500 to-indigo-600' },
          { label: 'Completed Deals', value: String(summary?.totalCompletedDeals || 0), sub: 'All time closed', icon: Handshake, tone: 'from-emerald-500 to-teal-600' },
          { label: 'All-time Sales', value: formatSalesLakhs(summary?.allTimeSales || 0), sub: 'Closed deal value', icon: IndianRupee, tone: 'from-amber-500 to-orange-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg', card.tone)}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-foreground">Monthly Sales — {year}</h2>
          </div>
          <ChartContainer config={monthlyChartConfig} className="h-[280px] w-full aspect-auto">
            <BarChart data={monthly} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span>
                        {name === 'sales' ? formatSalesLakhs(Number(value)) : `${value} deals`}
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-foreground">Yearly Sales</h2>
          </div>
          {yearly.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              No completed deals yet
            </div>
          ) : (
            <ChartContainer config={yearlyChartConfig} className="h-[280px] w-full aspect-auto">
              <BarChart data={yearly} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>
                          {name === 'sales' ? formatSalesLakhs(Number(value)) : `${value} deals`}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-4 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Completed Deals Report</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{completedDeals.length} closed deal{completedDeals.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        {completedDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Handshake className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <h3 className="text-base font-semibold text-muted-foreground mb-1">No completed deals</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Deals marked as Closed will appear here with monthly and yearly sales totals.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Property</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Location</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Deal Value</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Closed</th>
                    {user?.role === 'ADMIN' && (
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Agent</th>
                    )}
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">View</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedDeals.map((deal, i) => (
                    <motion.tr
                      key={deal.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="table-row-hover cursor-pointer border-b border-muted last:border-0"
                      onClick={() => navigate('deal-detail', deal.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">{deal.client?.name || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{deal.client?.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-foreground/90 truncate max-w-[200px]">{deal.property?.title || '—'}</p>
                        <p className="text-[10px] text-muted-foreground">{deal.property?.propertyType || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {deal.property ? `${deal.property.locality}, ${deal.property.city}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold gradient-text-gold">
                          {deal.dealValue != null ? formatSalesLakhs(deal.dealValue) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(deal.closedAt)}</td>
                      {user?.role === 'ADMIN' && (
                        <td className="px-4 py-3">
                          {deal.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white', getAvatarColor(deal.assignedTo.name))}>
                                {getInitials(deal.assignedTo.name)}
                              </div>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{deal.assignedTo.name}</span>
                            </div>
                          ) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => navigate('deal-detail', deal.id)}
                          className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-cyan-400 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, completedDeals.length)} of {completedDeals.length}
                </p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground px-2">{page} / {totalPages}</span>
                  <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-sidebar-accent disabled:opacity-30 text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} // end ReportsPage
