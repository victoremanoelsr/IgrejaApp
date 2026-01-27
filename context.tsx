
// ... (imports remain the same as previous implementation)
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, Church, Member, Transaction, Campaign, Event, Minute, FixedExpense } from './types';
import { supabase } from './services/supabaseClient';
import { hashPassword, encryptData, decryptData } from './services/encryption';
import { 
  toAppChurch, toAppUser, toAppMember, toAppTransaction, 
  toAppCampaign, toAppEvent, toAppMinute, toAppFixedExpense 
} from './services/dataMappers';

interface LoginResult {
  user: User | null;
  error?: string;
}

interface AppContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<LoginResult>; 
  logout: () => void;
  users: User[];
  churches: Church[];
  members: Member[];
  transactions: Transaction[];
  fixedExpenses: FixedExpense[];
  campaigns: Campaign[];
  events: Event[];
  minutes: Minute[];
  currentChurch: Church | null;
  availableChurches: Church[];
  selectChurch: (churchId: string) => void;
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (id: string, t: Transaction) => Promise<void>; 
  deleteTransaction: (id: string) => Promise<void>;
  uploadTransactionFile: (file: File) => Promise<string | null>; 
  confirmTransactionPayment: (id: string) => Promise<void>;
  addFixedExpense: (fe: FixedExpense) => Promise<string | null>;
  updateFixedExpense: (id: string, fe: FixedExpense) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  generateMonthlyFixedExpenses: (churchId: string, startDateStr?: string, endDateStr?: string) => Promise<void>; 
  addMember: (m: Member) => Promise<{ success: boolean; error?: string }>;
  updateMember: (id: string, m: Member) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<void>;
  uploadMemberPhoto: (file: File) => Promise<string | null>;
  addEvent: (e: Event) => Promise<void>;
  updateEvent: (id: string, e: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  uploadEventImage: (file: File) => Promise<string | null>;
  addCampaign: (c: Campaign) => Promise<void>;
  updateCampaign: (id: string, c: Campaign) => Promise<{ success: boolean; error?: string }>; 
  deleteCampaign: (id: string) => Promise<void>;
  addMinute: (m: Minute) => Promise<void>;
  updateMinute: (id: string, m: Minute) => Promise<void>;
  deleteMinute: (id: string) => Promise<void>;
  uploadMinuteFile: (file: File) => Promise<string | null>; 
  addChurch: (c: Church) => Promise<void>;
  addCongregation: (c: Church) => Promise<string | null>;
  addUser: (u: User) => Promise<{ success: boolean; error?: string }>;
  updateUser: (id: string, u: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateChurch: (id: string, data: Partial<Church>) => Promise<{ success: boolean; error?: string }>;
  deleteChurch: (id: string) => Promise<void>;
  toggleChurchStatus: (id: string) => Promise<void>;
  recoverAccount: (name: string, cpf: string) => string | null;
  updateUserCredentials: (userId: string, newUsername?: string, newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  uploadChurchLogo: (file: File) => Promise<string | null>;
  enterAdminView: (churchId: string) => void;
  exitAdminView: () => void;
  adminViewChurchId: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Fix: Corrected variable naming in generateUUID fallback for clarity
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = (c === 'x' ? r : (r & 0x3 | 0x8));
    return v.toString(16);
  });
}

const cleanDate = (dateStr?: string) => (!dateStr || dateStr.trim() === '') ? null : dateStr;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [viewChurchId, setViewChurchId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);

  const refreshData = async () => {
    try {
      const { data: dChurches } = await supabase.from('churches').select('*');
      if (dChurches) setChurches(dChurches.map(toAppChurch));

      // 1. Usuários e CPFs
      const { data: dUsers } = await supabase.from('profiles').select('*');
      if (dUsers) {
          const processed = await Promise.all(dUsers.map(async (u) => {
              const appU = toAppUser(u);
              appU.cpf = await decryptData(u.cpf);
              return appU;
          }));
          setUsers(processed);
      }

      // 2. Membros e CPFs
      const { data: dMembers } = await supabase.from('members').select('*');
      if (dMembers) {
          const processed = await Promise.all(dMembers.map(async (m) => {
              const appM = toAppMember(m);
              appM.cpf = await decryptData(m.cpf);
              return appM;
          }));
          setMembers(processed);
      }

      // 3. Transações e VALORES
      const { data: dTrans } = await supabase.from('transactions').select('*');
      if (dTrans) {
          const processed = await Promise.all(dTrans.map(async (t) => {
              const appT = toAppTransaction(t);
              const dec = await decryptData(t.amount);
              appT.amount = parseFloat(dec) || 0;
              return appT;
          }));
          setTransactions(processed);
      }

      // 4. Despesas Fixas e VALORES
      const { data: dFixed } = await supabase.from('fixed_expenses').select('*');
      if (dFixed) {
          const processed = await Promise.all(dFixed.map(async (fe) => {
              const appFe = toAppFixedExpense(fe);
              const dec = await decryptData(fe.amount);
              appFe.amount = parseFloat(dec) || 0;
              return appFe;
          }));
          setFixedExpenses(processed);
      }

      // 5. Campanhas e METAS
      const { data: dCamps } = await supabase.from('campaigns').select('*');
      if (dCamps) {
          const processed = await Promise.all(dCamps.map(async (c) => {
              const appC = toAppCampaign(c);
              const dec = await decryptData(c.goal);
              appC.goal = parseFloat(dec) || 0;
              return appC;
          }));
          setCampaigns(processed);
      }

      const { data: dEvents } = await supabase.from('events').select('*');
      if (dEvents) setEvents(dEvents.map(toAppEvent));
      const { data: dMinutes } = await supabase.from('minutes').select('*');
      if (dMinutes) setMinutes(dMinutes.map(toAppMinute));
    } catch (error) { console.error("Erro ao carregar dados:", error); }
  };

  useEffect(() => { refreshData(); }, [user]);

  const addTransaction = async (t: Transaction) => {
    const encAmount = await encryptData(t.amount.toString());
    const payload: any = { 
        id: t.id || generateUUID(), church_id: t.churchId, type: t.type, 
        category: t.category, amount: encAmount, date: t.date, 
        description: t.description, member_id: t.memberId, 
        responsible_user_id: t.responsibleUserId, campaign_id: t.campaignId, 
        attachment_url: t.attachmentUrl, is_fixed: t.isFixed, status: t.status || 'PAGO' 
    };
    if (t.fixedExpenseId) payload.fixed_expense_id = t.fixedExpenseId;
    await supabase.from('transactions').insert([payload]);
    refreshData();
  };

  const updateTransaction = async (id: string, t: Transaction) => {
    const encAmount = await encryptData(t.amount.toString());
    const payload: any = { 
        type: t.type, category: t.category, amount: encAmount, 
        date: t.date, description: t.description, member_id: t.memberId, 
        attachment_url: t.attachmentUrl, campaign_id: t.campaignId, 
        is_fixed: t.isFixed, status: t.status 
    };
    await supabase.from('transactions').update(payload).eq('id', id);
    refreshData();
  };

  const addFixedExpense = async (fe: FixedExpense): Promise<string | null> => {
      const newId = generateUUID();
      const encAmount = await encryptData(fe.amount.toString());
      const { error } = await supabase.from('fixed_expenses').insert([{ 
          id: newId, church_id: fe.churchId, description: fe.description, 
          amount: encAmount, due_day: fe.dueDay, category: fe.category, 
          auto_generate: fe.auto_generate, active: fe.active 
      }]);
      if (!error) { refreshData(); return newId; }
      return null;
  };

  const updateFixedExpense = async (id: string, fe: FixedExpense) => {
      const encAmount = await encryptData(fe.amount.toString());
      await supabase.from('fixed_expenses').update({ 
          description: fe.description, amount: encAmount, due_day: fe.due_day, 
          category: fe.category, auto_generate: fe.auto_generate, active: fe.active 
      }).eq('id', id);
      refreshData();
  };

  const addCampaign = async (c: Campaign) => { 
      const encGoal = await encryptData(c.goal.toString());
      await supabase.from('campaigns').insert([{ 
          id: generateUUID(), church_id: c.churchId, name: c.name, 
          goal: encGoal, start_date: c.startDate, description: c.description, status: c.status 
      }]); 
      refreshData(); 
  };

  const updateCampaign = async (id: string, c: Campaign): Promise<{ success: boolean; error?: string }> => { 
      const encGoal = await encryptData(c.goal.toString());
      const { error } = await supabase.from('campaigns').update({ 
          name: c.name, goal: encGoal, start_date: c.startDate, 
          description: c.description, status: c.status 
      }).eq('id', id); 
      refreshData(); 
      return { success: !error, error: error?.message }; 
  };

  const generateMonthlyFixedExpenses = async (churchId: string, startDateStr?: string, endDateStr?: string) => {
      const myFixed = fixedExpenses.filter(fe => fe.churchId === churchId && fe.active && fe.autoGenerate);
      if (myFixed.length === 0) return;
      const today = new Date();
      const start = startDateStr ? new Date(startDateStr) : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDateStr ? new Date(endDateStr) : new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const inserts: any[] = [];
      const currentIter = new Date(start.getFullYear(), start.getMonth(), 1);
      const endIter = new Date(end.getFullYear(), end.getMonth(), 1);

      while (currentIter <= endIter) {
          const targetYear = currentIter.getFullYear();
          const targetMonth = currentIter.getMonth();
          for (const fe of myFixed) {
              const alreadyExists = transactions.some(t => {
                  if (t.fixedExpenseId !== fe.id) return false;
                  const tDate = new Date(t.date + 'T12:00:00');
                  return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
              });
              if (!alreadyExists) {
                  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
                  const dayToUse = Math.min(fe.dueDay, maxDays);
                  const newDate = new Date(targetYear, targetMonth, dayToUse).toISOString().split('T')[0];
                  const encAmount = await encryptData(fe.amount.toString());
                  inserts.push({
                      id: generateUUID(), church_id: fe.churchId, type: 'SAIDA', category: fe.category, amount: encAmount, date: newDate,
                      description: `${fe.description} (FIXO)`.toUpperCase(), responsible_user_id: user?.id || '', is_fixed: true, fixed_expense_id: fe.id, status: 'PENDENTE'
                  });
              }
          }
          currentIter.setMonth(currentIter.getMonth() + 1);
      }
      if (inserts.length > 0) { await supabase.from('transactions').insert(inserts); refreshData(); }
  };

  const login = async (username: string, password?: string): Promise<LoginResult> => {
    try {
      const hashedPass = await hashPassword(password || '');
      const { data, error } = await supabase.from('profiles').select('*').ilike('username', username).eq('password', hashedPass).maybeSingle();
      if (error) return { user: null, error: 'Erro ao tentar fazer login.' };
      if (data) {
        const appUser = toAppUser(data);
        appUser.cpf = await decryptData(data.cpf);
        setUser(appUser);
        if (appUser.role === 'SUPER_ADM') setViewChurchId(null);
        else if (appUser.churchId) setViewChurchId(appUser.churchId);
        refreshData();
        return { user: appUser };
      }
    } catch (e) { return { user: null, error: 'Erro de conexão.' }; }
    return { user: null, error: 'Usuário ou senha inválidos.' };
  };

  const addUser = async (u: User): Promise<{ success: boolean; error?: string }> => {
    const hashedPass = await hashPassword(u.password || '123456');
    const encCpf = await encryptData(u.cpf);
    const { error } = await supabase.from('profiles').insert([{ id: u.id || generateUUID(), name: u.name, username: u.username, password: hashedPass, cpf: encCpf, role: u.role, church_id: u.churchId || null }]);
    if (error) return { success: false, error: error.message };
    refreshData(); return { success: true };
  };

  const addMember = async (m: Member): Promise<{ success: boolean; error?: string }> => {
    const encCpf = await encryptData(m.cpf);
    const { error } = await supabase.from('members').insert([{ id: m.id || generateUUID(), church_id: m.churchId, name: m.name, cpf: encCpf, birth_date: cleanDate(m.birthDate), member_number: m.memberNumber, is_tither: m.isTither, baptism_date: cleanDate(m.baptismDate), address: m.address, photo_url: m.photo, email: m.email, phone: m.phone, marital_status: m.maritalStatus }]);
    if (error) return { success: false, error: error.message };
    refreshData(); return { success: true };
  };

  const availableChurches = useMemo(() => {
    if (!user) return [];
    if (user.role === 'SUPER_ADM') return churches;
    const myChurch = churches.find(c => c.id === user.churchId);
    if (!myChurch) return [];
    if ((user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE') && myChurch.type === 'SEDE') {
        return churches.filter(c => c.id === user.churchId || c.parentId === user.churchId);
    }
    return [myChurch];
  }, [user, churches]);

  const currentChurch = useMemo(() => viewChurchId ? (churches.find(c => c.id === viewChurchId) || null) : null, [viewChurchId, churches]);
  
  useEffect(() => { if (user && !viewChurchId && user.churchId && user.role !== 'SUPER_ADM') setViewChurchId(user.churchId); }, [user, viewChurchId]);
  
  const selectChurch = (id: string) => setViewChurchId(id);
  const logout = () => { setUser(null); setViewChurchId(null); };
  const enterAdminView = (id: string) => selectChurch(id);
  const exitAdminView = () => setViewChurchId(null);
  const deleteTransaction = async (id: string) => { await supabase.from('transactions').delete().eq('id', id); refreshData(); };
  const deleteMember = async (id: string) => { await supabase.from('members').delete().eq('id', id); refreshData(); };
  const deleteFixedExpense = async (id: string) => { await supabase.from('fixed_expenses').delete().eq('id', id); refreshData(); };
  const deleteCampaign = async (id: string) => { await supabase.from('campaigns').delete().eq('id', id); refreshData(); };
  
  const toggleChurchStatus = async (id: string) => { 
    const c = churches.find(ch => ch.id === id); 
    if (c) await supabase.from('churches').update({ active: !c.active }).eq('id', id); 
    refreshData(); 
  };
  
  const recoverAccount = (name: string, cpf: string) => { 
    const match = users.find(u => u.cpf === cpf && u.name.toLowerCase().includes(name.toLowerCase())); 
    return match?.id || null; 
  };
  
  const updateUserCredentials = async (id: string, user?: string, pass?: string) => { 
    const up: any = {}; 
    if (user) up.username = user; 
    if (pass) up.password = await hashPassword(pass); 
    const { error } = await supabase.from('profiles').update(up).eq('id', id); 
    refreshData(); return { success: !error, error: error?.message }; 
  };

  // Helper functions moved out of the value object to fix shorthand and duplicate property issues
  const uploadTransactionFile = async (f: File) => { 
    const p = `${Date.now()}.${f.name.split('.').pop()}`; 
    await supabase.storage.from('transaction-files').upload(p, f); 
    return supabase.storage.from('transaction-files').getPublicUrl(p).data.publicUrl; 
  };

  const confirmTransactionPayment = async (id: string) => { 
    await supabase.from('transactions').update({ status: 'PAGO' }).eq('id', id); 
    refreshData(); 
  };

  const updateMember = async (id: string, m: Member) => { 
    const up: any = { 
      name: m.name, birth_date: cleanDate(m.birthDate), member_number: m.memberNumber, 
      is_tither: m.isTither, baptism_date: cleanDate(m.baptismDate), address: m.address, 
      photo_url: m.photo, email: m.email, phone: m.phone, marital_status: m.maritalStatus 
    };
    if (m.cpf) up.cpf = await encryptData(m.cpf);
    const { error } = await supabase.from('members').update(up).eq('id', id);
    refreshData(); return { success: !error, error: error?.message }; 
  };

  const uploadMemberPhoto = async (f: File) => { 
    const p = `${Date.now()}.${f.name.split('.').pop()}`; 
    await supabase.storage.from('member-photos').upload(p, f); 
    return supabase.storage.from('member-photos').getPublicUrl(p).data.publicUrl; 
  };

  const addEvent = async (e: Event) => { 
    await supabase.from('events').insert([{ ...e, id: generateUUID() }]); 
    refreshData(); 
  };

  const updateEvent = async (id: string, e: Event) => { 
    await supabase.from('events').update(e).eq('id', id); 
    refreshData(); 
  };

  const deleteEvent = async (id: string) => { 
    await supabase.from('events').delete().eq('id', id); 
    refreshData(); 
  };

  const uploadEventImage = async (f: File) => { 
    const p = `${Date.now()}.${f.name.split('.').pop()}`; 
    await supabase.storage.from('event-images').upload(p, f); 
    return supabase.storage.from('event-images').getPublicUrl(p).data.publicUrl; 
  };

  const addMinute = async (m: Minute) => { 
    await supabase.from('minutes').insert([{ ...m, id: generateUUID(), file_url: JSON.stringify(m.fileUrls) }]); 
    refreshData(); 
  };

  const updateMinute = async (id: string, m: Minute) => { 
    await supabase.from('minutes').update({ ...m, file_url: JSON.stringify(m.fileUrls) }).eq('id', id); 
    refreshData(); 
  };

  const deleteMinute = async (id: string) => { 
    await supabase.from('minutes').delete().eq('id', id); 
    refreshData(); 
  };

  const uploadMinuteFile = async (f: File) => { 
    const p = `${Date.now()}.${f.name.split('.').pop()}`; 
    await supabase.storage.from('minutes-files').upload(p, f); 
    return supabase.storage.from('minutes-files').getPublicUrl(p).data.publicUrl; 
  };

  const addChurch = async (c: Church) => { 
    await supabase.from('churches').insert([{ ...c, id: generateUUID() }]); 
    refreshData(); 
  };

  const addCongregation = async (c: Church) => { 
    const id = generateUUID(); 
    const { data } = await supabase.from('churches').insert([{ ...c, id }]).select().single(); 
    refreshData(); 
    return data?.id; 
  };

  const updateChurch = async (id: string, data: Partial<Church>) => { 
    const { error } = await supabase.from('churches').update(data).eq('id', id); 
    refreshData(); 
    return { success: !error, error: error?.message }; 
  };

  const deleteChurch = async (id: string) => { 
    await supabase.from('churches').delete().eq('id', id); 
    refreshData(); 
  };

  const uploadChurchLogo = async (f: File) => { 
    const p = `${Date.now()}.${f.name.split('.').pop()}`; 
    await supabase.storage.from('church-logos').upload(p, f); 
    return supabase.storage.from('church-logos').getPublicUrl(p).data.publicUrl; 
  };

  const updateUser = async (id: string, u: User) => { 
    const up: any = { name: u.name, username: u.username, role: u.role, church_id: u.churchId || null };
    if (u.password) up.password = await hashPassword(u.password);
    if (u.cpf) up.cpf = await encryptData(u.cpf);
    await supabase.from('profiles').update(up).eq('id', id); 
    refreshData(); 
  };

  const deleteUser = async (id: string) => { 
    await supabase.from('profiles').delete().eq('id', id); 
    refreshData(); 
  };

  return (
    <AppContext.Provider value={{
      user, login, logout, currentChurch, availableChurches, selectChurch,
      users, churches, members, transactions, fixedExpenses, campaigns, events, minutes,
      addTransaction, updateTransaction, deleteTransaction, uploadTransactionFile, confirmTransactionPayment,
      addFixedExpense, updateFixedExpense, deleteFixedExpense, generateMonthlyFixedExpenses,
      addMember, updateMember, deleteMember, uploadMemberPhoto,
      addEvent, updateEvent, deleteEvent, uploadEventImage,
      addCampaign, updateCampaign, deleteCampaign,
      addMinute, updateMinute, deleteMinute, uploadMinuteFile,
      addChurch, addCongregation, updateChurch, deleteChurch, toggleChurchStatus, uploadChurchLogo,
      addUser, updateUser, deleteUser,
      updateUserCredentials, recoverAccount, 
      adminViewChurchId: viewChurchId, enterAdminView, exitAdminView
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
