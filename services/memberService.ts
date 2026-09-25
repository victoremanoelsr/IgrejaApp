import { supabase } from './supabaseClient';
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

// Busca doações de campanhas registradas exatamente no nome do membro
// Usa RPC com SECURITY DEFINER para bypassar RLS (portal do membro usa chave anon)
export const getMemberCampaignContributions = async (
  churchId: string,
  memberName: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_member_campaign_contributions', {
    p_church_id: churchId,
    p_member_name: memberName,
  });

  if (error || !data) return [];
  const rows: any[] = Array.isArray(data) ? data : [];
  return rows.map(toAppTransaction);
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

export const getMemberCarnets = async (churchId: string, parentId?: string): Promise<CarnetTemplate[]> => {
  // Busca templates de carnês pelo churchId do membro ou da sede (parentId)
  const churchIds = [churchId];
  if (parentId && parentId !== churchId) churchIds.push(parentId);

  const { data, error } = await supabase
    .from('mission_carnet_templates')
    .select('*')
    .in('church_id', churchIds)
    .order('is_default', { ascending: false });

  if (!error && data && data.length > 0) {
    return data.map(toAppCarnetTemplate);
  }

  // 3. Fallback: se templates estiverem registrados na sede ou em outro church_id
  const { data: anyData } = await supabase
    .from('mission_carnet_templates')
    .select('*')
    .order('is_default', { ascending: false })
    .limit(10);

  if (anyData && anyData.length > 0) {
    return anyData.map(toAppCarnetTemplate);
  }

  return [];
};

export const getMemberLetterHistory = async (
  churchId: string,
  memberId: string,
  memberName?: string
): Promise<LetterHistory[]> => {
  // 1. Busca todos os documentos emitidos no nome do próprio membro (Recomendação, Mudança, Batismo, Apresentação)
  const { data: ownData } = await supabase
    .from('letter_history')
    .select('*')
    .eq('church_id', churchId)
    .eq('member_id', memberId)
    .order('issued_at', { ascending: false });

  const ownList = (ownData || []).map(toAppLetterHistory);
  const ownIds = new Set(ownList.map(l => l.id));

  // 2. Busca certificados de apresentação na igreja para verificar se o membro é pai ou mãe
  const { data: presentationData } = await supabase
    .from('letter_history')
    .select('*')
    .eq('church_id', churchId)
    .eq('letter_type', 'APRESENTACAO')
    .order('issued_at', { ascending: false });

  const clean = (s?: string) => (s || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const targetName = clean(memberName);

  const childPresentations: LetterHistory[] = [];
  if (presentationData) {
    for (const raw of presentationData) {
      if (ownIds.has(raw.id)) continue;
      const snap = raw.member_data_snapshot || {};
      const isFatherId = snap.fatherId && snap.fatherId === memberId;
      const isMotherId = snap.motherId && snap.motherId === memberId;
      const isFatherName = targetName && snap.fatherName && clean(snap.fatherName) === targetName;
      const isMotherName = targetName && snap.motherName && clean(snap.motherName) === targetName;

      if (isFatherId || isMotherId || isFatherName || isMotherName) {
        childPresentations.push(toAppLetterHistory(raw));
      }
    }
  }

  const all = [...ownList, ...childPresentations];
  all.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  return all;
};

export const getMemberCarnetHistory = async (
  churchId: string,
  memberId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('carnet_history')
    .select('*')
    .eq('church_id', churchId)
    .eq('member_id', memberId)
    .order('generated_at', { ascending: false });

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    churchId: r.church_id,
    memberId: r.member_id,
    category: r.category ?? 'MISSOES',
    // description shown in MemberCarnets.tsx
    description: `${r.template_name ? r.template_name + ' — ' : ''}Carnê ${r.year ?? ''}`.trim(),
    // date used for display
    date: r.generated_at ?? r.created_at ?? new Date().toISOString(),
    amount: r.amount ?? 0,
    type: 'ENTRADA' as const,
    paymentMethod: '',
    createdAt: r.generated_at,
  }));
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

export interface PublicTransaction {
  id: string;
  date: string;
  category: string;
  type: 'ENTRADA' | 'SAIDA';
  amount: number;
}

export const getPublicFinancialData = async (
  churchId: string,
  month: number,
  year: number
): Promise<PublicTransaction[]> => {
  // Uses SECURITY DEFINER RPC to bypass RLS — returns only public fields (no personal data)
  const { data, error } = await supabase.rpc('get_public_financial_data', {
    p_church_id: churchId,
    p_month: month,
    p_year: year,
  });

  if (error) {
    console.error('[getPublicFinancialData] RPC error:', error.message);
    return [];
  }
  if (!data) return [];

  return (data as any[]).map((row) => ({
    id: String(row.id),
    date: String(row.date),
    category: String(row.category),
    type: row.type as 'ENTRADA' | 'SAIDA',
    amount: parseFloat(String(row.amount)) || 0,
  }));
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
