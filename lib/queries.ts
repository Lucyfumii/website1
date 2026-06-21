'use client';

import { supabase, STORAGE_BUCKET } from '@/lib/supabase/client';
import type {
  Group,
  Folder,
  RecordType,
  RecordImage,
  RecordWithImages,
  DashboardStats,
} from '@/lib/types';

const ASC = { ascending: true } as const;
const DESC = { ascending: false } as const;

// ---------- Groups ----------
export async function fetchGroups(): Promise<(Group & { folder_count: number })[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*, folders(count)')
    .order('created_at', DESC);
  if (error) throw error;
  return (groups ?? []).map((g) => ({
    ...g,
    folder_count: g.folders?.[0]?.count ?? 0,
    folders: undefined,
  })) as (Group & { folder_count: number })[];
}

export async function createGroup(input: {
  name: string;
  description?: string | null;
  color?: string | null;
}): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGroup(
  id: string,
  input: { name?: string; description?: string | null; color?: string | null }
): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Folders ----------
export async function fetchFolders(groupId: string): Promise<(Folder & { record_count: number })[]> {
  const { data, error } = await supabase
    .from('folders')
    .select('*, records(count)')
    .eq('group_id', groupId)
    .order('created_at', ASC);
  if (error) throw error;
  return (data ?? []).map((f) => ({
    ...f,
    record_count: f.records?.[0]?.count ?? 0,
    records: undefined,
  })) as (Folder & { record_count: number })[];
}

export async function createFolder(input: {
  group_id: string;
  name: string;
  description?: string | null;
}): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFolder(
  id: string,
  input: { name?: string; description?: string | null }
): Promise<Folder> {
  const { data, error } = await supabase
    .from('folders')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Records ----------
export async function fetchRecords(folderId: string): Promise<RecordWithImages[]> {
  const { data, error } = await supabase
    .from('records')
    .select('*, images:record_images(*)')
    .eq('folder_id', folderId)
    .order('update_date', DESC);
  if (error) throw error;
  return (data ?? []) as RecordWithImages[];
}

export async function createRecord(input: {
  folder_id: string;
  title: string;
  notes?: string | null;
  update_date: string;
}): Promise<RecordType> {
  const { data, error } = await supabase
    .from('records')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecord(
  id: string,
  input: { title?: string; notes?: string | null; update_date?: string }
): Promise<RecordType> {
  const { data, error } = await supabase
    .from('records')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecord(id: string): Promise<void> {
  const { data: images } = await supabase
    .from('record_images')
    .select('storage_path')
    .eq('record_id', id);
  if (images && images.length) {
    const paths = images.map((i) => i.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Images ----------
export async function uploadRecordImages(
  recordId: string,
  userId: string,
  files: File[]
): Promise<RecordImage[]> {
  const uploaded: RecordImage[] = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${recordId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const { data, error } = await supabase
      .from('record_images')
      .insert({
        record_id: recordId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();
    if (error) throw error;
    uploaded.push(data);
  }

  return uploaded;
}

export async function deleteRecordImage(id: string, storagePath?: string): Promise<void> {
  if (storagePath) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
  }
  const { error } = await supabase.from('record_images').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Manage Panel ----------
export type FolderPanelRow = {
  folder_id: string;
  folder_name: string;
  folder_description: string | null;
  group_id: string;
  group_name: string;
  group_color: string | null;
  record_count: number;
  image_count: number;
};

export async function fetchManagePanel(): Promise<FolderPanelRow[]> {
  // Fetch all folders with their group info and nested record + image counts
  const { data, error } = await supabase
    .from('folders')
    .select(`
      id,
      name,
      description,
      group_id,
      groups!inner ( name, color ),
      records ( id, record_images ( id ) )
    `)
    .order('name', ASC);
  if (error) throw error;

  return (data ?? []).map((f) => {
    const records = (f.records ?? []) as { id: string; record_images: { id: string }[] }[];
    const record_count = records.length;
    const image_count = records.reduce((sum, r) => sum + (r.record_images?.length ?? 0), 0);
    const grp = f.groups as unknown as { name: string; color: string | null };
    return {
      folder_id: f.id,
      folder_name: f.name,
      folder_description: f.description,
      group_id: f.group_id,
      group_name: grp?.name ?? '—',
      group_color: grp?.color ?? null,
      record_count,
      image_count,
    };
  });
}

// ---------- Dashboard stats ----------
export async function fetchStats(): Promise<DashboardStats> {
  const [groupsRes, foldersRes, recordsRes, imagesRes] = await Promise.all([
    supabase.from('groups').select('id, name, created_at'),
    supabase.from('folders').select('id, group_id, created_at'),
    supabase.from('records').select('id, folder_id, title, update_date, created_at'),
    supabase.from('record_images').select('id', { count: 'exact', head: true }),
  ]);

  if (groupsRes.error) throw groupsRes.error;
  if (foldersRes.error) throw foldersRes.error;
  if (recordsRes.error) throw recordsRes.error;

  const recent = (recordsRes.data ?? [])
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

  const folderIds = Array.from(new Set(recent.map((r) => r.folder_id)));
  let folderMap: { [k: string]: { name: string; group_id: string } } = {};
  let groupMap: { [k: string]: string } = {};
  if (folderIds.length) {
    const { data: fds } = await supabase
      .from('folders')
      .select('id, name, group_id')
      .in('id', folderIds);
    folderMap = Object.fromEntries((fds ?? []).map((f) => [f.id, f]));
    const groupIds = Array.from(
      new Set(Object.values(folderMap).map((f) => f.group_id))
    );
    if (groupIds.length) {
      const { data: gds } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds);
      groupMap = Object.fromEntries((gds ?? []).map((g) => [g.id, g.name]));
    }
  }

  const recentRecords = recent.map((r) => ({
    ...r,
    notes: '',
    user_id: '',
    updated_at: r.created_at,
    group_name: groupMap[folderMap[r.folder_id]?.group_id] ?? '—',
    folder_name: folderMap[r.folder_id]?.name ?? '—',
  })) as DashboardStats['recentRecords'];

  const now = new Date();
  const months: { name: string; groups: number; folders: number; records: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const name = d.toLocaleString('en-US', { month: 'short' });
    months.push({
      name,
      groups: (groupsRes.data ?? []).filter(
        (g) => g.created_at >= d.toISOString() && g.created_at < next.toISOString()
      ).length,
      folders: (foldersRes.data ?? []).filter(
        (f) => f.created_at >= d.toISOString() && f.created_at < next.toISOString()
      ).length,
      records: (recordsRes.data ?? []).filter(
        (r) => r.created_at >= d.toISOString() && r.created_at < next.toISOString()
      ).length,
    });
  }

  return {
    totalGroups: groupsRes.data?.length ?? 0,
    totalFolders: foldersRes.data?.length ?? 0,
    totalRecords: recordsRes.data?.length ?? 0,
    totalImages: imagesRes.count ?? 0,
    groupsTrend: months,
    recentRecords,
  };
}
