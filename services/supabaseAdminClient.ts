import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_J7yMyoIsxG5xc8e40qmG2Q_yemLccPp';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
