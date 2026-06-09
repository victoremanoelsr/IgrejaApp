---
name: Supabase Auth Login Flow
description: Multi-step login fallback required due to anti-enumeration and mixed legacy/new users
---

## The Rule
The login function in `context.tsx` MUST try credentials in this exact order:

1. `login_profile` RPC — validates username+password against `profiles` table (SECURITY DEFINER, bypasses RLS). If returns empty → reject immediately.
2. `signInWithPassword(email, realPassword)` — for pre-migration users whose `auth.users` entry was created with their real password.
3. `ensure_auth_for_profile` RPC (optional, SECURITY DEFINER) — if the SQL function exists, creates/fixes the auth user server-side with derived password.
4. `signInWithPassword(email, derivedPassword)` — derived password = `IA_<profile_uuid>`.
5. If all above fail: `signUp` → `confirm_internal_user` RPC → `signInWithPassword(derived)` → `link_profile_to_auth`.

**Why:** Two user classes exist simultaneously:
- Pre-migration users: `auth.users` has their real password → step 2 works.
- New users: no auth user exists → steps 3–5 create one.

**Never** collapse to a single signIn step — it breaks one class or the other.

## Key RPCs (all SECURITY DEFINER)
- `login_profile(p_username, p_password)` — validates credentials, returns profile row
- `confirm_internal_user(p_email)` — confirms email in auth.users for @igrejaapp.internal
- `link_profile_to_auth(p_username, p_auth_user_id)` — sets auth_user_id in profiles
- `ensure_auth_for_profile(p_profile_id)` — creates/fixes auth user + sets auth_user_id (optional, run SQL once to create)

## Anti-enumeration trap
`supabase.auth.signUp()` for an existing email returns a FAKE UUID (not the real auth user's UUID). Never store the UUID from signUp directly into `profiles.auth_user_id` without verifying via signIn first.

**Why:** Supabase's anti-enumeration protection returns a plausible-looking fake UUID. If stored, `auth.uid()` from a real signIn won't match → RLS blocks all data → blank dashboard.

## Email domain
Internal users use `username@igrejaapp.internal`. Old migration used `@igrejaapp.local` (still exists in auth.users, harmless).

## Derived password formula
`buildAuthPassword(profileId) = 'IA_' + profileId` — always 39 chars, never fails Supabase's 6-char minimum.
