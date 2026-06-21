/*
# Storage policies for record-images bucket

## Overview
The `record-images` bucket is public-read (so cached image URLs render in the
browser) but writes/deletes are restricted to authenticated admins. Objects are
namespaced per-user under `<user_id>/<record_id>/<filename>` so the policy can
enforce that an admin only writes/deletes objects in their own prefix.

## Policies
- SELECT (public read): anyone can read object URLs (bucket is public).
- INSERT/UPDATE/DELETE: only authenticated users, and only for objects whose
  path starts with their own user_id.
*/

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
