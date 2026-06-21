'use client';

import { useEffect, useState } from 'react';
import { useBranding } from '@/lib/branding-context';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2, Upload, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BrandingPage() {
  const { branding, loading, saveBrandName, saveLogo, removeLogo } = useBranding();
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setBrandName(branding.brand_name);
    setDirty(false);
  }, [branding.brand_name]);

  async function handleSaveName() {
    if (!brandName.trim()) {
      toast.error('Brand name cannot be empty.');
      return;
    }
    setSavingName(true);
    try {
      await saveBrandName(brandName.trim());
      toast.success('Brand name updated');
      setDirty(false);
    } catch (e) {
      toast.error('Failed to update brand name', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB.');
      return;
    }
    setUploadingLogo(true);
    try {
      await saveLogo(file, user.id);
      toast.success('Logo updated');
    } catch (e) {
      toast.error('Failed to upload logo', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleRemoveLogo() {
    setRemovingLogo(true);
    try {
      await removeLogo();
      toast.success('Logo removed');
    } catch (e) {
      toast.error('Failed to remove logo', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRemovingLogo(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-fade max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Customize the logo and brand name shown across the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Logo
          </CardTitle>
          <CardDescription>
            Shown in the sidebar and on the login screen. PNG, JPG or SVG up to 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleLogoFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm transition-colors',
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                )}
              >
                <Upload className="h-4 w-4" />
                {uploadingLogo ? 'Uploading...' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleLogoFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                  disabled={uploadingLogo}
                />
              </label>
              {branding.logo_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={removingLogo}
                  className="text-destructive hover:text-destructive"
                >
                  {removingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand name</CardTitle>
          <CardDescription>The product name shown in the sidebar and page title.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name">Name</Label>
            <Input
              id="brand-name"
              value={brandName}
              onChange={(e) => {
                setBrandName(e.target.value);
                setDirty(true);
              }}
              placeholder="e.g. Admin Console"
              maxLength={60}
            />
          </div>
          <Button onClick={handleSaveName} disabled={savingName || !dirty}>
            {savingName ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : dirty ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
