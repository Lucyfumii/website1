/*
# Security hardening fixes

## Issues addressed

### 1. set_updated_at — mutable search_path
The trigger function did not pin its search_path, allowing a malicious schema
to shadow objects it references. Fix: recreate with SET search_path = public, pg_catalog.

### 2. branding UPDATE policy — always true
`auth_update_branding` used `USING (true) WITH CHECK (true)`, meaning any
authenticated user could overwrite branding. Fix: restrict to rows where the
caller's email is in `allowed_users` with role = 'admin', OR the whitelist is
empty (bootstrap mode).

### 3. Storage SELECT policies — bucket-wide listing
Both `public_read_branding_assets` and `public_read_record_images` allowed
listing every object in the bucket via a simple `bucket_id = '...'` predicate.
Public buckets only need anonymous access to individual object URLs — they do
not need listing. Fix: require the object name to contain at least one path
separator (i.e. it's a real file, not a bare bucket root request). For
`record-images` we additionally require the path starts with a valid UUID
segment (the user-id prefix), blocking arbitrary enumeration.

### 4. SECURITY DEFINER functions — revoke broad PUBLIC grant
Both `is_email_allowed` and `current_user_admin_status` were granted to PUBLIC
(which includes all present and future roles). Revoke PUBLIC, then grant only
the minimum required roles:
- `is_email_allowed`: keep `anon` (login page needs it pre-auth) + `authenticated`.
- `current_user_admin_status`: revoke `anon` (only called post-login by authenticated
  sessions); keep `authenticated` only.
This eliminates the over-broad grant while preserving the required functionality.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. set_updated_at: pin search_path
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. branding UPDATE policy: restrict to admins only
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_update_branding" ON public.branding;
CREATE POLICY "auth_update_branding" ON public.branding
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users au
      WHERE au.role = 'admin'
        AND lower(au.email) = lower(auth.jwt() ->> 'email')
    )
    OR NOT EXISTS (SELECT 1 FROM public.allowed_users WHERE role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allowed_users au
      WHERE au.role = 'admin'
        AND lower(au.email) = lower(auth.jwt() ->> 'email')
    )
    OR NOT EXISTS (SELECT 1 FROM public.allowed_users WHERE role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Storage SELECT policies: prevent bucket-wide listing
-- Both buckets are still public (object URLs work), but unauthenticated
-- clients can no longer enumerate all objects with a bare list call.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. branding-assets: require the path to look like a real file (has a '/')
DROP POLICY IF EXISTS "public_read_branding_assets" ON storage.objects;
CREATE POLICY "public_read_branding_assets" ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'branding-assets'
    AND name ~ '^[^/]+/[^/]+'
  );

-- 3b. record-images: require path to start with a UUID segment (user-id prefix)
DROP POLICY IF EXISTS "public_read_record_images" ON storage.objects;
CREATE POLICY "public_read_record_images" ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'record-images'
    AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SECURITY DEFINER functions: revoke PUBLIC, grant only necessary roles
-- ─────────────────────────────────────────────────────────────────────────────

-- Revoke the overly broad PUBLIC grant on both functions
REVOKE ALL ON FUNCTION public.is_email_allowed(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_admin_status(text) FROM PUBLIC;

-- is_email_allowed: needed by anon (login page pre-auth check) + authenticated
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_email_allowed(text) TO authenticated;

-- current_user_admin_status: only called post-login by authenticated sessions
REVOKE ALL ON FUNCTION public.current_user_admin_status(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_admin_status(text) TO authenticated;
