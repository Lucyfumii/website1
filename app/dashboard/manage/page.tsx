'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchManagePanel, type FolderPanelRow } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Search,
  Folder,
  ImageIcon,
  FileText,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';

export default function ManagePanelPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FolderPanelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchManagePanel()
      .then(setRows)
      .catch((e) => toast.error('Failed to load panel', { description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.folder_name.toLowerCase().includes(q) ||
        r.group_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Summarize totals
  const totalFolders = rows.length;
  const totalImages = rows.reduce((s, r) => s + r.image_count, 0);
  const totalRecords = rows.reduce((s, r) => s + r.record_count, 0);

  return (
    <div className="space-y-6 animate-in-fade">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          All folders across every group, with record and photo totals at a glance.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Folders', value: totalFolders, icon: Folder, tint: 'bg-primary/10 text-primary' },
          { label: 'Records', value: totalRecords, icon: FileText, tint: 'bg-chart-2/10 text-chart-2' },
          { label: 'Photos', value: totalImages, icon: ImageIcon, tint: 'bg-chart-3/10 text-chart-3' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tint}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{loading ? '—' : c.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search folders or groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LayoutGrid className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">
                {rows.length ? 'No folders match your search' : 'No folders yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {rows.length
                  ? 'Try a different search term.'
                  : 'Create groups and folders first to see them here.'}
              </p>
            </div>
            {!rows.length && (
              <Button size="sm" asChild>
                <Link href="/dashboard/groups">Go to Groups</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Folders</CardTitle>
            <CardDescription>{filtered.length} folder{filtered.length !== 1 ? 's' : ''} found</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {filtered.map((row) => (
                <button
                  key={row.folder_id}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-accent/50"
                  onClick={() =>
                    router.push(`/dashboard/groups/${row.group_id}/folders/${row.folder_id}`)
                  }
                >
                  {/* Color swatch + icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: `${row.group_color ?? '#2563eb'}1a`,
                      color: row.group_color ?? '#2563eb',
                    }}
                  >
                    <Folder className="h-5 w-5" />
                  </div>

                  {/* Name + group breadcrumb */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{row.group_name}</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                    <p className="truncate font-semibold">{row.folder_name}</p>
                    {row.folder_description && (
                      <p className="truncate text-xs text-muted-foreground">{row.folder_description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex shrink-0 items-center gap-4 text-sm">
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="font-semibold">{row.record_count}</span>
                      <span className="text-xs text-muted-foreground">records</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">{row.image_count}</span>
                      <span className="text-xs text-muted-foreground">photos</span>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
