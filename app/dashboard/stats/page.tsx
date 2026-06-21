'use client';

import { useEffect, useState } from 'react';
import { fetchStats } from '@/lib/queries';
import { exportStatsToExcel } from '@/lib/export';
import type { DashboardStats } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FileSpreadsheet,
  FolderTree,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  Download,
  TrendingUp,
} from 'lucide-react';

export default function StatsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => toast.error('Failed to load statistics', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  function handleExport() {
    if (!stats) return;
    exportStatsToExcel(stats);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Groups', value: stats.totalGroups, icon: FolderTree, tint: 'text-primary bg-primary/10' },
    { label: 'Folders', value: stats.totalFolders, icon: FolderOpen, tint: 'text-chart-2 bg-chart-2/10' },
    { label: 'Records', value: stats.totalRecords, icon: FileText, tint: 'text-chart-3 bg-chart-3/10' },
    { label: 'Images', value: stats.totalImages, icon: ImageIcon, tint: 'text-warning bg-warning/10' },
  ];

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Statistics</h2>
          <p className="text-sm text-muted-foreground">Aggregated insights across your workspace.</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Export to Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Activity over time
            </CardTitle>
            <CardDescription>Cumulative creation volume per month.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.groupsTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="groups"
                  name="Groups"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="folders"
                  name="Folders"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#g2)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="records"
                  name="Records"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#g3)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
