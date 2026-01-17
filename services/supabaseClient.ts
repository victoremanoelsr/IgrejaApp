import { createClient } from '@supabase/supabase-js';

// URL e Chave fornecidas
const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});