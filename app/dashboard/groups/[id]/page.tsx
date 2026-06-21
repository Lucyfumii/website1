'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  fetchGroups,
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from '@/lib/queries';
import type { Group, Folder as FolderType } from '@/lib/types';
import { exportFoldersToExcel } from '@/lib/export';
import { FolderFormDialog, type FolderFormValues } from '@/components/dashboard/folder-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Search,
  Pencil,
  Trash2,
  Folder,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [folders, setFolders] = useState<(FolderType & { record_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FolderType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FolderType | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const groups = await fetchGroups();
      setGroup(groups.find((x) => x.id === groupId) ?? null);
      const fs = await fetchFolders(groupId);
      setFolders(fs);
    } catch (e) {
      toast.error('Failed to load', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q)
    );
  }, [folders, search]);

  async function handleCreate(v: FolderFormValues) {
    await createFolder({ group_id: groupId, ...v });
    toast.success('Folder created');
    await load();
  }

  async function handleEdit(v: FolderFormValues) {
    if (!editTarget) return;
    await updateFolder(editTarget.id, v);
    toast.success('Folder updated');
    setEditTarget(null);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteFolder(deleteTarget.id);
      toast.success('Folder deleted');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('Failed to delete folder', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/groups" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Groups
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{group?.name ?? 'Loading...'}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {folders.length} {folders.length === 1 ? 'folder' : 'folders'} in this group.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportFoldersToExcel(filtered)} disabled={!filtered.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Folder
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search folders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="mt-4 h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Folder className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">{folders.length ? 'No folders match your search' : 'No folders yet'}</p>
              <p className="text-sm text-muted-foreground">
                {folders.length ? 'Try a different search term.' : 'Create a folder to hold records.'}
              </p>
            </div>
            {!folders.length && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Folder
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <Card
              key={f.id}
              className="group relative transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <button
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    onClick={() => router.push(`/dashboard/groups/${groupId}/folders/${f.id}`)}
                  >
                    <Folder className="h-5 w-5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/dashboard/groups/${groupId}/folders/${f.id}`)
                        }
                      >
                        <Folder className="mr-2 h-4 w-4" /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditTarget(f)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(f)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <button
                  className="mt-4 block w-full text-left"
                  onClick={() => router.push(`/dashboard/groups/${groupId}/folders/${f.id}`)}
                >
                  <h3 className="truncate font-semibold">{f.name}</h3>
                  {f.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.description}</p>
                  )}
                </button>
                <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  {f.record_count} {f.record_count === 1 ? 'record' : 'records'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FolderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        title="Create Folder"
        description="Add a new folder to this group."
      />
      <FolderFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
        onSubmit={handleEdit}
        title="Edit Folder"
        description="Update the folder details."
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its records
              and images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
