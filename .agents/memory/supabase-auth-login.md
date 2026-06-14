---
name: Supabase Auth Login Flow
description: Fluxo de 4 passos — senha real primeiro, depois derivada, depois signUp. NUNCA remover o passo da senha real enquanto houver usuários pré-migração.
---

## The Rule
A função `login` em `context.tsx` usa esta ordem OBRIGATÓRIA:

1. `login_profile` RPC — valida username+password na tabela `profiles` (SECURITY DEFINER, bypassa RLS). Se retornar vazio → rejeita imediatamente.
2. `signInWithPassword(email, senhaReal)` — para usuários pré-migração com senha real no Auth. **NÃO REMOVER** — sem ele, SUPER_ADM e outros usuários antigos veem dashboard em branco.
3. `signInWithPassword(email, senhaDerivada)` — senha derivada = `IA_<profile_uuid>`. Para usuários criados pelo sistema.
4. `signUp` → `confirm_internal_user` RPC → `signInWithPassword(derivada)` → `link_profile_to_auth` — para usuários sem conta Auth.

## LIÇÃO CRÍTICA (não repetir este erro)
Remover o passo 2 (senha real) causou dashboard em branco para SUPER_ADM e usuários pré-migração:
- O login valida credenciais via `profiles` (passo 1) ✅
- Mas sem sessão Auth válida, RLS bloqueia TODOS os selects do banco
- Resultado: sidebar carrega (dados do profile já capturados), conteúdo vazio, "Selecione uma unidade no menu lateral."

A SQL `ensure-auth-migration.sql` (ensure_auth_for_profile para todos os profiles) NÃO garante migração completa do SUPER_ADM — a conta Auth dele pode ter sido criada por outro caminho e mantém senha real.

**REGRA:** Só é seguro remover o passo 2 quando CONFIRMADO que 100% dos usuários têm senha derivada no Auth. Isso requer consulta direta ao Supabase auth.users para verificar. Nunca assumir que a migração foi completa.

## Sobre o 400 no Network tab
O `400` em `auth/v1/token?grant_type=password` é esperado e inofensivo para usuários com senha derivada (passo 2 falha → cai no passo 3 que funciona). É uma entrada no Network tab do DevTools, não um erro de console que afeta o usuário.

## O 404 de ensure_auth_for_profile no login
Removido do fluxo de login. Só existe em `addUser`. O 404 no Vercel some após push do código atual.

## RPCs chave (todos SECURITY DEFINER)
- `login_profile(p_username, p_password)` — valida credenciais, retorna linha do profile
- `confirm_internal_user(p_email)` — confirma e-mail em auth.users para @igrejaapp.internal
- `link_profile_to_auth(p_username, p_auth_user_id)` — define auth_user_id em profiles
- `ensure_auth_for_profile(p_profile_id)` — cria/corrige usuário Auth com senha derivada; chamado em `addUser` apenas

## Domínio de e-mail
Usuários internos usam `username@igrejaapp.internal`.

## Fórmula da senha derivada
`buildAuthPassword(profileId) = 'IA_' + profileId` — sempre 39 chars.
