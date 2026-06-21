# Admin Dashboard

A production-ready admin dashboard built with **Next.js 15 (App Router)**, **TypeScript**, **TailwindCSS**, **Shadcn UI**, and **Supabase** (database + storage). Manage Groups → Folders → Records, with drag-and-drop image uploads, search/filter, dark mode, and Excel export.

## Features

- **Authentication** — Supabase email/password sign-in & sign-up, protected routes, persistent sessions.
- **Dashboard overview** — live stat cards (groups, folders, records, images), 6-month activity bar chart, recent records feed.
- **Groups management** — create / edit / delete with name, description, and accent color. Cascade-deletes child folders, records, and storage images.
- **Folder management** — nested inside each group; create / edit / delete with live record counts.
- **Record management** — records contain a title, notes, an editable **update date**, and multiple images.
- **Drag-and-drop image upload** — Supabase Storage-backed, with per-file preview, progress, validation (type + 5 MB), and delete (removes the storage object too).
- **Search & filter** — every list view has search + sorting.
- **Excel export** — export stats, groups, folders, or records to `.xlsx` (dynamic import keeps `xlsx` out of the server bundle).
- **Dark mode** — system / light / dark, persisted via `next-themes`.
- **Responsive design** — mobile sidebar drawer, fluid grids, touch-friendly controls.
- **Row Level Security** — every table is owner-scoped via `user_id = auth.uid()`; storage objects are namespaced per-user.

## Tech Stack

| Layer | Tech |
|------|------|
| Framework | Next.js (App Router) + React 18 |
| Language | TypeScript |
| Styling | TailwindCSS, Shadcn UI, lucide-react icons |
| Database | Supabase Postgres |
| Storage | Supabase Storage (public bucket `record-images`) |
| Auth | Supabase Auth (email/password) |
| Charts | Recharts |
| Export | SheetJS (`xlsx`) |

## Getting Started

### 1. Environment variables

The Supabase project is pre-provisioned. Ensure `.env` (or `.env.local`) contains:

```
NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> Both values are already populated in this environment. They must be `NEXT_PUBLIC_` because the client uses the anon key in the browser.

### 2. Install dependencies

```bash
npm install
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

### 4. Create your first admin

On the login page, use the **Create Account** tab to sign up with an email and password (min 6 chars). Email confirmation is OFF, so you can sign in immediately after.

## Database Schema

The schema is applied via two Supabase migrations (see `SQL` section below). Tables:

```
groups          (id, name, description, color, user_id, created_at, updated_at)
folders         (id, group_id → groups.id, name, description, user_id, created_at, updated_at)
records         (id, folder_id → folders.id, title, notes, update_date, user_id, created_at, updated_at)
record_images   (id, record_id → records.id, storage_path, public_url, file_name, file_size,
                 mime_type, user_id, created_at)
```

### Security model

- **RLS enabled** on every table.
- **Owner-scoped CRUD** — four policies per table (SELECT / INSERT / UPDATE / DELETE), each restricted to `authenticated` users where `user_id = auth.uid()`.
- **Owner columns default to `auth.uid()`** so inserts that omit `user_id` still satisfy the INSERT policy.
- **Cascade deletes** — removing a group deletes its folders, records, and image rows.
- **Storage** — the `record-images` bucket is public-read (so image URLs render) but writes/deletes require authentication and a path matching the user's ID prefix `<user_id>/<record_id>/<filename>`.

### SQL

The migrations below are already applied to the provisioned Supabase project via the Supabase MCP tools. They are idempotent and safe to re-run.

<details>
<summary>1. Schema + RLS + triggers</summary>

```sql
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

-- updated_at triggers
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
```

</details>

<details>
<summary>2. Storage bucket + storage policies</summary>

```sql
-- public bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('record-images', 'record-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_record_images" ON storage.objects;
CREATE POLICY "public_read_record_images" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'record-images');

DROP POLICY IF EXISTS "auth_insert_own_record_images" ON storage.objects;
CREATE POLICY "auth_insert_own_record_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'record-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_update_own_record_images" ON storage.objects;
CREATE POLICY "auth_update_own_record_images" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'record-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'record-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_delete_own_record_images" ON storage.objects;
CREATE POLICY "auth_delete_own_record_images" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'record-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

</details>

## Project Structure

```
app/
  layout.tsx                      # Root layout: providers, toaster
  page.tsx                        # Redirects to /dashboard
  login/page.tsx                  # Sign in / sign up
  dashboard/
    layout.tsx                    # Protected shell (auth guard + sidebar)
    page.tsx                      # Overview: stat cards + activity chart
    stats/page.tsx                # Statistics + Excel export
    groups/
      page.tsx                    # Groups list + CRUD
      [id]/
        page.tsx                  # Folder management inside a group
        folders/
          [folderId]/
            page.tsx              # Record list + CRUD + search/sort
            records/
              [recordId]/
                page.tsx          # Record detail: images, notes, date
components/
  dashboard-shell.tsx             # Sidebar + header + mobile drawer
  protected.tsx                   # Route guard redirecting to /login
  theme-provider.tsx, theme-toggle.tsx
  dashboard/                      # Form dialogs + drag-drop dropzone
  ui/                             # Shadcn UI primitives
lib/
  supabase/client.ts              # Supabase singleton
  auth-context.tsx                # Auth provider + hooks
  queries.ts                      # All data-access functions
  export.ts                       # Excel export helpers (dynamic xlsx import)
  types.ts                        # Domain types
hooks/use-toast.ts
supabase/functions/               # Edge functions (if added later)
```

## Build

```bash
npm run build   # production build
npm run typecheck
```

## Deployment

### Netlify (preconfigured)

This project includes `netlify.toml` and the `@netlify/plugin-nextjs` plugin. The environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) are already set in this environment — in your own Netlify dashboard, add the same two variables under **Site settings → Environment variables**.

```bash
# from the project root, the Next.js plugin handles SSR/ISR automatically
git push                            # connect the repo to Netlify
# or deploy via CLI:
npx netlify deploy --prod
```

### Vercel

```bash
npm i -g vercel
vercel              # follow prompts; add the two NEXT_PUBLIC_ env vars in the dashboard
vercel --prod
```

### Any Node host

```bash
npm run build
npm start
```

Set the two `NEXT_PUBLIC_` environment variables before building (they're inlined at build time).

## Notes & Limits

- Image upload max: **5 MB** per file, types: PNG/JPG/WebP/GIF.
- Each admin only sees their own data (RLS-enforced).
- Deleting a group cascades to folders, records, image rows, **and** removes the storage objects for its records' images.
- `xlsx` is dynamically imported only when an export button is clicked, so it never enters the server bundle or initial page load.
