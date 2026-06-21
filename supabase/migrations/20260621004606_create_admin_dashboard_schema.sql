/*
# Admin Dashboard Schema

## Overview
Creates the full data model for an admin dashboard that manages Groups, Folders,
Records, and Record Images. Every row is owner-scoped to the authenticated admin
who created it via `user_id` (defaulting to `auth.uid()`) so each admin only sees
their own data.

## 1. New Tables

### `groups`
- `id` uuid primary key
- `name` text (not null)
- `description` text (nullable)
- `color` text (nullable, hex color for UI accent)
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner
- `created_at` timestamptz
- `updated_at` timestamptz

### `folders`
- `id` uuid primary key
- `group_id` uuid FK -> groups(id) ON DELETE CASCADE
- `name` text (not null)
- `description` text (nullable)
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner
- `created_at` timestamptz
- `updated_at` timestamptz

### `records`
- `id` uuid primary key
- `folder_id` uuid FK -> folders(id) ON DELETE CASCADE
- `title` text (not null)
- `notes` text (nullable)
- `update_date` date (not null) — the business "updated" date the admin sets
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner
- `created_at` timestamptz
- `updated_at` timestamptz

### `record_images`
- `id` uuid primary key
- `record_id` uuid FK -> records(id) ON DELETE CASCADE
- `storage_path` text (not null) — path within the `record-images` storage bucket
- `public_url` text (not null) — signed/public URL served to the browser
- `file_name` text (not null)
- `file_size` bigint (nullable, bytes)
- `mime_type` text (nullable)
- `user_id` uuid NOT NULL DEFAULT auth.uid() — owner
- `created_at` timestamptz

## 2. Indexes
- folders(group_id), records(folder_id), record_images(record_id)
- owner indexes: groups(user_id), folders(user_id), records(user_id), record_images(user_id)
- records.update_date for date filtering

## 3. Security (RLS)
- RLS enabled on every table.
- Owner-scoped CRUD (4 separate policies per table): an authenticated admin can only
  SELECT/INSERT/UPDATE/DELETE rows where `user_id = auth.uid()`.
- Owner columns default to `auth.uid()` so inserts that omit user_id still pass policy.

## 4. Notes
- Cascade deletes keep storage references in record_images consistent until the
  frontend removes the underlying storage objects.
*/

-- groups
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#2563eb',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

DROP POLICY IF EXISTS "select_own_groups" ON groups;
CREATE POLICY "select_own_groups" ON groups FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_groups" ON groups;
CREATE POLICY "insert_own_groups" ON groups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_groups" ON groups;
CREATE POLICY "update_own_groups" ON groups FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_groups" ON groups;
CREATE POLICY "delete_own_groups" ON groups FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- folders
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_folders_group_id ON folders(group_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders(created_at DESC);

DROP POLICY IF EXISTS "select_own_folders" ON folders;
CREATE POLICY "select_own_folders" ON folders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_folders" ON folders;
CREATE POLICY "insert_own_folders" ON folders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_folders" ON folders;
CREATE POLICY "update_own_folders" ON folders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_folders" ON folders;
CREATE POLICY "delete_own_folders" ON folders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- records
CREATE TABLE IF NOT EXISTS records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  title text NOT NULL,
  notes text,
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_records_folder_id ON records(folder_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_update_date ON records(update_date DESC);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

DROP POLICY IF EXISTS "select_own_records" ON records;
CREATE POLICY "select_own_records" ON records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_records" ON records;
CREATE POLICY "insert_own_records" ON records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_records" ON records;
CREATE POLICY "update_own_records" ON records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_records" ON records;
CREATE POLICY "delete_own_records" ON records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- record_images
CREATE TABLE IF NOT EXISTS record_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE record_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_record_images_record_id ON record_images(record_id);
CREATE INDEX IF NOT EXISTS idx_record_images_user_id ON record_images(user_id);
CREATE INDEX IF NOT EXISTS idx_record_images_created_at ON record_images(created_at DESC);

DROP POLICY IF EXISTS "select_own_record_images" ON record_images;
CREATE POLICY "select_own_record_images" ON record_images FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_record_images" ON record_images;
CREATE POLICY "insert_own_record_images" ON record_images FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_record_images" ON record_images;
CREATE POLICY "update_own_record_images" ON record_images FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_record_images" ON record_images;
CREATE POLICY "delete_own_record_images" ON record_images FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at auto-maintenance triggers
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_groups_updated_at ON groups;
CREATE TRIGGER trg_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_folders_updated_at ON folders;
CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_records_updated_at ON records;
CREATE TRIGGER trg_records_updated_at BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
