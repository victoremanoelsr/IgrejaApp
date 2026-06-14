---
name: Supabase Auth Login Flow
description: Fluxo de login com 4 passos — senha real (pré-migração), depois derivada, depois signUp fallback. NUNCA remover o passo da senha real.
---

## The Rule
A função `login` em `context.tsx` tenta credenciais nesta ordem exata:

1. `login_profile` RPC — valida username+password na tabela `profiles` (SECURITY DEFINER, bypassa RLS). Se retornar vazio → rejeita imediatamente.
2. `signInWithPassword(email, senhaReal)` — para usuários pré-migração cuja conta Auth foi criada com a senha real deles. **NUNCA remover este passo** — sem ele, usuários pré-migração ficam sem dados (currentChurch=null, dashboard em branco).
3. `signInWithPassword(email, senhaDerivada)` — senha derivada = `IA_<profile_uuid>`. Para usuários criados pelo sistema.
4. Se tudo falhar: `signUp` → `confirm_internal_user` RPC → `signInWithPassword(derivada)` → `link_profile_to_auth`.

**Por que existem dois tipos de usuário:**
- Pré-migração: conta Auth criada com senha real → passo 2 funciona
- Novos usuários: conta Auth criada com senha derivada por `ensure_auth_for_profile` → passo 3 funciona
- Usuários sem conta Auth: criados no passo 4

**LIÇÃO APRENDIDA:** Remover o passo 2 (senha real) quebra usuários pré-migração — eles logam (profiles valida), mas sem sessão Auth o RLS bloqueia tudo → dashboard em branco com "Selecione uma unidade no menu lateral". O `400` no network tab do passo 2 para usuários novos é cosmético e inofensivo — NÃO é motivo para remover o passo.

## RPCs chave (todos SECURITY DEFINER)
- `login_profile(p_username, p_password)` — valida credenciais, retorna linha do profile
- `confirm_internal_user(p_email)` — confirma e-mail em auth.users para @igrejaapp.internal
- `link_profile_to_auth(p_username, p_auth_user_id)` — define auth_user_id em profiles
- `ensure_auth_for_profile(p_profile_id)` — cria/corrige usuário Auth + define auth_user_id; chamado em `addUser` apenas, NÃO no fluxo de login

## Armadilha anti-enumeração
`supabase.auth.signUp()` para e-mail existente retorna UUID FALSO. Nunca armazenar o UUID do signUp diretamente em `profiles.auth_user_id` sem verificar via signIn primeiro.

## Domínio de e-mail
Usuários internos usam `username@igrejaapp.internal`.

## Fórmula da senha derivada
`buildAuthPassword(profileId) = 'IA_' + profileId` — sempre 39 chars, nunca falha o mínimo de 6 chars do Supabase.
