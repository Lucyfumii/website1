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

export type RecordFormValues = {
  title: string;
  notes?: string | null;
  update_date: string;
};

function today() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function RecordFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: RecordFormValues;
  onSubmit: (v: RecordFormValues) => Promise<void>;
  title: string;
  description?: string;
}) {
  const [recTitle, setRecTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [updateDate, setUpdateDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRecTitle(initial?.title ?? '');
      setNotes(initial?.notes ?? '');
      setUpdateDate(initial?.update_date ?? today());
      setErr(null);
    }
  }, [open, initial]);

  async function handle() {
    if (!recTitle.trim()) {
      setErr('Title is required');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({
        title: recTitle.trim(),
        notes: notes.trim() || undefined,
        update_date: updateDate,
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="rec-title">Title</Label>
            <Input
              id="rec-title"
              value={recTitle}
              onChange={(e) => setRecTitle(e.target.value)}
              placeholder="e.g. Spring Campaign Photos"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-notes">Notes</Label>
            <Textarea
              id="rec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context or notes about this record"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-date">Update Date</Label>
            <Input
              id="rec-date"
              type="date"
              value={updateDate}
              onChange={(e) => setUpdateDate(e.target.value)}
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
