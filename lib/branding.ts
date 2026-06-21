'use client';

import { supabase } from '@/lib/supabase/client';
import type { Branding, AllowedUser } from '@/lib/types';

const BRANDING_BUCKET = 'branding-assets';

export const DEFAULT_BRANDING: Branding = {
  id: 1,
  brand_name: 'Admin Console',
  logo_url: null,
  logo_storage_path: null,
  updated_at: '',
  updated_by: null,
};

// ---------- Branding ----------
export async function fetchBranding(): Promise<Branding> {
  const { data, error } = await supabase
    .from('branding')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return data ?? DEFAULT_BRANDING;
}

export async function updateBranding(input: {
  brand_name?: string;
  logo_url?: string | null;
  logo_storage_path?: string | null;
  updated_by?: string;
}): Promise<Branding> {
  const { data, error } = await supabase
    .from('branding')
    .update(input)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadLogo(file: File, userId: string): Promise<{ url: string; path: string }> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `logos/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/png',
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(path);
  return { url: urlData.publicUrl, path };
}

export async function deleteLogo(storagePath: string | null): Promise<void> {
  if (!storagePath) return;
  await supabase.storage.from(BRANDING_BUCKET).remove([storagePath]);
}

// ---------- Admin gate (whitelist) ----------
// SECURITY DEFINER RPC: anon-safe membership check (does not leak the whitelist).
export async function isEmailAllowed(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_email_allowed', {
    check_email: email,
  });
  if (error) throw error;
  return Boolean(data);
}

// Returns the current user's admin status. Two cases:
// 1) Bootstrap — no admins exist yet → the caller is treated as admin so they
//    can run the whitelist UI for the first time.
// 2) Steady state — admins exist → caller is admin iff their email is in the
//    whitelist with role='admin' (checked server-side via is_email_allowed).
export async function isCurrentUserAdmin(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('current_user_admin_status', {
    user_email: email,
  });
  if (error) {
    // If the RPC is missing for any reason, fall back to bootstrap heuristic:
    // allowed if the email is allowed (no admin exists yet).
    return await isEmailAllowed(email);
  }
  return Boolean(data);
}

export async function fetchAllowedUsers(): Promise<AllowedUser[]> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addAllowedUser(email: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase
    .from('allowed_users')
    .insert({ email: email.trim().toLowerCase(), role });
  if (error) throw error;
}

export async function removeAllowedUser(id: string): Promise<void> {
  const { error } = await supabase.from('allowed_users').delete().eq('id', id);
  if (error) throw error;
}
