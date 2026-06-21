'use client';

import { useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from '@/lib/queries';
import type { Group } from '@/lib/types';
import { exportGroupsToExcel } from '@/lib/export';
import { GroupFormDialog, type GroupFormValues } from '@/components/dashboard/group-form-dialog';
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
  Plus,
  Search,
  Pencil,
  Trash2,
  FolderOpen,
  FolderTree,
  FileSpreadsheet,
  Calendar,
  MoreVertical,
} from 'lucide-react';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<(Group & { folder_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (e) {
      toast.error('Failed to load groups', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? '').toLowerCase().includes(q)
    );
  }, [groups, search]);

  async function handleCreate(v: GroupFormValues) {
    await createGroup(v);
    toast.success('Group created');
    await load();
  }

  async function handleEdit(v: GroupFormValues) {
    if (!editTarget) return;
    await updateGroup(editTarget.id, v);
    toast.success('Group updated');
    setEditTarget(null);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteGroup(deleteTarget.id);
      toast.success('Group deleted');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('Failed to delete group', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Organize related folders into groups for cleaner navigation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportGroupsToExcel(filtered)} disabled={!filtered.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
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
                <Skeleton className="mt-4 h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasGroups={groups.length > 0} onCreate={() => setCreateOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <Card
              key={g.id}
              className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: g.color ?? '#2563eb' }}
              />
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${g.color ?? '#2563eb'}1a`, color: g.color ?? '#2563eb' }}
                  >
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/groups/${g.id}`)}>
                        <FolderOpen className="mr-2 h-4 w-4" /> Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditTarget(g)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(g)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <button
                  className="mt-4 block w-full text-left"
                  onClick={() => router.push(`/dashboard/groups/${g.id}`)}
                >
                  <h3 className="truncate font-semibold">{g.name}</h3>
                  {g.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                  )}
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {g.folder_count} {g.folder_count === 1 ? 'folder' : 'folders'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(g.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        title="Create Group"
        description="Add a new group to organize your folders."
      />
      <GroupFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
        onSubmit={handleEdit}
        title="Edit Group"
        description="Update the group details."
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and all its folders,
              records and images. This action cannot be undone.
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

function EmptyState({ hasGroups, onCreate }: { hasGroups: boolean; onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FolderTree className="h-7 w-7" />
        </div>
        <div>
          <p className="font-medium">{hasGroups ? 'No groups match your search' : 'No groups yet'}</p>
          <p className="text-sm text-muted-foreground">
            {hasGroups ? 'Try a different search term.' : 'Create your first group to get started.'}
          </p>
        </div>
        {!hasGroups && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Group
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
