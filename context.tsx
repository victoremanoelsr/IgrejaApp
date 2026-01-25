
// ... (imports remain the same)
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, Church, Member, Transaction, Campaign, Event, Minute, FixedExpense } from './types';
import { supabase } from './services/supabaseClient';
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
  
  // Data Access
  users: User[];
  churches: Church[];
  members: Member[];
  transactions: Transaction[];
  fixedExpenses: FixedExpense[]; // New
  campaigns: Campaign[];
  events: Event[];
  minutes: Minute[];
  
  currentChurch: Church | null;
  availableChurches: Church[];
  selectChurch: (churchId: string) => void;

  // Actions (Async now)
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (id: string, t: Transaction) => Promise<void>; 
  deleteTransaction: (id: string) => Promise<void>;
  uploadTransactionFile: (file: File) => Promise<string | null>; 
  confirmTransactionPayment: (id: string) => Promise<void>; // Nova ação
  
  // Fixed Expenses Actions
  addFixedExpense: (fe: FixedExpense) => Promise<string | null>;
  updateFixedExpense: (id: string, fe: FixedExpense) => Promise<void>;
  deleteFixedExpense: (id: string) => Promise<void>;
  // Assinatura atualizada para aceitar intervalo
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

// Helper robusto para gerar UUID v4
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const cleanDate = (dateStr?: string) => {
  if (!dateStr || dateStr.trim() === '') return null;
  return dateStr;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [viewChurchId, setViewChurchId] = useState<string | null>(null);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);

  // --- DATA FETCHING ---
  const refreshData = async () => {
    try {
      const { data: dChurches } = await supabase.from('churches').select('*');
      if (dChurches) setChurches(dChurches.map(toAppChurch));

      const { data: dUsers } = await supabase.from('profiles').select('*');
      if (dUsers) setUsers(dUsers.map(toAppUser));

      const { data: dMembers } = await supabase.from('members').select('*');
      if (dMembers) setMembers(dMembers.map(toAppMember));

      const { data: dTrans } = await supabase.from('transactions').select('*');
      if (dTrans) setTransactions(dTrans.map(toAppTransaction));

      const { data: dFixed } = await supabase.from('fixed_expenses').select('*');
      if (dFixed) setFixedExpenses(dFixed.map(toAppFixedExpense));

      const { data: dCamps } = await supabase.from('campaigns').select('*');
      if (dCamps) setCampaigns(dCamps.map(toAppCampaign));

      const { data: dEvents } = await supabase.from('events').select('*');
      if (dEvents) setEvents(dEvents.map(toAppEvent));

      const { data: dMinutes } = await supabase.from('minutes').select('*');
      if (dMinutes) setMinutes(dMinutes.map(toAppMinute));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // Initial Load
  useEffect(() => {
    refreshData();
  }, [user]);

  // --- AUTO GENERATE FIXED EXPENSES LOGIC (IMPROVED) ---
  useEffect(() => {
    if (user && viewChurchId) {
        // Gera para o mês atual por padrão ao carregar
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        generateMonthlyFixedExpenses(viewChurchId, start, end);
    }
  }, [user, viewChurchId, fixedExpenses]); 

  const generateMonthlyFixedExpenses = async (churchId: string, startDateStr?: string, endDateStr?: string) => {
      const myFixed = fixedExpenses.filter(fe => fe.churchId === churchId && fe.active && fe.autoGenerate);
      if (myFixed.length === 0) return;

      const today = new Date();
      // Default to current month if no range provided
      const start = startDateStr ? new Date(startDateStr) : new Date(today.getFullYear(), today.getMonth(), 1);
      const end = endDateStr ? new Date(endDateStr) : new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Iterate through each month in the range
      const updates: Promise<any>[] = [];
      let currentIter = new Date(start.getFullYear(), start.getMonth(), 1);
      const endIter = new Date(end.getFullYear(), end.getMonth(), 1);

      while (currentIter <= endIter) {
          const targetYear = currentIter.getFullYear();
          const targetMonth = currentIter.getMonth(); // 0-11

          myFixed.forEach(fe => {
              // 1. Validate Creation Date (No retroactive generation before creation)
              if (fe.createdAt) {
                  const createdDate = new Date(fe.createdAt);
                  const createdYear = createdDate.getFullYear();
                  const createdMonth = createdDate.getMonth();
                  
                  if (targetYear < createdYear) return;
                  if (targetYear === createdYear && targetMonth < createdMonth) return;
              }

              // 2. Check existence in this month
              const alreadyExists = transactions.some(t => {
                  if (t.fixedExpenseId !== fe.id) return false;
                  const tDate = new Date(t.date + 'T12:00:00');
                  return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
              });

              if (!alreadyExists) {
                  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
                  const dayToUse = Math.min(fe.dueDay, maxDays);
                  // Month is 0-indexed in JS Date, but we need correct string format
                  // Note: month in Date constructor is 0-11.
                  const newDateObj = new Date(targetYear, targetMonth, dayToUse);
                  const newDate = newDateObj.toISOString().split('T')[0];
                  
                  const newT: Transaction = {
                      id: generateUUID(),
                      churchId: fe.churchId,
                      type: 'SAIDA',
                      category: fe.category,
                      amount: fe.amount,
                      date: newDate,
                      description: `${fe.description} (FIXO)`.toUpperCase(),
                      responsibleUserId: user?.id || '',
                      isFixed: true,
                      fixedExpenseId: fe.id,
                      status: 'PENDENTE' // Gera como Pendente
                  };
                  
                  updates.push(supabase.from('transactions').insert([{
                      id: newT.id,
                      church_id: newT.churchId,
                      type: newT.type,
                      category: newT.category,
                      amount: newT.amount,
                      date: newT.date,
                      description: newT.description,
                      responsible_user_id: newT.responsibleUserId,
                      is_fixed: true,
                      fixed_expense_id: newT.fixedExpenseId,
                      status: 'PENDENTE'
                  }]));
              }
          });

          // Next Month
          currentIter.setMonth(currentIter.getMonth() + 1);
      }

      if (updates.length > 0) {
          await Promise.all(updates);
          refreshData(); 
      }
  };

  // --- HIERARCHY LOGIC ---
  const availableChurches = useMemo(() => {
    if (!user) return [];
    if (user.role === 'SUPER_ADM') return churches;

    if (!user.churchId) return [];

    if (user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE') {
      const myChurch = churches.find(c => c.id === user.churchId);
      if (!myChurch) return [];
      if (myChurch.type === 'SEDE') {
        return churches.filter(c => c.id === user.churchId || c.parentId === user.churchId);
      }
      return [myChurch];
    }
    const myChurch = churches.find(c => c.id === user.churchId);
    return myChurch ? [myChurch] : [];
  }, [user, churches]);

  const currentChurch = useMemo(() => {
    if (!viewChurchId) return null;
    return churches.find(c => c.id === viewChurchId) || null;
  }, [viewChurchId, churches]);

  useEffect(() => {
    if (user && !viewChurchId && user.churchId) {
       if (user.role !== 'SUPER_ADM') {
         setViewChurchId(user.churchId);
       }
    }
  }, [user]);

  const selectChurch = (churchId: string) => {
    setViewChurchId(churchId);
  };

  const login = async (username: string, password?: string): Promise<LoginResult> => {
    try {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', username) 
          .eq('password', password)
          .maybeSingle();
      
      if (error) {
        return { user: null, error: 'Erro ao tentar fazer login.' };
      }

      if (data) {
        const appUser = toAppUser(data);
        
        if (appUser.churchId) {
          let userChurch = churches.find(c => c.id === appUser.churchId);
          if (!userChurch && appUser.role !== 'SUPER_ADM') {
              const { data: churchData } = await supabase.from('churches').select('*').eq('id', appUser.churchId).single();
              if (churchData) userChurch = toAppChurch(churchData);
          }
          if (appUser.role !== 'SUPER_ADM' && userChurch && !userChurch.active) {
            return { user: null, error: 'Acesso suspenso. Contate a administração.' };
          }
        }
        
        setUser(appUser);
        if (appUser.role === 'SUPER_ADM') {
          setViewChurchId(null);
        } else if (appUser.churchId) {
          setViewChurchId(appUser.churchId);
        }
        refreshData();
        return { user: appUser };
      }
    } catch (e) {
      return { user: null, error: 'Erro de conexão com o servidor.' };
    }
    return { user: null, error: 'Usuário ou senha inválidos.' };
  };

  const logout = () => {
    setUser(null);
    setViewChurchId(null);
  };

  const ensureId = (id?: string) => {
      if (id && id.length > 10) return id;
      return generateUUID();
  };

  const uploadMemberPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('member-photos').upload(filePath, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('member-photos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };

  const uploadEventImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };

  const uploadMinuteFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('minutes-files').upload(filePath, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('minutes-files').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };

  const uploadTransactionFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('transaction-files').upload(filePath, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('transaction-files').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };
  
  const uploadChurchLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      const { error: uploadError } = await supabase.storage.from('church-logos').upload(filePath, file);
      if (uploadError) return null;
      const { data } = supabase.storage.from('church-logos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };

  // --- CRUD GASTOS FIXOS ---
  const addFixedExpense = async (fe: FixedExpense): Promise<string | null> => {
      const newId = ensureId(fe.id);
      const { error } = await supabase.from('fixed_expenses').insert([{
          id: newId,
          church_id: fe.churchId,
          description: fe.description,
          amount: fe.amount,
          due_day: fe.dueDay,
          category: fe.category,
          auto_generate: fe.autoGenerate,
          active: fe.active
      }]);
      if (!error) {
          refreshData();
          return newId;
      }
      console.error("Erro addFixedExpense:", error);
      return null;
  };

  const updateFixedExpense = async (id: string, fe: FixedExpense) => {
      const { error } = await supabase.from('fixed_expenses').update({
          description: fe.description,
          amount: fe.amount,
          due_day: fe.dueDay,
          category: fe.category,
          auto_generate: fe.autoGenerate,
          active: fe.active
      }).eq('id', id);
      if (!error) refreshData();
  };

  const deleteFixedExpense = async (id: string) => {
      await supabase.from('fixed_expenses').delete().eq('id', id);
      refreshData();
  };

  // ... (Outros CRUD methods)
  const addChurch = async (c: Church) => {
    const { error } = await supabase.from('churches').insert([{
      id: ensureId(c.id), name: c.name, address: c.address, active: c.active, type: c.type, pastor_name: c.pastorName, cnpj: c.cnpj
    }]);
    if (!error) refreshData();
  };

  const addCongregation = async (c: Church): Promise<string | null> => {
     const newId = ensureId(c.id);
     const { data, error } = await supabase.from('churches').insert([{
      id: newId, name: c.name, address: c.address, active: c.active, type: 'CONGREGACAO', parent_id: c.parentId, pastor_name: c.pastorName
    }]).select().single();
    if (!error && data) { refreshData(); return data.id; }
    return null;
  };

  const addUser = async (u: User): Promise<{ success: boolean; error?: string }> => {
    const newId = ensureId(u.id);
    const { error } = await supabase.from('profiles').insert([{
        id: newId, name: u.name, username: u.username, password: u.password, cpf: u.cpf, role: u.role, church_id: u.churchId || null
    }]);
    if (error) {
        if (error.code === '23505') return { success: false, error: 'Este nome de usuário já existe.' };
        return { success: false, error: error.message };
    }
    refreshData(); return { success: true };
  };

  const addMember = async (m: Member): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('members').insert([{
          id: ensureId(m.id), church_id: m.churchId, name: m.name, cpf: m.cpf, birth_date: cleanDate(m.birthDate), member_number: m.memberNumber, is_tither: m.isTither, baptism_date: cleanDate(m.baptismDate), address: m.address, photo_url: m.photo, email: m.email, phone: m.phone, marital_status: m.maritalStatus
      }]);
      if (error) return { success: false, error: error.message };
      refreshData(); return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  };

  const updateMember = async (id: string, m: Member): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('members').update({
          name: m.name, cpf: m.cpf, birth_date: cleanDate(m.birthDate), member_number: m.memberNumber, is_tither: m.isTither, baptism_date: cleanDate(m.baptismDate), address: m.address, photo_url: m.photo, email: m.email, phone: m.phone, marital_status: m.maritalStatus
      }).eq('id', id);
      if (error) return { success: false, error: error.message };
      refreshData(); return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) { if (error.code === '23503') alert("Erro: Membro com registros financeiros."); else alert(`Erro: ${error.message}`); return; }
      refreshData(); alert("Membro excluído.");
    } catch (e: any) { alert("Erro inesperado."); }
  };

  const addTransaction = async (t: Transaction) => {
    const payload: any = {
        id: ensureId(t.id), 
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
        status: t.status || 'PAGO' // Novo campo
    };
    
    if (t.fixedExpenseId) {
        payload.fixed_expense_id = t.fixedExpenseId;
    }

    const { error } = await supabase.from('transactions').insert([payload]);
    if (error) {
        console.error("Erro transação", error);
        alert(`Erro ao salvar transação: ${error.message}\n(Código: ${error.code})`);
    } else {
        refreshData();
    }
  };

  const updateTransaction = async (id: string, t: Transaction) => {
    const payload: any = {
        type: t.type, 
        category: t.category, 
        amount: t.amount, 
        date: t.date, 
        description: t.description, 
        member_id: t.memberId, 
        attachment_url: t.attachmentUrl, 
        campaign_id: t.campaignId, 
        is_fixed: t.isFixed,
        status: t.status
    };
    
    if (t.fixedExpenseId) {
        payload.fixed_expense_id = t.fixedExpenseId;
    }

    const { error } = await supabase.from('transactions').update(payload).eq('id', id);
    if (error) console.error("Erro update transação", error); 
    refreshData();
  };

  const confirmTransactionPayment = async (id: string) => {
      const { error } = await supabase.from('transactions').update({ status: 'PAGO' }).eq('id', id);
      if (!error) refreshData();
  };

  const deleteTransaction = async (id: string) => { await supabase.from('transactions').delete().eq('id', id); refreshData(); };

  const addCampaign = async (c: Campaign) => { await supabase.from('campaigns').insert([{ id: ensureId(c.id), church_id: c.churchId, name: c.name, goal: c.goal, start_date: c.startDate, description: c.description, status: c.status }]); refreshData(); };
  const updateCampaign = async (id: string, c: Campaign): Promise<{ success: boolean; error?: string }> => { const { error } = await supabase.from('campaigns').update({ name: c.name, goal: c.goal, start_date: c.startDate, description: c.description, status: c.status }).eq('id', id); if (error) return { success: false, error: error.message }; refreshData(); return { success: true }; };
  const deleteCampaign = async (id: string) => { try { await supabase.from('transactions').delete().eq('campaign_id', id); const { error } = await supabase.from('campaigns').delete().eq('id', id); if (error) { alert(`Erro: ${error.message}`); return; } refreshData(); alert("Campanha excluída."); } catch (e) { alert("Erro inesperado."); } };

  const addEvent = async (e: Event) => { await supabase.from('events').insert([{ id: ensureId(e.id), church_id: e.churchId, name: e.name, date: e.date, time: e.time, responsible_name: e.responsibleName, image_url: e.imageUrl, location: e.location }]); refreshData(); };
  const updateEvent = async (id: string, e: Event) => { await supabase.from('events').update({ name: e.name, date: e.date, time: e.time, responsible_name: e.responsibleName, image_url: e.imageUrl, location: e.location }).eq('id', id); refreshData(); };
  const deleteEvent = async (id: string) => { await supabase.from('events').delete().eq('id', id); refreshData(); };

  const addMinute = async (m: Minute) => { await supabase.from('minutes').insert([{ id: ensureId(m.id), church_id: m.churchId, title: m.title, date: m.date, file_url: JSON.stringify(m.fileUrls) }]); refreshData(); };
  const updateMinute = async (id: string, m: Minute) => { await supabase.from('minutes').update({ title: m.title, date: m.date, file_url: JSON.stringify(m.fileUrls) }).eq('id', id); refreshData(); };
  const deleteMinute = async (id: string) => { await supabase.from('minutes').delete().eq('id', id); refreshData(); };

  const updateUser = async (id: string, u: User) => { await supabase.from('profiles').update({ name: u.name, username: u.username, cpf: u.cpf, role: u.role, church_id: u.churchId || null }).eq('id', id); refreshData(); };
  const deleteUser = async (id: string) => { await supabase.from('profiles').delete().eq('id', id); refreshData(); };

  const updateChurch = async (id: string, data: Partial<Church>): Promise<{ success: boolean; error?: string }> => {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.address !== undefined) updates.address = data.address;
      if (data.pastorName !== undefined) updates.pastor_name = data.pastorName;
      if (data.cnpj !== undefined) updates.cnpj = data.cnpj;
      if (data.missionStatement !== undefined) updates.mission_statement = data.missionStatement;
      if (data.active !== undefined) updates.active = data.active;
      if (data.logoUrl !== undefined) updates.logo_url = data.logoUrl;
      if (Object.keys(updates).length > 0) { const { error } = await supabase.from('churches').update(updates).eq('id', id); if (error) return { success: false, error: error.message }; refreshData(); return { success: true }; } return { success: true };
  };

  const deleteChurch = async (id: string) => { try { const idsToDelete = [id]; const children = churches.filter(c => c.parentId === id); children.forEach(c => idsToDelete.push(c.id)); await supabase.from('transactions').delete().in('church_id', idsToDelete); await supabase.from('campaigns').delete().in('church_id', idsToDelete); await supabase.from('members').delete().in('church_id', idsToDelete); await supabase.from('events').delete().in('church_id', idsToDelete); await supabase.from('minutes').delete().in('church_id', idsToDelete); await supabase.from('profiles').delete().in('church_id', idsToDelete); const { error } = await supabase.from('churches').delete().in('id', idsToDelete); if (error) alert(`Erro: ${error.message}`); else alert(`Igreja e ${children.length} filiais excluídas.`); refreshData(); } catch (e) { alert("Erro inesperado."); } };
  const toggleChurchStatus = async (id: string) => { const church = churches.find(c => c.id === id); if (church) { await supabase.from('churches').update({ active: !church.active }).eq('id', id); refreshData(); } };
  const updateUserCredentials = async (userId: string, newUsername?: string, newPassword?: string): Promise<{ success: boolean; error?: string }> => { try { const updates: any = {}; if (newUsername) updates.username = newUsername.trim(); if (newPassword) updates.password = newPassword.trim(); const { error } = await supabase.from('profiles').update(updates).eq('id', userId); if (error) return { success: false, error: error.message }; await refreshData(); return { success: true }; } catch (e: any) { return { success: false, error: e.message }; } };
  const recoverAccount = (name: string, cpf: string) => { const searchName = name.toLowerCase().trim(); const searchCpf = cpf.trim(); const memberMatch = members.find(m => m.cpf === searchCpf && m.name.toLowerCase().includes(searchName)); const userMatch = users.find(u => u.cpf === searchCpf); if (memberMatch && userMatch) return userMatch.id; if (!memberMatch && userMatch && userMatch.name.toLowerCase().includes(searchName)) return userMatch.id; return null; };
  const enterAdminView = (churchId: string) => selectChurch(churchId);
  const exitAdminView = () => setViewChurchId(null);

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
      addChurch, addCongregation, addUser, updateUser, deleteUser, updateUserCredentials, recoverAccount,
      updateChurch, deleteChurch, toggleChurchStatus, uploadChurchLogo,
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
