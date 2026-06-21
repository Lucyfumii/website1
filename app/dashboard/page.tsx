'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchStats } from '@/lib/queries';
import type { DashboardStats } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FolderTree,
  FolderOpen,
  FileText,
  Image as ImageIcon,
  ArrowUpRight,
  Calendar,
  TrendingUp,
} from 'lucide-react';

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Failed to load stats</CardTitle>
          <CardDescription className="font-mono text-xs">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats) {
    return <LoadingGrid />;
  }

  const cards = [
    {
      label: 'Total Groups',
      value: stats.totalGroups,
      icon: FolderTree,
      tint: 'bg-primary/10 text-primary',
      to: '/dashboard/groups',
    },
    {
      label: 'Total Folders',
      value: stats.totalFolders,
      icon: FolderOpen,
      tint: 'bg-chart-2/10 text-chart-2',
      to: '/dashboard/groups',
    },
    {
      label: 'Total Records',
      value: stats.totalRecords,
      icon: FileText,
      tint: 'bg-chart-3/10 text-chart-3',
      to: '/dashboard/groups',
    },
    {
      label: 'Total Images',
      value: stats.totalImages,
      icon: ImageIcon,
      tint: 'bg-warning/10 text-warning',
      to: '/dashboard/groups',
    },
  ];

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.to} className="group">
              <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                <CardContent className="flex items-start justify-between p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{c.value}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.tint}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
                Activity Trend
              </CardTitle>
              <CardDescription>Groups, folders and records created (last 6 months)</CardDescription>
            </div>
            <Link href="/dashboard/stats">
              <Button variant="outline" size="sm">
                Export to Excel
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.groupsTrend} barGap={2}>
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
                  <Bar dataKey="groups" name="Groups" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="folders" name="Folders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="records" name="Records" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-4 w-4 text-primary" />
              Recent Records
            </CardTitle>
            <CardDescription>Latest activity across all folders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentRecords.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No records yet. Create your first group to get started.
              </div>
            )}
            {stats.recentRecords.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-accent/50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="font-normal">
                      {r.group_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{r.folder_name}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{r.update_date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <Skeleton className="mt-4 h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
