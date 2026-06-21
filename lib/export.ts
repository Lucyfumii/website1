import type { DashboardStats, Group, Folder, RecordType as RecordT } from '@/lib/types';
import { toast } from 'sonner';

type ExportRow = Record<string, string | number>;

async function getXlsx() {
  return await import('xlsx');
}

async function run(fn: () => Promise<void>, label: string) {
  try {
    await fn();
    toast.success(`${label} exported`);
  } catch (e) {
    toast.error(`Failed to export ${label.toLowerCase()}`, {
      description: e instanceof Error ? e.message : undefined,
    });
  }
}

export function exportStatsToExcel(stats: DashboardStats) {
  return run(async () => {
    const XLSX = await getXlsx();
    const summary: ExportRow[] = [
      { Metric: 'Total Groups', Value: stats.totalGroups },
      { Metric: 'Total Folders', Value: stats.totalFolders },
      { Metric: 'Total Records', Value: stats.totalRecords },
      { Metric: 'Total Images', Value: stats.totalImages },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    const trend: ExportRow[] = stats.groupsTrend.map((t) => ({
      Month: t.name,
      Groups: t.groups,
      Folders: t.folders,
      Records: t.records,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trend), '6-Month Trend');

    const recent: ExportRow[] = stats.recentRecords.map((r) => ({
      Title: r.title,
      Group: r.group_name,
      Folder: r.folder_name,
      'Update Date': r.update_date,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(recent.length ? recent : [{ Title: 'N/A' }]),
      'Recent Records'
    );

    XLSX.writeFile(
      wb,
      `dashboard-stats-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }, 'Statistics');
}

export function exportGroupsToExcel(groups: (Group & { folder_count: number })[]) {
  return run(async () => {
    const XLSX = await getXlsx();
    const rows: ExportRow[] = groups.map((g, i) => ({
      '#': i + 1,
      Name: g.name,
      Description: g.description ?? '',
      Color: g.color ?? '',
      Folders: g.folder_count,
      Created: new Date(g.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Groups');
    XLSX.writeFile(wb, `groups-${Date.now()}.xlsx`);
  }, 'Groups');
}

export function exportFoldersToExcel(
  folders: (Folder & { record_count: number })[]
) {
  return run(async () => {
    const XLSX = await getXlsx();
    const rows: ExportRow[] = folders.map((f, i) => ({
      '#': i + 1,
      Name: f.name,
      Description: f.description ?? '',
      Records: f.record_count,
      Created: new Date(f.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Folders');
    XLSX.writeFile(wb, `folders-${Date.now()}.xlsx`);
  }, 'Folders');
}

export function exportRecordsToExcel(
  records: (RecordT & { image_count?: number })[]
) {
  return run(async () => {
    const XLSX = await getXlsx();
    const rows: ExportRow[] = records.map((r, i) => ({
      '#': i + 1,
      Title: r.title,
      Notes: r.notes ?? '',
      'Update Date': r.update_date,
      Images: r.image_count ?? 0,
      Created: new Date(r.created_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `records-${Date.now()}.xlsx`);
  }, 'Records');
}
