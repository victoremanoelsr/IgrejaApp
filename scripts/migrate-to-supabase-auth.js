import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL_DOMAIN = 'igrejaapp.internal';

async function migrate() {
  console.log('=== MIGRAÇÃO PROFILES → SUPABASE AUTH ===');
  console.log('ATENÇÃO: Nenhum dado será deletado. Apenas adicionando auth_user_id.\n');

  // 1. Busca todos os profiles
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*');

  if (fetchError) {
    console.error('Erro ao buscar profiles:', fetchError.message);
    process.exit(1);
  }

  console.log(`Encontrados ${profiles.length} usuário(s) na tabela profiles.\n`);

  let criados = 0;
  let jaExistiam = 0;
  let erros = 0;
  const resultados = [];

  for (const profile of profiles) {
    const email = `${profile.username}@${EMAIL_DOMAIN}`;
    const password = profile.password;

    if (!profile.username || !password) {
      console.warn(`  [PULADO] ID ${profile.id} - username ou senha em branco.`);
      resultados.push({ id: profile.id, status: 'pulado', motivo: 'username ou senha vazia' });
      continue;
    }

    // Verifica se já foi migrado
    if (profile.auth_user_id) {
      console.log(`  [JÁ MIGRADO] ${profile.username} (auth_user_id: ${profile.auth_user_id})`);
      jaExistiam++;
      resultados.push({ id: profile.id, username: profile.username, status: 'ja_migrado' });
      continue;
    }

    // Tenta criar o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: profile.username,
        name: profile.name,
        role: profile.role,
        profile_id: profile.id,
      }
    });

    if (authError) {
      // Se o usuário já existe no auth, tenta buscá-lo pelo email
      if (authError.message?.toLowerCase().includes('already') || authError.code === 'email_exists') {
        console.warn(`  [JÁ EXISTE NO AUTH] ${profile.username} - buscando ID existente...`);
        const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const existing = listData?.users?.find(u => u.email === email);
        if (existing) {
          const { error: updErr } = await supabase
            .from('profiles')
            .update({ auth_user_id: existing.id })
            .eq('id', profile.id);
          if (!updErr) {
            console.log(`  [VINCULADO] ${profile.username} → auth_user_id: ${existing.id}`);
            jaExistiam++;
            resultados.push({ id: profile.id, username: profile.username, status: 'vinculado', authId: existing.id });
          }
        }
      } else {
        console.error(`  [ERRO] ${profile.username}: ${authError.message}`);
        erros++;
        resultados.push({ id: profile.id, username: profile.username, status: 'erro', motivo: authError.message });
      }
      continue;
    }

    const authUserId = authData.user.id;

    // Salva auth_user_id na tabela profiles (sem alterar nada mais)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ auth_user_id: authUserId })
      .eq('id', profile.id);

    if (updateError) {
      // A coluna auth_user_id ainda não existe — vamos criar via SQL e tentar de novo
      if (updateError.message?.includes('column') || updateError.code === 'PGRST204') {
        console.log('  Coluna auth_user_id não existe ainda. Execute o SQL abaixo no Supabase primeiro:\n');
        console.log('  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;');
        console.log('\nDepois rode este script novamente.\n');
        process.exit(2);
      }
      console.error(`  [ERRO UPDATE] ${profile.username}: ${updateError.message}`);
      erros++;
      resultados.push({ id: profile.id, username: profile.username, status: 'erro_update', motivo: updateError.message });
      continue;
    }

    console.log(`  [OK] ${profile.username} → auth_user_id: ${authUserId}`);
    criados++;
    resultados.push({ id: profile.id, username: profile.username, status: 'criado', authId: authUserId });
  }

  console.log('\n=== RESUMO ===');
  console.log(`✔ Criados:       ${criados}`);
  console.log(`✔ Já existiam:   ${jaExistiam}`);
  console.log(`✘ Erros:         ${erros}`);
  console.log(`Total profiles:  ${profiles.length}`);

  if (erros > 0) {
    console.log('\nUsuários com erro:');
    resultados.filter(r => r.status === 'erro' || r.status === 'erro_update').forEach(r => {
      console.log(`  - ${r.username}: ${r.motivo}`);
    });
  }

  console.log('\nMigração concluída. A tabela profiles NÃO foi alterada estruturalmente.');
}

migrate().catch(err => {
  console.error('Erro fatal na migração:', err);
  process.exit(1);
});
