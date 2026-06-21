'use client';

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UploadCloud, X, Loader2 } from 'lucide-react';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

type Pending = {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
};

export function ImageDropzone({
  onUpload,
  disabled,
}: {
  onUpload: (files: File[]) => Promise<void>;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) return `${file.name}: unsupported file type`;
    if (file.size > MAX_SIZE) return `${file.name}: exceeds 5 MB`;
    return null;
  };

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || !fileList.length) return;
      const files = Array.from(fileList);
      const valid: File[] = [];
      const newPending: Pending[] = [];

      for (const file of files) {
        const err = validate(file);
        if (err) {
          toast.error(err);
          continue;
        }
        valid.push(file);
        newPending.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          preview: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
        });
      }

      if (!valid.length) return;
      setPending((p) => [...p, ...newPending]);

      setUploading(true);
      setPending((p) =>
        p.map((item) => (item.status === 'pending' ? { ...item, status: 'uploading', progress: 30 } : item))
      );

      try {
        await onUpload(valid);
        setPending((p) =>
          p.map((item) => (item.status === 'uploading' ? { ...item, status: 'done', progress: 100 } : item))
        );
        setTimeout(() => {
          setPending((p) => p.filter((item) => item.status !== 'done'));
        }, 1200);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setPending((p) =>
          p.map((item) => (item.status === 'uploading' ? { ...item, status: 'error', error: msg } : item))
        );
        toast.error('Upload failed', { description: msg });
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/50',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform',
            dragging && 'scale-110'
          )}
        >
          <UploadCloud className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm font-medium">
            {dragging ? 'Drop images here' : 'Drag & drop images, or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF · max 5 MB each</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.preview}
                  alt={p.file.name}
                  className="h-full w-full object-cover"
                />
                {p.status !== 'done' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    {p.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-white" />}
                    {p.status === 'error' && <X className="h-5 w-5 text-white" />}
                  </div>
                )}
              </div>
              <div className="p-1.5">
                <p className="truncate text-[11px] text-muted-foreground">{p.file.name}</p>
                {p.status === 'uploading' && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                )}
                {p.status === 'error' && (
                  <p className="mt-0.5 truncate text-[11px] text-destructive" title={p.error}>
                    Failed
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {uploading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
        </p>
      )}
    </div>
  );
}
