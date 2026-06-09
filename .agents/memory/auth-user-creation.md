---
name: Auth User Creation in addUser
description: How addUser creates profiles and auth users correctly
---

## The Rule
`addUser` in `context.tsx`:
1. Generate `profileId` (use provided id or `crypto.randomUUID()`)
2. INSERT into `profiles` table WITHOUT `auth_user_id` (let ensure_auth_for_profile set it)
3. Call `ensure_auth_for_profile(profileId)` RPC — creates auth user server-side with derived password, confirms email, sets `auth_user_id` in profile
4. No admin session save/restore needed — no client-side auth operations

**Why:** Old approach (signUp in addUser) caused anti-enumeration fake UUID to be stored in `profiles.auth_user_id`. When user logged in later, `auth.uid()` (real UUID) didn't match stored fake UUID → RLS blocked everything → blank dashboard.

## ensure_auth_for_profile SQL function
Must be created once in Supabase SQL Editor. If it doesn't exist, addUser's try-catch silently skips step 3. The login flow then handles auth user creation on first login via signUp+confirm fallback.

The function (requires pgcrypto):
- Looks up username from profiles
- Checks if auth user exists for `username@igrejaapp.internal`
- If not: INSERTs into auth.users with `crypt(derived_pass, gen_salt('bf'))`, email_confirmed_at=NOW()
- If exists: UPDATEs password to derived and confirms email
- Always sets `profiles.auth_user_id` to the real UUID

**Why needed:** Supabase client signUp is unreliable for user creation in admin flows due to anti-enumeration and email confirmation settings.
