'use client';

import { useEffect, useState } from 'react';
import {
  fetchAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
} from '@/lib/branding';
import type { AllowedUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { Users, UserPlus, Trash2, Shield, User as UserIcon, Loader2 } from 'lucide-react';

export default function AccessPage() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllowedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllowedUsers();
      setUsers(data);
    } catch (e) {
      toast.error('Failed to load whitelist', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!email.trim()) {
      toast.error('Enter an email address.');
      return;
    }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      toast.error('This email is already on the whitelist.');
      return;
    }
    setAdding(true);
    try {
      await addAllowedUser(email.trim(), role);
      toast.success(`${email.trim()} added as ${role}`);
      setEmail('');
      setRole('user');
      await load();
    } catch (e) {
      toast.error('Failed to add user', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeAllowedUser(deleteTarget.id);
      toast.success('User removed from whitelist');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error('Failed to remove user', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in-fade max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold">Access Control</h2>
        <p className="text-sm text-muted-foreground">
          Only whitelisted emails can sign in or create an account. The first admin was created
          automatically the first time the app was used.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add a user
          </CardTitle>
          <CardDescription>Whitelist a new email so they can sign up.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
              />
            </div>
            <div className="w-full space-y-2 sm:w-40">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v: 'admin' | 'user') => setRole(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={adding} className="sm:mb-0">
              {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Whitelisted users
          </CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'} with access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No whitelist yet</p>
              <p className="text-xs text-muted-foreground">
                Bootstrap mode active — anyone can currently sign up. Add a user to enable the
                whitelist.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {u.role === 'admin' ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <UserIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will no longer be able to sign in or create an account. Their existing data
              is preserved. They can be re-added at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
