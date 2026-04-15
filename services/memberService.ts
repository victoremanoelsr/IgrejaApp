import { supabase } from './supabaseClient';
import { Member, Transaction, Event, CarnetTemplate } from '../types';
import { toAppMember, toAppTransaction, toAppEvent, toAppCarnetTemplate } from './dataMappers';

export interface MemberChurchInfo {
  id: string;
  name: string;
  active: boolean;
  pixKey?: string;
  logoUrl?: string;
  pastorName?: string;
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

const formatBirthDateAsPassword = (birthDate: string): string => {
  if (!birthDate) return '';
  const parts = birthDate.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  return `${day}${month}${year}`;
};

export const loginAsMember = async (cpf: string, password: string): Promise<MemberLoginResult> => {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (!cleanCpf || cleanCpf.length < 11) {
    return { error: 'CPF inválido. Digite apenas os 11 números.' };
  }

  const { data: memberData, error } = await supabase
    .from('members')
    .select('*')
    .eq('cpf', cleanCpf)
    .single();

  if (error || !memberData) {
    return { error: 'Membro não encontrado. Verifique seu CPF.' };
  }

  const birthDatePassword = formatBirthDateAsPassword(memberData.birth_date || '');
  const customPassword = memberData.member_password || null;
  const isFirstAccess = !customPassword || customPassword === birthDatePassword;

  const passwordMatches =
    password === birthDatePassword ||
    (customPassword && password === customPassword);

  if (!passwordMatches) {
    return { error: 'Senha incorreta. Use sua data de nascimento no formato DDMMAAAA.' };
  }

  const { data: churchData } = await supabase
    .from('churches')
    .select('id, name, active, pix_key, logo_url, pastor_name')
    .eq('id', memberData.church_id)
    .single();

  const member = toAppMember(memberData);

  return {
    session: {
      member,
      churchId: memberData.church_id,
      church: {
        id: churchData?.id || memberData.church_id,
        name: churchData?.name || '',
        active: churchData?.active ?? true,
        pixKey: churchData?.pix_key || undefined,
        logoUrl: churchData?.logo_url || undefined,
        pastorName: churchData?.pastor_name || undefined,
      },
      isFirstAccess,
    },
  };
};

export const getMemberData = async (churchId: string, cpf: string) => {
  const { data: memberData } = await supabase
    .from('members')
    .select('*')
    .eq('church_id', churchId)
    .eq('cpf', cpf)
    .single();

  const { data: churchData } = await supabase
    .from('churches')
    .select('id, name, active, pix_key, logo_url, pastor_name')
    .eq('id', churchId)
    .single();

  return {
    member: memberData ? toAppMember(memberData) : null,
    church: churchData as MemberChurchInfo | null,
  };
};

export const getMemberContributions = async (
  churchId: string,
  memberId: string,
  limit?: number
): Promise<Transaction[]> => {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('church_id', churchId)
    .eq('member_id', memberId)
    .in('category', ['DIZIMO', 'OFERTA'])
    .order('date', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data || []).map(toAppTransaction);
};

export const getMemberCurrentMonthTithes = async (
  churchId: string,
  memberId: string
): Promise<number> => {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const { data } = await supabase
    .from('transactions')
    .select('amount')
    .eq('church_id', churchId)
    .eq('member_id', memberId)
    .eq('category', 'DIZIMO')
    .gte('date', firstDay)
    .lte('date', lastDay);

  return (data || []).reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
};

export const getMemberUpcomingEvents = async (churchId: string): Promise<Event[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('church_id', churchId)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(3);

  return (data || []).map(toAppEvent);
};

export const getMemberCarnets = async (churchId: string): Promise<CarnetTemplate[]> => {
  const { data } = await supabase
    .from('carnet_templates')
    .select('*')
    .eq('church_id', churchId);

  return (data || []).map(toAppCarnetTemplate);
};

export const updateMemberPassword = async (
  memberId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const { error } = await supabase
    .from('members')
    .update({ member_password: newPassword })
    .eq('id', memberId);

  if (error) return { success: false, error: error.message };
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
