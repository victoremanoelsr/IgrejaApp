import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Transaction, Event, CarnetTemplate } from '../types';
import {
  MemberSession,
  loginAsMember,
  getMemberContributions,
  getMemberCurrentMonthTithes,
  getMemberUpcomingEvents,
  getMemberCarnets,
  subscribeToMemberTransactions,
} from '../services/memberService';

const SESSION_KEY = 'member_session';

interface MemberContextType {
  session: MemberSession | null;
  contributions: Transaction[];
  currentMonthTithes: number;
  upcomingEvents: Event[];
  carnets: CarnetTemplate[];
  isLoading: boolean;
  login: (cpf: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  refreshContributions: () => Promise<void>;
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
  const [currentMonthTithes, setCurrentMonthTithes] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [carnets, setCarnets] = useState<CarnetTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const fetchMemberData = async (s: MemberSession) => {
    setIsLoading(true);
    try {
      const [contribs, tithes, events, carnetList] = await Promise.all([
        getMemberContributions(s.churchId, s.member.id),
        getMemberCurrentMonthTithes(s.churchId, s.member.id),
        getMemberUpcomingEvents(s.churchId),
        getMemberCarnets(s.churchId),
      ]);
      setContributions(contribs);
      setCurrentMonthTithes(tithes);
      setUpcomingEvents(events);
      setCarnets(carnetList);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtime = (s: MemberSession) => {
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
    });
  };

  useEffect(() => {
    if (session) {
      fetchMemberData(session);
      setupRealtime(session);
    }
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  const login = async (cpf: string, password: string) => {
    setIsLoading(true);
    const result = await loginAsMember(cpf, password);
    setIsLoading(false);

    if (result.error || !result.session) {
      return { error: result.error || 'Erro ao entrar.' };
    }

    saveSession(result.session);
    setSession(result.session);
    await fetchMemberData(result.session);
    setupRealtime(result.session);
    return {};
  };

  const logout = () => {
    channelRef.current?.unsubscribe();
    saveSession(null);
    setSession(null);
    setContributions([]);
    setCurrentMonthTithes(0);
    setUpcomingEvents([]);
    setCarnets([]);
  };

  const refreshContributions = async () => {
    if (!session) return;
    const [contribs, tithes] = await Promise.all([
      getMemberContributions(session.churchId, session.member.id),
      getMemberCurrentMonthTithes(session.churchId, session.member.id),
    ]);
    setContributions(contribs);
    setCurrentMonthTithes(tithes);
  };

  return (
    <MemberContext.Provider
      value={{
        session,
        contributions,
        currentMonthTithes,
        upcomingEvents,
        carnets,
        isLoading,
        login,
        logout,
        refreshContributions,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
};
