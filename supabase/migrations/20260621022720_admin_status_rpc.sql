/*
# Admin status RPC

## Overview
Adds a SECURITY DEFINER function `current_user_admin_status(email)` that returns
true if the given email is an admin in `allowed_users`, OR if no admin exists
yet (bootstrap mode — the first user becomes admin). This runs server-side with
the owner's privileges so the client can determine admin status without the RLS
policy obscuring it.

## Function
- `current_user_admin_status(user_email text) RETURNS boolean`
  - SECURITY DEFINER, search_path = public
  - Returns true if (a) `allowed_users` has zero admins, or (b) the given email
    matches an admin row (case-insensitive).

## Permissions
- EXECUTE granted to anon + authenticated so the login page and dashboard can
  call it before a session is fully established.
*/

CREATE OR REPLACE FUNCTION current_user_admin_status(user_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM allowed_users WHERE role = 'admin')
    OR EXISTS (
      SELECT 1 FROM allowed_users
      WHERE role = 'admin' AND lower(email) = lower(user_email)
    );
$$;

GRANT EXECUTE ON FUNCTION current_user_admin_status(text) TO anon, authenticated;
