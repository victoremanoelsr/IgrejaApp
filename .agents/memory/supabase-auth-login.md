---
name: Supabase Auth Login Flow
description: Fluxo final de 3 passos — senha derivada, depois signUp fallback. Senha real REMOVIDA após migração SQL que converteu todos os usuários.
---

## The Rule
A função `login` em `context.tsx` usa esta ordem:

1. `login_profile` RPC — valida username+password na tabela `profiles` (SECURITY DEFINER, bypassa RLS). Se retornar vazio → rejeita imediatamente.
2. `signInWithPassword(email, senhaDerivada)` — senha derivada = `IA_<profile_uuid>`. Funciona para todos os usuários após a migração SQL `ensure_auth_for_profile`.
3. Se step 2 falhar (usuário sem conta Auth): `signUp` → `confirm_internal_user` RPC → `signInWithPassword(derivada)` → `link_profile_to_auth`.

**Pré-requisito:** A SQL `ensure-auth-migration.sql` deve ter rodado no Supabase. Ela converte TODOS os auth.users para senha derivada e cria a função `ensure_auth_for_profile`. Sem ela, usuários pré-migração (que tinham senha real no Auth) não conseguem logar via step 2.

**LIÇÃO APRENDIDA (CRÍTICA):** Remover o step da senha real só é seguro APÓS a SQL de migração ter rodado para todos os perfis. Se removido antes, usuários pré-migração veem dashboard em branco (currentChurch=null) porque a sessão Auth não é estabelecida e o RLS bloqueia todos os dados. O sintoma é: sidebar carrega, conteúdo principal mostra "Selecione uma unidade no menu lateral."

## RPCs chave (todos SECURITY DEFINER)
- `login_profile(p_username, p_password)` — valida credenciais, retorna linha do profile
- `confirm_internal_user(p_email)` — confirma e-mail em auth.users para @igrejaapp.internal
- `link_profile_to_auth(p_username, p_auth_user_id)` — define auth_user_id em profiles
- `ensure_auth_for_profile(p_profile_id)` — cria/corrige usuário Auth com senha derivada; chamado em `addUser` apenas

## Armadilha anti-enumeração
`supabase.auth.signUp()` para e-mail existente retorna UUID FALSO. Nunca armazenar o UUID do signUp em `profiles.auth_user_id` sem verificar via signIn primeiro.

## Domínio de e-mail
Usuários internos usam `username@igrejaapp.internal`.

## Fórmula da senha derivada
`buildAuthPassword(profileId) = 'IA_' + profileId` — sempre 39 chars, nunca falha o mínimo de 6 chars do Supabase.
