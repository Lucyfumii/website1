export type Group = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type RecordType = {
  id: string;
  folder_id: string;
  title: string;
  notes: string | null;
  update_date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

export type RecordImage = {
  id: string;
  record_id: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  user_id: string;
  created_at: string;
};

export type GroupWithCounts = Group & {
  folder_count: number;
};

export type FolderWithCounts = Folder & {
  record_count: number;
};

export type RecordWithImages = RecordType & {
  images: RecordImage[];
};

export type DashboardStats = {
  totalGroups: number;
  totalFolders: number;
  totalRecords: number;
  totalImages: number;
  groupsTrend: { name: string; groups: number; folders: number; records: number }[];
  recentRecords: (RecordType & { group_name: string; folder_name: string })[];
};

export type Branding = {
  id: number;
  brand_name: string;
  logo_url: string | null;
  logo_storage_path: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type AllowedUser = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_by: string | null;
  created_at: string;
};
