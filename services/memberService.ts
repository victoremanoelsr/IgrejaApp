import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdminClient';
import { Member, Transaction, Event, CarnetTemplate, LetterHistory } from '../types';
import { toAppMember, toAppTransaction, toAppEvent, toAppCarnetTemplate, toAppLetterHistory } from './dataMappers';

export interface MemberChurchInfo {
  id: string;
  name: string;
  active: boolean;
  pixKey?: string;
  logoUrl?: string;
  pastorName?: string;
  sedePastorPhone?: string;
  sedePastorName?: string;
}

export interface MemberSession {
  member: Member;
  churchId: string;
  church: MemberChurchInfo;
  isFirstAccess: boolean;
}

export interface MemberLoginResult {
  session?: MemberSession;
  error?: string;
}

export const loginAsMember = async (identifier: string, password: string): Promise<MemberLoginResult> => {
  const { data, error } = await supabase.rpc('member_login', {
    p_identifier: identifier,
    p_password: password,
  });

  if (error) return { error: 'Erro ao realizar login. Tente novamente.' };

  if (data?.error) return { error: data.error };

  if (!data?.member) return { error: 'Usuário não encontrado.' };

  const memberRaw = data.member;
  const churchRaw = data.church;

  return {
    session: {
      member: toAppMember(memberRaw),
      churchId: memberRaw.church_id,
      church: {
        id: churchRaw?.id || memberRaw.church_id,
        name: churchRaw?.name || '',
        active: churchRaw?.active ?? true,
        pixKey: churchRaw?.pix_key || undefined,
        logoUrl: churchRaw?.logo_url || undefined,
        pastorName: churchRaw?.pastor_name || undefined,
        sedePastorPhone: data.sede_pastor_phone || undefined,
        sedePastorName: data.sede_pastor_name || undefined,
      },
      isFirstAccess: data.is_first_access ?? true,
    },
  };
};

export const getMemberData = async (churchId: string, cpf: string) => {
  const result = await loginAsMember(cpf, '');
  if (result.session) {
    return {
      member: result.session.member,
      church: result.session.church,
    };
  }
  return { member: null, church: null };
};

export const getMemberContributions = async (
  churchId: string,
  memberId: string,
  limit?: number
): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_member_contributions', {
    p_church_id: churchId,
    p_member_id: memberId,
  });

  if (error || !data) return [];

  const rows: any[] = Array.isArray(data) ? data : [];
  const mapped = rows.map(toAppTransaction);
  return limit ? mapped.slice(0, limit) : mapped;
};

export const getMemberCurrentMonthTithes = async (
  churchId: string,
  memberId: string
): Promise<number> => {
  const { data, error } = await supabase.rpc('get_member_tithes_month', {
    p_church_id: churchId,
    p_member_id: memberId,
  });

  if (error || data === null || data === undefined) return 0;
  return parseFloat(String(data)) || 0;
};

export const getMemberUpcomingEvents = async (churchId: string): Promise<Event[]> => {
  const { data, error } = await supabase.rpc('get_member_events', {
    p_church_id: churchId,
  });

  if (error || !data) return [];

  const rows: any[] = Array.isArray(data) ? data : [];
  return rows.map(toAppEvent);
};

export const getMemberCarnets = async (churchId: string): Promise<CarnetTemplate[]> => {
  const { data, error } = await supabase
    .from('mission_carnet_templates')
    .select('*')
    .eq('church_id', churchId);

  if (error || !data) return [];
  return data.map(toAppCarnetTemplate);
};

const SUPABASE_URL = 'https://tywgekdisyxflcfjwaou.supabase.co';
const SERVICE_KEY = 'sb_secret_J7yMyoIsxG5xc8e40qmG2Q_yemLccPp';

export const getMemberLetterHistory = async (
  churchId: string,
  memberId: string
): Promise<LetterHistory[]> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/letter_history?church_id=eq.${encodeURIComponent(churchId)}&member_id=eq.${encodeURIComponent(memberId)}&order=issued_at.desc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error('[getMemberLetterHistory] HTTP error:', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    console.log('[getMemberLetterHistory] found:', data?.length, 'records');
    if (!Array.isArray(data)) return [];
    return data.map(toAppLetterHistory);
  } catch (e) {
    console.error('[getMemberLetterHistory] fetch error:', e);
    return [];
  }
};

export const getMemberCarnetHistory = async (
  churchId: string,
  memberId: string
): Promise<Transaction[]> => {
  try {
    const url = `${SUPABASE_URL}/rest/v1/transactions?church_id=eq.${encodeURIComponent(churchId)}&member_id=eq.${encodeURIComponent(memberId)}&description=ilike.*CARNÊ*&order=date.desc`;
    const res = await fetch(url, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error('[getMemberCarnetHistory] HTTP error:', res.status);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(toAppTransaction);
  } catch (e) {
    console.error('[getMemberCarnetHistory] fetch error:', e);
    return [];
  }
};

export const updateMemberPassword = async (
  memberId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const { data, error } = await supabase.rpc('update_member_password', {
    p_member_id: memberId,
    p_password: newPassword,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
};

export const updateMemberUsername = async (
  memberId: string,
  newUsername: string
): Promise<{ success: boolean; error?: string }> => {
  const trimmed = newUsername.trim();
  if (!trimmed) return { success: false, error: 'O usuário não pode ser vazio.' };

  const { data, error } = await supabase.rpc('update_member_username', {
    p_member_id: memberId,
    p_username: trimmed,
  });

  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true };
};

export const subscribeToMemberTransactions = (
  churchId: string,
  memberId: string,
  callback: (transaction: Transaction) => void
) => {
  const channel = supabase
    .channel(`member-txn-${memberId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `church_id=eq.${churchId}`,
      },
      (payload) => {
        if (payload.new && payload.new.member_id === memberId) {
          callback(toAppTransaction(payload.new));
        }
      }
    )
    .subscribe();

  return channel;
};
