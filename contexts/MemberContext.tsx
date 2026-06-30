import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Transaction, Event, CarnetTemplate, LetterHistory } from '../types';
import {
  MemberSession,
  loginAsMember,
  getMemberContributions,
  getMemberCampaignContributions,
  getMemberCurrentMonthTithes,
  getMemberUpcomingEvents,
  getMemberCarnets,
  getMemberLetterHistory,
  getMemberCarnetHistory,
  subscribeToMemberTransactions,
} from '../services/memberService';
import { supabase } from '../services/supabaseClient';

const SESSION_KEY = 'member_session';

interface MemberContextType {
  session: MemberSession | null;
  contributions: Transaction[];
  campaignContributions: Transaction[];
  currentMonthTithes: number;
  upcomingEvents: Event[];
  carnets: CarnetTemplate[];
  letterHistory: LetterHistory[];
  carnetHistory: Transaction[];
  isLoading: boolean;
  isLoadingLetters: boolean;
  login: (cpf: string, password: string) => Promise<{ error?: string; blocked?: boolean }>;
  logout: () => void;
  refreshContributions: () => Promise<void>;
  refreshLetterHistory: () => Promise<void>;
  refreshCarnetHistory: () => Promise<void>;
  updateMemberPhoto: (file: File) => Promise<{ success: boolean; error?: string }>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const useMember = () => {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used within MemberProvider');
  return ctx;
};

const loadSession = (): MemberSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (session: MemberSession | null) => {
  if (session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
};

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<MemberSession | null>(loadSession);
  const [contributions, setContributions] = useState<Transaction[]>([]);
  const [campaignContributions, setCampaignContributions] = useState<Transaction[]>([]);
  const [currentMonthTithes, setCurrentMonthTithes] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [carnets, setCarnets] = useState<CarnetTemplate[]>([]);
  const [letterHistory, setLetterHistory] = useState<LetterHistory[]>([]);
  const [carnetHistory, setCarnetHistory] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLetters, setIsLoadingLetters] = useState(!!loadSession());
  const channelRef = useRef<any>(null);
  const letterChannelRef = useRef<any>(null);
  const sessionRef = useRef<MemberSession | null>(loadSession());


  const fetchMemberData = async (s: MemberSession) => {
    setIsLoading(true);
    try {
      const [contribs, campaignContribs, tithes, events, carnetList] = await Promise.all([
        getMemberContributions(s.churchId, s.member.id),
        getMemberCampaignContributions(s.churchId, s.member.name),
        getMemberCurrentMonthTithes(s.churchId, s.member.id),
        getMemberUpcomingEvents(s.churchId),
        getMemberCarnets(s.churchId),
      ]);
      setContributions(contribs);
      setCampaignContributions(campaignContribs);
      setCurrentMonthTithes(tithes);
      setUpcomingEvents(events);
      setCarnets(carnetList);
    } finally {
      setIsLoading(false);
    }

    // Fetch letter and carnet history independently so errors don't block other data
    setIsLoadingLetters(true);
    try {
      const [letHistory, carHistory] = await Promise.all([
        getMemberLetterHistory(s.churchId, s.member.id),
        getMemberCarnetHistory(s.churchId, s.member.id),
      ]);
      console.log('[fetchMemberData] letterHistory count:', letHistory.length, 'carnetHistory count:', carHistory.length);
      setLetterHistory(letHistory);
      setCarnetHistory(carHistory);
    } catch (e) {
      console.error('[fetchMemberData] letters/carnets error:', e);
    } finally {
      setIsLoadingLetters(false);
    }
  };

  const refreshLetterHistory = async () => {
    const s = sessionRef.current;
    if (!s) return;
    const data = await getMemberLetterHistory(s.churchId, s.member.id);
    setLetterHistory(data);
  };

  const refreshCarnetHistory = async () => {
    const s = sessionRef.current;
    if (!s) return;
    const data = await getMemberCarnetHistory(s.churchId, s.member.id);
    setCarnetHistory(data);
  };

  const setupRealtime = (s: MemberSession) => {
    sessionRef.current = s;

    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    channelRef.current = subscribeToMemberTransactions(s.churchId, s.member.id, (txn) => {
      if (txn.category === 'DIZIMO' || txn.category === 'OFERTA') {
        setContributions((prev) => [txn, ...prev]);
        if (txn.category === 'DIZIMO') {
          const now = new Date();
          const txnDate = new Date(txn.date);
          if (
            txnDate.getMonth() === now.getMonth() &&
            txnDate.getFullYear() === now.getFullYear()
          ) {
            setCurrentMonthTithes((prev) => prev + txn.amount);
          }
        }
      }
      if (txn.category === 'JOVENS' || txn.category === 'MISSOES') {
        if (txn.description?.toUpperCase().startsWith('CARNÊ')) {
          setCarnetHistory((prev) => [txn, ...prev]);
        }
      }
    });

    if (letterChannelRef.current) {
      letterChannelRef.current.unsubscribe();
    }
    // Use regular anon client for realtime; on INSERT refetch with service key to bypass RLS
    letterChannelRef.current = supabase
      .channel(`member-letters-${s.member.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'letter_history',
          filter: `church_id=eq.${s.churchId}`,
        },
        async () => {
          const data = await getMemberLetterHistory(s.churchId, s.member.id);
          setLetterHistory(data);
        }
      )
      .subscribe();
  };

  useEffect(() => {
    if (session) {
      fetchMemberData(session);
      setupRealtime(session);
    }
    return () => {
      channelRef.current?.unsubscribe();
      letterChannelRef.current?.unsubscribe();
    };
  }, []);

  const login = async (cpf: string, password: string) => {
    setIsLoading(true);
    const result = await loginAsMember(cpf, password);

    if (result.error || !result.session) {
      setIsLoading(false);
      return { error: result.error || 'Erro ao entrar.' };
    }

    // Check if the church (or its parent SEDE) is blocked
    try {
      const churchId = result.session.churchId;
      const { data: churchData } = await supabase
        .from('churches')
        .select('id, active, type, parent_id, plan_type, due_day, grace_period, payment_promise_date')
        .eq('id', churchId)
        .single();

      if (churchData) {
        let sedeData = churchData;

        if (churchData.type === 'CONGREGACAO' && churchData.parent_id) {
          const { data: parentData } = await supabase
            .from('churches')
            .select('id, active, plan_type, due_day, grace_period, payment_promise_date')
            .eq('id', churchData.parent_id)
            .single();
          if (parentData) sedeData = parentData;
        }

        let isBlocked = !sedeData.active;

        if (!isBlocked && sedeData.plan_type && sedeData.plan_type !== 'isento') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDay = sedeData.due_day ?? 10;
          const gracePeriod = sedeData.grace_period ?? 5;
          const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay + gracePeriod);

          if (today > dueDate) {
            const hasActivePromise = sedeData.payment_promise_date
              ? new Date(sedeData.payment_promise_date) >= today
              : false;

            if (!hasActivePromise) {
              await supabase.from('churches').update({ active: false }).eq('id', sedeData.id);
              isBlocked = true;
            }
          }
        }

        if (isBlocked) {
          setIsLoading(false);
          return { blocked: true };
        }
      }
    } catch (e) {
      console.error('Block check error:', e);
    }

    setIsLoading(false);
    saveSession(result.session);
    setSession(result.session);
    await fetchMemberData(result.session);
    setupRealtime(result.session);
    return {};
  };

  const logout = () => {
    channelRef.current?.unsubscribe();
    letterChannelRef.current?.unsubscribe();
    sessionRef.current = null;
    saveSession(null);
    setSession(null);
    setContributions([]);
    setCampaignContributions([]);
    setCurrentMonthTithes(0);
    setUpcomingEvents([]);
    setCarnets([]);
    setLetterHistory([]);
    setCarnetHistory([]);
    setIsLoadingLetters(false);
  };

  const refreshContributions = async () => {
    if (!session) return;
    const [contribs, campaignContribs, tithes] = await Promise.all([
      getMemberContributions(session.churchId, session.member.id),
      getMemberCampaignContributions(session.churchId, session.member.name),
      getMemberCurrentMonthTithes(session.churchId, session.member.id),
    ]);
    setContributions(contribs);
    setCampaignContributions(campaignContribs);
    setCurrentMonthTithes(tithes);
  };

  const updateMemberPhoto = async (file: File): Promise<{ success: boolean; error?: string }> => {
    if (!session) return { success: false, error: 'Sessão não encontrada.' };
    try {
      // 1. Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `member_${session.member.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { upsert: true });
      if (uploadError) return { success: false, error: uploadError.message };

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      const photoUrl = urlData.publicUrl;

      // 2. Update member record in DB via RPC (bypasses RLS for anon key)
      const { error: dbError } = await supabase.rpc('update_member_photo', {
        p_member_id: session.member.id,
        p_photo_url: photoUrl,
      });
      if (dbError) return { success: false, error: dbError.message };

      // 3. Update session in state + storage so photo shows immediately
      const updatedSession: MemberSession = {
        ...session,
        member: { ...session.member, photo: photoUrl },
      };
      saveSession(updatedSession);
      setSession(updatedSession);
      sessionRef.current = updatedSession;

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro desconhecido.' };
    }
  };

  return (
    <MemberContext.Provider
      value={{
        session,
        contributions,
        campaignContributions,
        currentMonthTithes,
        upcomingEvents,
        carnets,
        letterHistory,
        carnetHistory,
        isLoading,
        isLoadingLetters,
        login,
        logout,
        refreshContributions,
        refreshLetterHistory,
        refreshCarnetHistory,
        updateMemberPhoto,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
};
