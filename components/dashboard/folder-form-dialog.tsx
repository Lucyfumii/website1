'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export type FolderFormValues = {
  name: string;
  description?: string | null;
};

export function FolderFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: FolderFormValues;
  onSubmit: (v: FolderFormValues) => Promise<void>;
  title: string;
  description?: string;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
      setErr(null);
    }
  }, [open, initial]);

  async function handle() {
    if (!name.trim()) {
      setErr('Name is required');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({
        name: name.trim(),
        description: desc.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Campaigns"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="folder-desc">Description</Label>
            <Textarea
              id="folder-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handle} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
