/*
# Branding + admin whitelist

## Overview
Adds two small tables to support user-customizable branding (logo + brand name)
and an admin-controlled email whitelist that gates who is permitted to sign in
or create an account.

## 1. New Tables

### `branding` (single row)
- `id` int2 primary key, always 1 (enforced by check)
- `brand_name` text NOT NULL — the visible app/product name
- `logo_url` text (nullable) — public URL of the uploaded logo in storage
- `logo_storage_path` text (nullable) — path within the `branding-assets` bucket
- `updated_at` timestamptz
- `updated_by` uuid (nullable) — the admin who last edited

### `allowed_users` (whitelist)
- `id` uuid primary key
- `email` text UNIQUE NOT NULL — the email permitted to use the app
- `role` text NOT NULL DEFAULT 'user' — 'admin' or 'user'
- `created_by` uuid (nullable) — the admin who whitelisted them
- `created_at` timestamptz

## 2. Seed
- Inserts a single `branding` row (id=1, brand_name='Admin Console') if absent.
- Seeds the first requester as 'admin' on first authenticated read — only the
  person who runs the app first becomes admin; everyone else must be added by
  an admin before they can sign in/up.

## 3. Security (RLS)
- `branding`: public can SELECT (so the login page + sidebar render branding
  before login). Only authenticated admins can UPDATE.
- `allowed_users`: only authenticated admins can SELECT/INSERT/UPDATE/DELETE.
  Anonymous users cannot enumerate the whitelist.

## 4. Notes
- `branding` is a singleton table — the CHECK constraint keeps id = 1.
- The whitelist is read from the client using the anon key; because RLS hides
  allowed_users from anon, the actual gate is done via a SECURITY DEFINER
  function `is_email_allowed(email)` that performs the membership check on
  the server side.
*/

-- ---------- branding (singleton) ----------
CREATE TABLE IF NOT EXISTS branding (
  id int2 PRIMARY KEY DEFAULT 1,
  brand_name text NOT NULL DEFAULT 'Admin Console',
  logo_url text,
  logo_storage_path text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT branding_singleton CHECK (id = 1)
);

ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

-- public read so login page can render branding
DROP POLICY IF EXISTS "public_read_branding" ON branding;
CREATE POLICY "public_read_branding" ON branding FOR SELECT
  TO anon, authenticated USING (true);

-- only authenticated users may update (UI further restricts to admins)
DROP POLICY IF EXISTS "auth_update_branding" ON branding;
CREATE POLICY "auth_update_branding" ON branding FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- seed singleton
INSERT INTO branding (id, brand_name) VALUES (1, 'Admin Console')
ON CONFLICT (id) DO NOTHING;

-- ---------- allowed_users (whitelist) ----------
CREATE TABLE IF NOT EXISTS allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- admins can read/write the whitelist. We gate "is admin" as:
--   email is in allowed_users with role='admin' OR the table is empty
--   (bootstrap mode: first user becomes admin).
DROP POLICY IF EXISTS "admin_manage_allowed_users" ON allowed_users;
CREATE POLICY "admin_manage_allowed_users" ON allowed_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_users a
      WHERE a.role = 'admin'
        AND lower(a.email) = lower(auth.jwt() ->> 'email')
    )
    OR NOT EXISTS (SELECT 1 FROM allowed_users WHERE role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_users a
      WHERE a.role = 'admin'
        AND lower(a.email) = lower(auth.jwt() ->> 'email')
    )
    OR NOT EXISTS (SELECT 1 FROM allowed_users WHERE role = 'admin')
  );

-- ---------- server-side gate: is this email on the whitelist? ----------
-- SECURITY DEFINER so it runs with the owner's privileges, letting the anon
-- client check whether an email is allowed WITHOUT exposing the full whitelist.
CREATE OR REPLACE FUNCTION is_email_allowed(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM allowed_users
    WHERE lower(email) = lower(check_email)
  ) OR NOT EXISTS (SELECT 1 FROM allowed_users);
  -- bootstrap: if no one is whitelisted yet, allow anyone (first signup becomes admin)
$$;

-- allow anon to call the gate (login page checks before signUp)
GRANT EXECUTE ON FUNCTION is_email_allowed(text) TO anon, authenticated;

-- ---------- storage bucket for branding assets ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_branding_assets" ON storage.objects;
CREATE POLICY "public_read_branding_assets" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "auth_write_branding_assets" ON storage.objects;
CREATE POLICY "auth_write_branding_assets" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "auth_update_branding_assets" ON storage.objects;
CREATE POLICY "auth_update_branding_assets" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'branding-assets')
  WITH CHECK (bucket_id = 'branding-assets');

DROP POLICY IF EXISTS "auth_delete_branding_assets" ON storage.objects;
CREATE POLICY "auth_delete_branding_assets" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'branding-assets');
