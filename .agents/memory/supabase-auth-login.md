---
name: Supabase Auth Login Flow
description: Simplified login flow — derived password only; removed real-password step and ensure_auth_for_profile from login to eliminate 400/404 console errors
---

## The Rule
The login function in `context.tsx` uses this exact order:

1. `login_profile` RPC — validates username+password against `profiles` table (SECURITY DEFINER, bypasses RLS). If returns empty → reject immediately.
2. `signInWithPassword(email, derivedPassword)` — derived password = `IA_<profile_uuid>`.
3. If step 2 fails: `signUp` → `confirm_internal_user` RPC → `signInWithPassword(derived)` → `link_profile_to_auth`.

**Why:** The old step 2 (signInWithPassword with real password) always returned 400 for modern users (causing console noise), and the old step 3 (ensure_auth_for_profile in login) returned 404 when the SQL function wasn't deployed (also console noise). Both were removed since the derived-password path handles all users correctly.

**Never** add back a signInWithPassword with the user's real password in the login flow — it causes 400 errors for every user who doesn't have their real password in Supabase Auth.

## Key RPCs (all SECURITY DEFINER)
- `login_profile(p_username, p_password)` — validates credentials, returns profile row
- `confirm_internal_user(p_email)` — confirms email in auth.users for @igrejaapp.internal
- `link_profile_to_auth(p_username, p_auth_user_id)` — sets auth_user_id in profiles
- `ensure_auth_for_profile(p_profile_id)` — creates/fixes auth user + sets auth_user_id; called in `addUser` only, NOT in login flow

## Anti-enumeration trap
`supabase.auth.signUp()` for an existing email returns a FAKE UUID (not the real auth user's UUID). Never store the UUID from signUp directly into `profiles.auth_user_id` without verifying via signIn first.

**Why:** Supabase's anti-enumeration protection returns a plausible-looking fake UUID. If stored, `auth.uid()` from a real signIn won't match → RLS blocks all data → blank dashboard.

## Email domain
Internal users use `username@igrejaapp.internal`.

## Derived password formula
`buildAuthPassword(profileId) = 'IA_' + profileId` — always 39 chars, never fails Supabase's 6-char minimum.
