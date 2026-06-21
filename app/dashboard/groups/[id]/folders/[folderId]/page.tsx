'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  fetchFolders,
  fetchRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  uploadRecordImages,
} from '@/lib/queries';
import type { Folder, RecordWithImages } from '@/lib/types';
import { exportRecordsToExcel } from '@/lib/export';
import { RecordFormDialog, type RecordFormValues } from '@/components/dashboard/record-form-dialog';
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
import { Badge } from '@/components/ui/badge';
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
  FileText,
  ImageIcon,
  FileSpreadsheet,
  ChevronRight,
  MoreVertical,
  Calendar,
  StickyNote,
  Camera,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

type SortKey = 'update_date' | 'title' | 'created_at';

export default function FolderDetailPage() {
  const params = useParams<{ id: string; folderId: string }>();
  const groupId = params.id;
  const folderId = params.folderId;
  const router = useRouter();
  const { user } = useAuth();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [records, setRecords] = useState<RecordWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('update_date');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RecordWithImages | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecordWithImages | null>(null);
  const [busy, setBusy] = useState(false);
  // per-record uploading state: recordId -> bool
  const [uploading, setUploading] = useState<{ [id: string]: boolean }>({});
  // refs for file inputs keyed by recordId
  const fileInputRefs = useRef<{ [id: string]: HTMLInputElement | null }>({});

  const load = async () => {
    setLoading(true);
    try {
      const folders = await fetchFolders(groupId);
      setFolder(folders.find((f) => f.id === folderId) ?? null);
      const recs = await fetchRecords(folderId);
      setRecords(recs);
    } catch (e) {
      toast.error('Failed to load', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? records.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.notes ?? '').toLowerCase().includes(q)
        )
      : records;
    list = [...list].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'created_at') return a.created_at < b.created_at ? 1 : -1;
      return a.update_date < b.update_date ? 1 : -1;
    });
    return list;
  }, [records, search, sort]);

  async function handleCreate(v: RecordFormValues) {
    await createRecord({ folder_id: folderId, ...v });
    toast.success('Record created');
    await load();
  }

  async function handleEdit(v: RecordFormValues) {
    if (!editTarget) return;
    await updateRecord(editTarget.id, v);
    toast.success('Record updated');
    setEditTarget(null);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteRecord(deleteTarget.id);
      toast.success('Record deleted');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('Failed to delete record', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickUpload(recordId: string, files: FileList | null) {
    if (!files || !files.length || !user) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!valid.length) { toast.error('Please select image files only.'); return; }

    setUploading((prev) => ({ ...prev, [recordId]: true }));
    try {
      await uploadRecordImages(recordId, user.id, valid);
      toast.success(`${valid.length} image${valid.length > 1 ? 's' : ''} added`);
      await load();
    } catch (e) {
      toast.error('Upload failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploading((prev) => ({ ...prev, [recordId]: false }));
    }
  }

  const exportRows = filtered.map((r) => ({ ...r, image_count: r.images?.length ?? 0 }));

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/groups" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Groups
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/dashboard/groups/${groupId}`} className="hover:text-foreground">
          Group
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{folder?.name ?? 'Loading...'}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {records.length} {records.length === 1 ? 'record' : 'records'} in this folder.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportRecordsToExcel(exportRows)} disabled={!filtered.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Record
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search records by title or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Sort: {sort === 'update_date' ? 'Update date' : sort === 'title' ? 'Title' : 'Created'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSort('update_date')}>Update date</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort('title')}>Title (A-Z)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort('created_at')}>Created date</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="mt-3 h-5 w-2/3" />
                <Skeleton className="mt-2 h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium">
                {records.length ? 'No records match your search' : 'No records yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {records.length ? 'Try a different search.' : 'Create a record to upload images and notes.'}
              </p>
            </div>
            {!records.length && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Record
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const cover = r.images?.[0];
            const count = r.images?.length ?? 0;
            const isUploading = !!uploading[r.id];
            return (
              <Card
                key={r.id}
                className="group overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
              >
                {/* Thumbnail — click to open, camera button to quick-upload */}
                <div className="relative aspect-[4/3] w-full bg-muted">
                  <button
                    className="absolute inset-0 block h-full w-full"
                    onClick={() =>
                      router.push(`/dashboard/groups/${groupId}/folders/${folderId}/records/${r.id}`)
                    }
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.public_url} alt={r.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </button>

                  {/* Image count badge */}
                  {count > 0 && (
                    <Badge className="pointer-events-none absolute right-2 top-2 bg-black/70 text-white hover:bg-black/70">
                      <ImageIcon className="mr-1 h-3 w-3" />
                      {count}
                    </Badge>
                  )}

                  {/* Quick-upload button — bottom-left of thumbnail */}
                  <div className="absolute bottom-2 left-2">
                    <input
                      ref={(el) => { fileInputRefs.current[r.id] = el; }}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handleQuickUpload(r.id, e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[r.id]?.click();
                      }}
                      disabled={isUploading}
                      title="Add images"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 shadow-md backdrop-blur-sm transition-all hover:bg-primary group-hover:opacity-100 disabled:cursor-not-allowed"
                    >
                      {isUploading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Camera className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="min-w-0 text-left"
                      onClick={() =>
                        router.push(
                          `/dashboard/groups/${groupId}/folders/${folderId}/records/${r.id}`
                        )
                      }
                    >
                      <h3 className="truncate font-semibold">{r.title}</h3>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/dashboard/groups/${groupId}/folders/${folderId}/records/${r.id}`
                            )
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRefs.current[r.id]?.click();
                          }}
                          disabled={isUploading}
                        >
                          <Camera className="mr-2 h-4 w-4" /> Add images
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditTarget(r)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {r.notes && (
                    <p className="mt-1 flex items-start gap-1.5 line-clamp-2 text-sm text-muted-foreground">
                      <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {r.notes}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {r.update_date}
                    </span>
                    {/* Inline add-images text link always visible */}
                    <button
                      onClick={() => fileInputRefs.current[r.id]?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      {isUploading
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                        : <><Camera className="h-3 w-3" /> Add images</>
                      }
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RecordFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        title="Create Record"
        description="Add a record to this folder."
      />
      <RecordFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
        onSubmit={handleEdit}
        title="Edit Record"
        description="Update the record details."
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and all its images.
              This action cannot be undone.
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
