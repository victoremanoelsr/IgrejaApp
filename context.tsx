
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  User, Church, Member, Transaction, Campaign, Event, Minute, 
  FixedExpense, LetterHistory, BookletSettings, CarnetTemplate, LetterTemplate,
  PhysicalSpace, Asset, SystemSettings
} from './types';
import { 
  toAppUser, toAppChurch, toAppMember, toAppTransaction, 
  toAppCampaign, toAppEvent, toAppMinute, toAppFixedExpense, toAppLetterHistory, toAppCarnetTemplate, toAppLetterTemplate,
  toAppPhysicalSpace, toAppAsset
} from './services/dataMappers';
import {
  savePendingTransaction,
  getPendingTransactions,
  deletePendingTransaction,
  getPendingCount,
} from './utils/offlineDB';
import type { ToastType } from './components/Toast';
import { ToastContainer } from './components/Toast';

interface AppContextType {
  user: User | null;
  users: User[];
  churches: Church[];
  members: Member[];
  transactions: Transaction[];
  campaigns: Campaign[];
  events: Event[];
  minutes: Minute[];
  fixedExpenses: FixedExpense[];
  lettersHistory: LetterHistory[];
  availableChurches: Church[];
  currentChurch: Church | null;
  
  login: (u: string, p: string) => Promise<{user?: User, error?: string, blocked?: boolean}>;
  logout: () => void;
  recoverAccount: (name: string, cpf: string) => Promise<string | null>;
  updateUserCredentials: (id: string, username?: string, password?: string) => Promise<{success: boolean, error?: string}>;
  
  selectChurch: (id: string) => void;
  exitAdminView: () => void;
  
  addMember: (m: Member) => Promise<{success: boolean, error?: string}>;
  updateMember: (id: string, m: Member) => Promise<{success: boolean, error?: string}>;
  deleteMember: (id: string) => Promise<void>;
  uploadMemberPhoto: (file: File) => Promise<string | null>;
  
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (id: string, t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  uploadTransactionFile: (file: File) => Promise<string | null>;
  confirmTransactionPayment: (id: string) => Promise<void>;
  
  addFixedExpense: (f: FixedExpense) => Promise<string | undefined>;
  generateMonthlyFixedExpenses: (churchId: string, start: string, end: string) => Promise<void>;
  
  addChurch: (c: Church) => Promise<void>;
  updateChurch: (id: string, data: Partial<Church>) => Promise<{success: boolean, error?: string}>;
  deleteChurch: (id: string) => Promise<void>;
  uploadChurchLogo: (file: File) => Promise<string | null>;
  addCongregation: (c: Church) => Promise<string | null>;
  toggleChurchStatus: (id: string) => Promise<void>;
  
  addUser: (u: User) => Promise<{success: boolean, error?: string}>;
  updateUser: (id: string, u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  addCampaign: (c: Campaign) => Promise<void>;
  updateCampaign: (id: string, c: Campaign) => Promise<{success: boolean, error?: string}>;
  deleteCampaign: (id: string) => Promise<void>;
  
  addEvent: (e: Event) => Promise<void>;
  updateEvent: (id: string, e: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  uploadEventImage: (file: File) => Promise<string | null>;
  
  addMinute: (m: Minute) => Promise<void>;
  updateMinute: (id: string, m: Minute) => Promise<void>;
  deleteMinute: (id: string) => Promise<void>;
  uploadMinuteFile: (file: File) => Promise<string | null>;
  
  addLetterHistory: (h: LetterHistory) => Promise<void>;
  deleteLetterHistory: (id: string) => Promise<void>;
  
  // Legacy single setting
  getBookletSettings: (churchId: string) => Promise<BookletSettings | null>;
  saveBookletSettings: (settings: BookletSettings) => Promise<void>;
  
  // Carnet Template Logic
  getCarnetTemplates: (churchId: string) => Promise<CarnetTemplate[]>;
  addCarnetTemplate: (t: CarnetTemplate) => Promise<{success: boolean, error?: string}>;
  updateCarnetTemplate: (id: string, t: Partial<CarnetTemplate>) => Promise<{success: boolean, error?: string}>;
  deleteCarnetTemplate: (id: string) => Promise<void>;
  setDefaultTemplate: (id: string, churchId: string, category: string) => Promise<void>;
  
  // Letter Template Logic
  getLetterTemplates: (churchId: string) => Promise<LetterTemplate[]>;
  addLetterTemplate: (t: LetterTemplate) => Promise<{success: boolean, error?: string}>;
  updateLetterTemplate: (id: string, t: Partial<LetterTemplate>) => Promise<{success: boolean, error?: string}>;
  deleteLetterTemplate: (id: string) => Promise<void>;
  
  uploadBookletBackground: (file: File) => Promise<string | null>;

  // Infrastructure / Inventory
  physicalSpaces: PhysicalSpace[];
  assets: Asset[];
  addPhysicalSpace: (s: PhysicalSpace) => Promise<{success: boolean, error?: string}>;
  updatePhysicalSpace: (id: string, s: Partial<PhysicalSpace>) => Promise<{success: boolean, error?: string}>;
  deletePhysicalSpace: (id: string) => Promise<void>;
  uploadSpacePhoto: (file: File) => Promise<string | null>;
  addAsset: (a: Asset) => Promise<{success: boolean, error?: string}>;
  updateAsset: (id: string, a: Partial<Asset>) => Promise<{success: boolean, error?: string}>;
  deleteAsset: (id: string) => Promise<void>;
  uploadAssetPhoto: (file: File) => Promise<string | null>;
  isOnline: boolean;
  pendingOfflineCount: number;
  syncOfflineTransactions: () => Promise<void>;

  // SaaS master settings (sales WhatsApp, master PIX, support email)
  systemSettings: SystemSettings;
  saveSystemSettings: (s: SystemSettings) => Promise<{success: boolean, error?: string}>;
  // Confirma o pagamento manual da igreja (status off->on + nova next_billing_date)
  confirmChurchPayment: (churchId: string) => Promise<{success: boolean, error?: string, nextDueDate?: string}>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const cleanDate = (date: string | undefined) => {
  if (!date) return null;
  return date;
};

// Helper genérico para upload
const uploadFileToSupabase = async (file: File, bucket: string = 'documents'): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erro no upload:', uploadError);
            return null;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error('Erro inesperado no upload:', error);
        return null;
    }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [lettersHistory, setLettersHistory] = useState<LetterHistory[]>([]);
  const [currentChurch, setCurrentChurch] = useState<Church | null>(null);
  const [physicalSpaces, setPhysicalSpaces] = useState<PhysicalSpace[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const raw = localStorage.getItem('igrejaapp_system_settings');
      return raw ? JSON.parse(raw) as SystemSettings : {};
    } catch { return {}; }
  });

  interface ToastItem { id: string; message: string; type: ToastType; duration?: number; }
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: ToastType, duration?: number) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type, duration }]);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const isSyncing = useRef(false);
  const syncFnRef = useRef<() => Promise<void>>();

  useEffect(() => {
    getPendingCount().then(setPendingOfflineCount);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncFnRef.current?.();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial Load
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: userData } = await supabase.from('profiles').select('*');
    if(userData) setUsers(userData.map(toAppUser));

    const { data: churchData } = await supabase.from('churches').select('*');
    if(churchData) setChurches(churchData.map(toAppChurch));

    const { data: memberData } = await supabase.from('members').select('*');
    if(memberData) setMembers(memberData.map(toAppMember));

    const { data: transData } = await supabase.from('transactions').select('*');
    if(transData) setTransactions(transData.map(toAppTransaction));

    const { data: campData } = await supabase.from('campaigns').select('*');
    if(campData) setCampaigns(campData.map(toAppCampaign));

    const { data: evtData } = await supabase.from('events').select('*');
    if(evtData) setEvents(evtData.map(toAppEvent));

    const { data: minData } = await supabase.from('minutes').select('*');
    if(minData) setMinutes(minData.map(toAppMinute));

    const { data: fixData } = await supabase.from('fixed_expenses').select('*');
    if(fixData) setFixedExpenses(fixData.map(toAppFixedExpense));

    const { data: letData } = await supabase.from('letter_history').select('*');
    if(letData) setLettersHistory(letData.map(toAppLetterHistory));

    const { data: spacesData } = await supabase.from('physical_spaces').select('*').order('created_at', { ascending: true });
    if(spacesData) setPhysicalSpaces(spacesData.map(toAppPhysicalSpace));

    const { data: assetsData } = await supabase.from('inventory_assets').select('*').order('created_at', { ascending: true });
    if(assetsData) setAssets(assetsData.map(toAppAsset));

    // System settings (single-row table). Falha silenciosa se a tabela não existir.
    try {
      const { data: sysData } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
      if (sysData) {
        const next: SystemSettings = {
          salesPhone:    sysData.sales_phone     || undefined,
          masterPixKey:  sysData.master_pix_key  || undefined,
          supportEmail:  sysData.support_email   || undefined,
        };
        setSystemSettings(next);
        try { localStorage.setItem('igrejaapp_system_settings', JSON.stringify(next)); } catch {}
      }
    } catch (e) { /* tabela inexistente — usa cache local */ }
  };

  const saveSystemSettings = async (s: SystemSettings) => {
    const payload = {
      id: 1,
      sales_phone:    s.salesPhone     || null,
      master_pix_key: s.masterPixKey   || null,
      support_email:  s.supportEmail   || null,
      updated_at:     new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('system_settings').upsert(payload, { onConflict: 'id' });
      if (error && !/relation .* does not exist/i.test(error.message)) {
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      // tabela inexistente — segue salvando apenas localmente
    }
    setSystemSettings(s);
    try { localStorage.setItem('igrejaapp_system_settings', JSON.stringify(s)); } catch {}
    return { success: true };
  };

  const PLAN_MONTHS_INTERNAL: Record<string, number> = {
    mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12, isento: 0,
  };

  const confirmChurchPayment = async (churchId: string) => {
    const church = churches.find(c => c.id === churchId);
    if (!church) return { success: false, error: 'Igreja não encontrada' };

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const months = PLAN_MONTHS_INTERNAL[church.planType ?? 'mensal'] ?? 1;
    const dueDay = church.dueDay ?? 10;

    // Próximo vencimento: dueDay do próximo ciclo (baseado no dia de vencimento original, não na data de hoje)
    const nextDue = new Date(today.getFullYear(), today.getMonth() + months, dueDay);
    const nextDueStr = nextDue.toISOString().split('T')[0];

    const res = await updateChurch(churchId, {
      active: true,
      lastPaymentDate: todayStr,
      paymentPromiseDate: nextDueStr, // Mantém acesso liberado até o próximo vencimento
    });
    if (!res.success) return { success: false, error: res.error };
    return { success: true, nextDueDate: nextDueStr };
  };

  const isChurchBlocked = async (churchId: string, churchList: Church[]): Promise<boolean> => {
    let sede = churchList.find(c => c.id === churchId);
    if (sede && sede.type === 'CONGREGACAO' && sede.parentId) {
      sede = churchList.find(c => c.id === sede!.parentId);
    }
    if (!sede) return false;

    if (!sede.active) return true;

    if (sede.planType && sede.planType !== 'isento') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDay = sede.dueDay ?? 10;
      const gracePeriod = sede.gracePeriod ?? 5;
      const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay + gracePeriod);

      if (today > dueDate) {
        // Se há uma promessa/liberação ativa, não bloqueia
        const hasActivePromise = sede.paymentPromiseDate
          ? new Date(sede.paymentPromiseDate + 'T00:00:00') >= today
          : false;

        if (hasActivePromise) return false;

        // Se o último pagamento cobre o ciclo atual, não bloqueia
        if (sede.lastPaymentDate) {
          const months = PLAN_MONTHS_INTERNAL[sede.planType ?? 'mensal'] ?? 1;
          const lastPay = new Date(sede.lastPaymentDate + 'T00:00:00');
          const nextDueAfterPayment = new Date(
            lastPay.getFullYear(),
            lastPay.getMonth() + (months || 1),
            dueDay
          );
          nextDueAfterPayment.setHours(0, 0, 0, 0);
          if (today <= nextDueAfterPayment) return false;
        }

        await supabase.from('churches').update({ active: false }).eq('id', sede.id);
        setChurches(prev => prev.map(c => c.id === sede!.id ? { ...c, active: false } : c));
        return true;
      }
    }
    return false;
  };

  const EMAIL_DOMAIN = 'igrejaapp.internal';

  const login = async (u: string, p: string) => {
    let profileData: any = null;

    // 1. Tenta login via Supabase Auth (método novo, seguro)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: `${u}@${EMAIL_DOMAIN}`,
      password: p,
    });

    if (authData?.user) {
      // Busca o perfil vinculado ao auth_user_id
      const { data: pd } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();
      profileData = pd;
    }

    // 2. Fallback: login direto na tabela profiles (compatibilidade com usuários não migrados)
    if (!profileData) {
      const { data: pd } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .single();
      profileData = pd;

      // Se o auth falhou mas o perfil foi encontrado, garante logout do Supabase Auth
      if (profileData && authError) {
        await supabase.auth.signOut().catch(() => {});
      }
    }

    if (profileData) {
      const appUser = toAppUser(profileData);

      // Recarrega todos os dados agora que o usuário está autenticado
      // (essencial quando o RLS está ativo — dados anteriores podem estar vazios)
      await fetchData();

      if (appUser.role !== 'SUPER_ADM' && appUser.churchId) {
        // Usa a lista de igrejas recém-carregada
        const { data: freshChurches } = await supabase.from('churches').select('*');
        const churchList = freshChurches ? freshChurches.map(toAppChurch) : churches;
        const blocked = await isChurchBlocked(appUser.churchId, churchList);
        if (blocked) {
          await supabase.auth.signOut().catch(() => {});
          return { blocked: true };
        }
      }

      setUser(appUser);
      if (appUser.churchId) {
        const { data: freshChurches } = await supabase.from('churches').select('*');
        if (freshChurches) {
          const church = freshChurches.map(toAppChurch).find(c => c.id === appUser.churchId);
          if (church) setCurrentChurch(church);
        }
      }
      return { user: appUser };
    }

    return { error: 'Credenciais inválidas' };
  };

  const logout = () => {
    supabase.auth.signOut().catch(() => {});
    setUser(null);
    setCurrentChurch(null);
  };

  const recoverAccount = async (name: string, cpf: string): Promise<string | null> => {
    const digitsOnly = cpf.replace(/\D/g, '');

    // Chama RPC com SECURITY DEFINER — bypassa o RLS para usuários anônimos
    const { data, error } = await supabase.rpc('find_profile_for_recovery', {
      input_cpf: digitsOnly,
    });

    if (error) {
      console.error('[recoverAccount] erro RPC:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    // Verifica o nome de forma flexível — todas as palavras do input devem estar no nome do banco
    const inputWords = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
    const found = (data as any[]).find((u) => {
      const dbName = (u.name || '').trim().toUpperCase();
      return inputWords.every((w: string) => dbName.includes(w));
    });

    return found ? found.id : null;
  };

  const updateUserCredentials = async (id: string, username?: string, password?: string) => {
    const updates: any = {};
    if (username) updates.username = username;
    if (password) updates.password = password;

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (error) return { success: false, error: error.message };

    // Atualiza também no Supabase Auth (funciona para o usuário logado atualmente)
    try {
      const authUpdates: any = {};
      if (password) authUpdates.password = password;
      if (username) authUpdates.email = `${username}@${EMAIL_DOMAIN}`;
      if (Object.keys(authUpdates).length > 0) {
        await supabase.auth.updateUser(authUpdates);
      }
    } catch (_) { /* Ignora silenciosamente — profiles já foi atualizado */ }

    setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
    return { success: true };
  };

  const selectChurch = (id: string) => {
    const church = churches.find(c => c.id === id);
    if (church) setCurrentChurch(church);
  };

  const exitAdminView = () => {
    setCurrentChurch(null);
  };

  const availableChurches = React.useMemo(() => {
    if (!user) return [];
    if (user.role === 'SUPER_ADM') return churches;
    if (user.churchId) {
        const myChurch = churches.find(c => c.id === user.churchId);
        if (!myChurch) return [];
        if (myChurch.type === 'SEDE') {
            return churches.filter(c => c.id === myChurch.id || c.parentId === myChurch.id);
        }
        return [myChurch];
    }
    return [];
  }, [user, churches]);

  // --- CRUD IMPLEMENTATIONS ---

  const addMember = async (m: Member) => {
    const payload: any = {
      church_id: m.churchId,
      name: m.name,
      cpf: m.cpf,
      birth_date: cleanDate(m.birthDate),
      member_number: m.memberNumber,
      is_tither: m.isTither,
      is_youth: m.isYouth, 
      is_child: m.isChild,
      is_adolescent: m.isAdolescent,
      is_lady: m.isLady,
      baptism_date: cleanDate(m.baptismDate),
      photo_url: m.photo,
      email: m.email,
      phone: m.phone,
      marital_status: m.maritalStatus,
      status: m.status || 'ATIVO',
      address: m.address 
    };

    if (m.id && m.id.trim() !== '') {
        payload.id = m.id;
    }

    const { data, error } = await supabase.from('members').insert([payload]).select();

    if (!error && data) {
      setMembers([...members, toAppMember(data[0])]);
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const updateMember = async (id: string, m: Member) => {
    const { error } = await supabase.from('members').update({
      name: m.name,
      cpf: m.cpf,
      birth_date: cleanDate(m.birthDate),
      member_number: m.memberNumber,
      is_tither: m.isTither,
      is_youth: m.isYouth,
      is_child: m.isChild,
      is_adolescent: m.isAdolescent,
      is_lady: m.isLady,
      baptism_date: cleanDate(m.baptismDate),
      photo_url: m.photo,
      email: m.email,
      phone: m.phone,
      marital_status: m.maritalStatus,
      status: m.status,
      address: m.address
    }).eq('id', id);

    if (!error) {
      setMembers(members.map(mem => mem.id === id ? m : mem));
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const deleteMember = async (id: string) => {
    await supabase.from('members').delete().eq('id', id);
    setMembers(members.filter(m => m.id !== id));
  };

  const uploadMemberPhoto = async (file: File) => {
    return uploadFileToSupabase(file, 'images'); 
  };

  const addTransaction = async (t: Transaction) => {
    if (!navigator.onLine) {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await savePendingTransaction({
        tempId,
        transaction: t,
        operationType: 'add',
        createdAt: new Date().toISOString(),
      });
      const tempTransaction: Transaction = { ...t, id: tempId };
      setTransactions(prev => [tempTransaction, ...prev]);
      setPendingOfflineCount(c => c + 1);
      showToast('Você está offline. O lançamento foi salvo no dispositivo e será sincronizado em breve.', 'offline', 7000);
      return;
    }

    const payload: any = {
        church_id: t.churchId,
        type: t.type,
        category: t.category,
        amount: t.amount,
        date: t.date,
        description: t.description,
        member_id: t.memberId,
        responsible_user_id: t.responsibleUserId,
        campaign_id: t.campaignId,
        attachment_url: t.attachmentUrl,
        is_fixed: t.isFixed,
        fixed_expense_id: t.fixedExpenseId,
        status: t.status
    };

    if (t.id && t.id.trim() !== '') {
        payload.id = t.id;
    }

    const { data } = await supabase.from('transactions').insert([payload]).select();
    if(data) setTransactions(prev => [toAppTransaction(data[0]), ...prev]);
  };

  const syncOfflineTransactions = async () => {
    if (isSyncing.current) return;
    const pending = await getPendingTransactions();
    if (pending.length === 0) return;

    isSyncing.current = true;
    showToast(`Sincronizando ${pending.length} lançamento(s)...`, 'syncing');

    let synced = 0;
    for (const p of pending) {
      try {
        const t = p.transaction as Transaction;
        const payload: any = {
          church_id: t.churchId,
          type: t.type,
          category: t.category,
          amount: t.amount,
          date: t.date,
          description: t.description,
          member_id: t.memberId,
          responsible_user_id: t.responsibleUserId,
          campaign_id: t.campaignId,
          attachment_url: t.attachmentUrl,
          is_fixed: t.isFixed,
          fixed_expense_id: t.fixedExpenseId,
          status: t.status,
        };
        const { data } = await supabase.from('transactions').insert([payload]).select();
        if (data) {
          const realTx = toAppTransaction(data[0]);
          setTransactions(prev => prev.map(tx => tx.id === p.tempId ? realTx : tx));
          await deletePendingTransaction(p.tempId);
          synced++;
        }
      } catch (err) {
        console.error('Offline sync failed for', p.tempId, err);
      }
    }

    const remaining = await getPendingCount();
    setPendingOfflineCount(remaining);
    isSyncing.current = false;

    setToasts(prev => prev.filter(t => t.type !== 'syncing'));
    if (synced > 0) {
      showToast(`${synced} lançamento(s) sincronizados com sucesso!`, 'synced', 4000);
    }
  };

  syncFnRef.current = syncOfflineTransactions;

  const updateTransaction = async (id: string, t: Transaction) => {
    await supabase.from('transactions').update({
        type: t.type,
        category: t.category,
        amount: t.amount,
        date: t.date,
        description: t.description,
        member_id: t.memberId,
        attachment_url: t.attachmentUrl,
        is_fixed: t.isFixed,
        status: t.status
    }).eq('id', id);
    setTransactions(transactions.map(tr => tr.id === id ? t : tr));
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const uploadTransactionFile = async (file: File) => { return uploadFileToSupabase(file, 'documents'); };
  
  const confirmTransactionPayment = async (id: string) => {
      await updateTransaction(id, { ...transactions.find(t => t.id === id)!, status: 'PAGO' });
  };

  const addFixedExpense = async (f: FixedExpense) => {
      const { data } = await supabase.from('fixed_expenses').insert([{
          church_id: f.churchId,
          description: f.description,
          amount: f.amount,
          due_day: f.dueDay,
          category: f.category,
          auto_generate: f.autoGenerate,
          active: f.active
      }]).select();
      if(data) {
          const newFixed = toAppFixedExpense(data[0]);
          setFixedExpenses([...fixedExpenses, newFixed]);
          return newFixed.id;
      }
      return undefined;
  };

  const generateMonthlyFixedExpenses = async (churchId: string, start: string, end: string) => {
      // Logic to check and generate transactions from fixed expenses
  };

  const addChurch = async (c: Church) => {
      const payload: any = {
          name: c.name,
          address: c.address,
          pastor_name: c.pastorName,
          cnpj: c.cnpj,
          type: c.type,
          active: c.active,
          parent_id: c.parentId
      };
      
      if (c.id && c.id.trim() !== '') {
          payload.id = c.id;
      }

      const { data } = await supabase.from('churches').insert([payload]).select();
      if(data) setChurches([...churches, toAppChurch(data[0])]);
  };

  const updateChurch = async (id: string, d: Partial<Church>) => {
      const payload: any = {};
      if (d.name !== undefined) payload.name = d.name;
      if (d.address !== undefined) payload.address = d.address;
      if (d.pastorName !== undefined) payload.pastor_name = d.pastorName;
      if (d.cnpj !== undefined) payload.cnpj = d.cnpj;
      if (d.missionStatement !== undefined) payload.mission_statement = d.missionStatement;
      if (d.logoUrl !== undefined) payload.logo_url = d.logoUrl;
      if (d.active !== undefined) payload.active = d.active;
      if (d.planType !== undefined) payload.plan_type = d.planType;
      if (d.dueDay !== undefined) payload.due_day = d.dueDay;
      if (d.gracePeriod !== undefined) payload.grace_period = d.gracePeriod;
      if (d.paymentPromiseDate !== undefined) payload.payment_promise_date = d.paymentPromiseDate || null;
      if (d.pixKey !== undefined) payload.pix_key = d.pixKey;

      // New columns that may not exist yet in older DB schemas – handled separately
      const extendedPayload: any = {};
      if (d.planTier !== undefined) extendedPayload.plan_tier = d.planTier;
      if (d.lastPaymentDate !== undefined) extendedPayload.last_payment_date = d.lastPaymentDate || null;
      if (d.pastorPhone !== undefined) extendedPayload.pastor_phone = d.pastorPhone || null;

      const hasMain = Object.keys(payload).length > 0;
      const hasExt  = Object.keys(extendedPayload).length > 0;

      // Main update
      if (hasMain) {
          const { error } = await supabase.from('churches').update(payload).eq('id', id);
          if (error) return { success: false, error: error.message };
      }

      // Extended update (graceful – silently ignored if columns don't exist)
      if (hasExt) {
          await supabase.from('churches').update(extendedPayload).eq('id', id);
      }

      setChurches(churches.map(c => c.id === id ? { ...c, ...d } : c));
      if(currentChurch?.id === id) setCurrentChurch({ ...currentChurch, ...d });
      return { success: true };
  };

  const deleteChurch = async (id: string) => {
      await supabase.from('churches').delete().eq('id', id);
      setChurches(churches.filter(c => c.id !== id));
  };

  const uploadChurchLogo = async (file: File) => { return uploadFileToSupabase(file, 'images'); };
  
  const addCongregation = async (c: Church) => {
      const { data, error } = await supabase.from('churches').insert([{
          name: c.name,
          address: c.address,
          pastor_name: c.pastorName,
          type: 'CONGREGACAO',
          active: true,
          parent_id: c.parentId
      }]).select();
      if(data) {
          setChurches([...churches, toAppChurch(data[0])]);
          return data[0].id;
      }
      return null;
  };

  const toggleChurchStatus = async (id: string) => {
      const church = churches.find(c => c.id === id);
      if(church) {
          const nowActivating = !church.active;
          // When manually unblocking, grant 24h access via payment promise so the
          // automatic overdue check doesn't immediately re-block the church.
          const extraFields = nowActivating
              ? { paymentPromiseDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
              : {};
          await updateChurch(id, { active: nowActivating, ...extraFields });
      }
  };

  const addUser = async (u: User) => {
      const payload: any = {
          name: u.name,
          username: u.username,
          password: u.password,
          cpf: u.cpf,
          role: u.role,
          church_id: u.churchId
      };

      if (u.id && u.id.trim() !== '') {
          payload.id = u.id;
      }

      const { data, error } = await supabase.from('profiles').insert([payload]).select();
      if(data) {
          setUsers([...users, toAppUser(data[0])]);
          return { success: true };
      }
      return { success: false, error: error?.message };
  };

  const updateUser = async (id: string, u: User) => {
      await supabase.from('profiles').update({
          name: u.name,
          username: u.username,
          role: u.role,
          church_id: u.churchId
      }).eq('id', id);
      setUsers(users.map(us => us.id === id ? u : us));
  };

  const deleteUser = async (id: string) => {
      await supabase.from('profiles').delete().eq('id', id);
      setUsers(users.filter(u => u.id !== id));
  };

  const addCampaign = async (c: Campaign) => {
      const payload: any = {
          church_id: c.churchId,
          name: c.name,
          goal: c.goal,
          start_date: c.startDate,
          description: c.description,
          status: c.status
      };
      
      if (c.id && c.id.trim() !== '') {
          payload.id = c.id;
      }

      const { data } = await supabase.from('campaigns').insert([payload]).select();
      if(data) setCampaigns([...campaigns, toAppCampaign(data[0])]);
  };

  const updateCampaign = async (id: string, c: Campaign) => {
      const { error } = await supabase.from('campaigns').update({
          name: c.name,
          goal: c.goal,
          start_date: c.startDate,
          status: c.status
      }).eq('id', id);
      if(!error) {
          setCampaigns(campaigns.map(cp => cp.id === id ? c : cp));
          return { success: true };
      }
      return { success: false, error: error.message };
  };

  const deleteCampaign = async (id: string) => {
      await supabase.from('campaigns').delete().eq('id', id);
      setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const addEvent = async (e: Event) => {
      const payload: any = {
          church_id: e.churchId,
          name: e.name,
          date: e.date,
          time: e.time,
          location: e.location,
          responsible_name: e.responsibleName,
          image_url: e.imageUrl
      };

      if (e.id && e.id.trim() !== '') {
          payload.id = e.id;
      }

      const { data } = await supabase.from('events').insert([payload]).select();
      if(data) setEvents([...events, toAppEvent(data[0])]);
  };

  const updateEvent = async (id: string, e: Event) => {
      await supabase.from('events').update({
          name: e.name,
          date: e.date,
          time: e.time,
          location: e.location,
          responsible_name: e.responsibleName,
          image_url: e.imageUrl
      }).eq('id', id);
      setEvents(events.map(ev => ev.id === id ? e : ev));
  };

  const deleteEvent = async (id: string) => {
      await supabase.from('events').delete().eq('id', id);
      setEvents(events.filter(e => e.id !== id));
  };

  const uploadEventImage = async (file: File) => { return uploadFileToSupabase(file, 'images'); };

  const addMinute = async (m: Minute) => {
      const payload: any = {
          church_id: m.churchId,
          title: m.title,
          date: m.date,
          file_url: JSON.stringify(m.fileUrls)
      };

      if (m.id && m.id.trim() !== '') {
          payload.id = m.id;
      }

      const { data } = await supabase.from('minutes').insert([payload]).select();
      if(data) setMinutes([...minutes, toAppMinute(data[0])]);
  };

  const updateMinute = async (id: string, m: Minute) => {
      await supabase.from('minutes').update({
          title: m.title,
          date: m.date,
          file_url: JSON.stringify(m.fileUrls)
      }).eq('id', id);
      setMinutes(minutes.map(mn => mn.id === id ? m : mn));
  };

  const deleteMinute = async (id: string) => {
      await supabase.from('minutes').delete().eq('id', id);
      setMinutes(minutes.filter(m => m.id !== id));
  };

  const uploadMinuteFile = async (file: File) => { return uploadFileToSupabase(file, 'documents'); };

  const addLetterHistory = async (h: LetterHistory) => {
      const { data } = await supabase.from('letter_history').insert([{
          church_id: h.churchId,
          member_id: h.memberId,
          letter_type: h.letterType,
          issued_at: h.issuedAt,
          issued_by_user_id: h.issuedByUserId,
          member_data_snapshot: h.memberDataSnapshot
      }]).select();
      if(data) setLettersHistory([...lettersHistory, toAppLetterHistory(data[0])]);
  };

  const deleteLetterHistory = async (id: string) => {
      await supabase.from('letter_history').delete().eq('id', id);
      setLettersHistory(lettersHistory.filter(h => h.id !== id));
  };

  // --- CARNET TEMPLATE CRUD ---
  const getCarnetTemplates = async (churchId: string) => {
      const { data, error } = await supabase.from('mission_carnet_templates').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
      if (data) return data.map(toAppCarnetTemplate);
      return [];
  };

  const addCarnetTemplate = async (t: CarnetTemplate) => {
      const payload = {
          church_id: t.churchId,
          name: t.name,
          background_url: t.backgroundUrl,
          background_style: t.backgroundStyle, 
          layout_json: t.layoutJson,
          is_default: t.isDefault,
          category: t.category // SAVING CATEGORY
      };
      const { data, error } = await supabase.from('mission_carnet_templates').insert([payload]).select();
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const updateCarnetTemplate = async (id: string, t: Partial<CarnetTemplate>) => {
      const payload: any = {};
      if(t.name) payload.name = t.name;
      if(t.backgroundUrl !== undefined) payload.background_url = t.backgroundUrl;
      if(t.backgroundStyle) payload.background_style = t.backgroundStyle; 
      if(t.layoutJson) payload.layout_json = t.layoutJson;
      if(t.isDefault !== undefined) payload.is_default = t.isDefault;
      if(t.category) payload.category = t.category;

      const { error } = await supabase.from('mission_carnet_templates').update(payload).eq('id', id);
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const deleteCarnetTemplate = async (id: string) => {
      await supabase.from('mission_carnet_templates').delete().eq('id', id);
  };

  const setDefaultTemplate = async (id: string, churchId: string, category: string) => {
      // Unset default only for the specific category
      await supabase.from('mission_carnet_templates').update({ is_default: false }).eq('church_id', churchId).eq('category', category);
      await supabase.from('mission_carnet_templates').update({ is_default: true }).eq('id', id);
  };

  // --- LETTER TEMPLATE CRUD ---
  const getLetterTemplates = async (churchId: string) => {
      const { data } = await supabase.from('letter_templates').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
      if (data) return data.map(toAppLetterTemplate);
      return [];
  };

  const addLetterTemplate = async (t: LetterTemplate) => {
      const payload = {
          church_id: t.churchId,
          name: t.name,
          type: t.type,
          background_url: t.backgroundUrl,
          recommendation_text: t.recommendationText,
          change_text: t.changeText,
          layout_json: t.layoutJson
      };
      const { data, error } = await supabase.from('letter_templates').insert([payload]).select();
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const updateLetterTemplate = async (id: string, t: Partial<LetterTemplate>) => {
      const payload: any = {};
      if(t.name) payload.name = t.name;
      if(t.type) payload.type = t.type;
      if(t.backgroundUrl !== undefined) payload.background_url = t.backgroundUrl;
      if(t.recommendationText !== undefined) payload.recommendation_text = t.recommendationText;
      if(t.changeText !== undefined) payload.change_text = t.changeText;
      if(t.layoutJson) payload.layout_json = t.layoutJson;

      const { error } = await supabase.from('letter_templates').update(payload).eq('id', id);
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const deleteLetterTemplate = async (id: string) => {
      await supabase.from('letter_templates').delete().eq('id', id);
  };

  const getBookletSettings = async (churchId: string) => {
      return null;
  };

  const saveBookletSettings = async (settings: BookletSettings) => {
  };

  const uploadBookletBackground = async (file: File) => { 
      return uploadFileToSupabase(file, 'images'); 
  };

  // --- INFRASTRUCTURE / INVENTORY CRUD ---
  const addPhysicalSpace = async (s: PhysicalSpace) => {
    const payload: any = {
      church_id: s.churchId,
      name: s.name,
      category: s.category,
      area_sqm: s.areaSqm ?? null,
      capacity: s.capacity ?? null,
      details: s.details ?? {},
      image_url: s.imageUrl ?? null
    };
    if (s.id && s.id.trim() !== '') payload.id = s.id;
    const { data, error } = await supabase.from('physical_spaces').insert([payload]).select();
    if (!error && data) {
      setPhysicalSpaces(prev => [...prev, toAppPhysicalSpace(data[0])]);
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const updatePhysicalSpace = async (id: string, s: Partial<PhysicalSpace>) => {
    const payload: any = {};
    if (s.name !== undefined) payload.name = s.name;
    if (s.category !== undefined) payload.category = s.category;
    if (s.areaSqm !== undefined) payload.area_sqm = s.areaSqm;
    if (s.capacity !== undefined) payload.capacity = s.capacity;
    if (s.details !== undefined) payload.details = s.details;
    if (s.imageUrl !== undefined) payload.image_url = s.imageUrl;
    const { error } = await supabase.from('physical_spaces').update(payload).eq('id', id);
    if (!error) {
      setPhysicalSpaces(prev => prev.map(sp => sp.id === id ? { ...sp, ...s } : sp));
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const deletePhysicalSpace = async (id: string) => {
    await supabase.from('physical_spaces').delete().eq('id', id);
    setPhysicalSpaces(prev => prev.filter(sp => sp.id !== id));
    setAssets(prev => prev.filter(a => a.spaceId !== id));
  };

  const uploadSpacePhoto = async (file: File) => {
    return uploadFileToSupabase(file, 'assets-photos');
  };

  const addAsset = async (a: Asset) => {
    const payload: any = {
      space_id: a.spaceId,
      name: a.name,
      quantity: a.quantity,
      category: a.category,
      status: a.status,
      image_url: a.imageUrl ?? null
    };
    if (a.id && a.id.trim() !== '') payload.id = a.id;
    const { data, error } = await supabase.from('inventory_assets').insert([payload]).select();
    if (!error && data) {
      setAssets(prev => [...prev, toAppAsset(data[0])]);
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const updateAsset = async (id: string, a: Partial<Asset>) => {
    const payload: any = {};
    if (a.name !== undefined) payload.name = a.name;
    if (a.quantity !== undefined) payload.quantity = a.quantity;
    if (a.category !== undefined) payload.category = a.category;
    if (a.status !== undefined) payload.status = a.status;
    if (a.imageUrl !== undefined) payload.image_url = a.imageUrl;
    const { error } = await supabase.from('inventory_assets').update(payload).eq('id', id);
    if (!error) {
      setAssets(prev => prev.map(as => as.id === id ? { ...as, ...a } : as));
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const deleteAsset = async (id: string) => {
    await supabase.from('inventory_assets').delete().eq('id', id);
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const uploadAssetPhoto = async (file: File) => {
    return uploadFileToSupabase(file, 'assets-photos');
  };

  const value = {
    user, users, churches, members, transactions, campaigns, events, minutes, fixedExpenses, lettersHistory, availableChurches, currentChurch,
    login, logout, recoverAccount, updateUserCredentials, selectChurch, exitAdminView,
    addMember, updateMember, deleteMember, uploadMemberPhoto,
    addTransaction, updateTransaction, deleteTransaction, uploadTransactionFile, confirmTransactionPayment,
    addFixedExpense, generateMonthlyFixedExpenses,
    addChurch, updateChurch, deleteChurch, uploadChurchLogo, addCongregation, toggleChurchStatus,
    addUser, updateUser, deleteUser,
    addCampaign, updateCampaign, deleteCampaign,
    addEvent, updateEvent, deleteEvent, uploadEventImage,
    addMinute, updateMinute, deleteMinute, uploadMinuteFile,
    addLetterHistory, deleteLetterHistory, getBookletSettings, saveBookletSettings, uploadBookletBackground,
    // New Exports
    getCarnetTemplates, addCarnetTemplate, updateCarnetTemplate, deleteCarnetTemplate, setDefaultTemplate,
    getLetterTemplates, addLetterTemplate, updateLetterTemplate, deleteLetterTemplate,
    // Infrastructure
    physicalSpaces, assets,
    addPhysicalSpace, updatePhysicalSpace, deletePhysicalSpace, uploadSpacePhoto,
    addAsset, updateAsset, deleteAsset, uploadAssetPhoto,
    isOnline,
    pendingOfflineCount,
    syncOfflineTransactions,
    systemSettings,
    saveSystemSettings,
    confirmChurchPayment,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
