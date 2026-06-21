'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  fetchRecords,
  updateRecord,
  deleteRecordImage,
  uploadRecordImages,
} from '@/lib/queries';
import type { RecordWithImages } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { ImageDropzone } from '@/components/dashboard/image-dropzone';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  StickyNote,
  Trash2,
  Loader2,
  Save,
  Image as ImageIcon,
  Download,
  Eye,
} from 'lucide-react';

export default function RecordDetailPage() {
  const params = useParams<{ id: string; folderId: string; recordId: string }>();
  const groupId = params.id;
  const folderId = params.folderId;
  const recordId = params.recordId;
  const { user } = useAuth();

  const [record, setRecord] = useState<RecordWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [updateDate, setUpdateDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [deleteImg, setDeleteImg] = useState<{ id: string; path?: string } | null>(null);
  const [deletingImg, setDeletingImg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await fetchRecords(folderId);
      const rec = recs.find((r) => r.id === recordId) ?? null;
      setRecord(rec);
      setTitle(rec?.title ?? '');
      setNotes(rec?.notes ?? '');
      setUpdateDate(rec?.update_date ?? '');
      setDirty(false);
    } catch (e) {
      toast.error('Failed to load record', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [folderId, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    try {
      await updateRecord(record.id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        update_date: updateDate,
      });
      toast.success('Record saved');
      setDirty(false);
      await load();
    } catch (e) {
      toast.error('Failed to save', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(files: File[]) {
    if (!record || !user) return;
    await uploadRecordImages(record.id, user.id, files);
    toast.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded`);
    await load();
  }

  async function handleDeleteImage() {
    if (!deleteImg) return;
    setDeletingImg(true);
    try {
      await deleteRecordImage(deleteImg.id, deleteImg.path);
      toast.success('Image deleted');
      setDeleteImg(null);
      await load();
    } catch (e) {
      toast.error('Failed to delete image', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeletingImg(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Record not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/dashboard/groups/${groupId}/folders/${folderId}`}>Back to folder</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/groups" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Groups
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/dashboard/groups/${groupId}`} className="hover:text-foreground">Group</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/dashboard/groups/${groupId}/folders/${folderId}`} className="hover:text-foreground">
          Folder
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{title || 'Record'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Images */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImageIcon className="h-5 w-5 text-primary" />
                Images
                <span className="text-sm font-normal text-muted-foreground">
                  ({record.images?.length ?? 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageDropzone onUpload={handleUpload} />

              {record.images && record.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {record.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative overflow-hidden rounded-lg border border-border bg-card"
                    >
                      <div className="relative aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.public_url}
                          alt={img.file_name}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => setViewer(img.public_url)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <a href={img.public_url} download target="_blank" rel="noreferrer">
                            <Button size="icon" variant="secondary" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() =>
                              setDeleteImg({ id: img.id, path: img.storage_path })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[11px] text-muted-foreground">{img.file_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No images yet. Upload using the dropzone above.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="d-title">Title</Label>
                <Input
                  id="d-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Update Date
                </Label>
                <Input
                  id="d-date"
                  type="date"
                  value={updateDate}
                  onChange={(e) => {
                    setUpdateDate(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-notes" className="flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </Label>
                <Textarea
                  id="d-notes"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
                  rows={6}
                  placeholder="Add any notes about this record..."
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !dirty} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {dirty ? 'Save Changes' : 'Saved'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Created" value={new Date(record.created_at).toLocaleString()} />
              <Row label="Last updated" value={new Date(record.updated_at).toLocaleString()} />
              <Row
                label="Storage"
                value={`${record.images?.length ?? 0} image${(record.images?.length ?? 0) === 1 ? '' : 's'}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image viewer */}
      <Dialog open={!!viewer} onOpenChange={(v) => !v && setViewer(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {viewer && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={viewer}
              alt="Preview"
              className="mx-auto max-h-[85vh] w-auto rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete image confirm */}
      <AlertDialog open={!!deleteImg} onOpenChange={(v) => !v && setDeleteImg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              The image will be permanently removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingImg}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              disabled={deletingImg}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingImg && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}
