
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  User, Church, Member, Transaction, Campaign, Event, Minute, 
  FixedExpense, LetterHistory, BookletSettings, CarnetTemplate, LetterTemplate 
} from './types';
import { 
  toAppUser, toAppChurch, toAppMember, toAppTransaction, 
  toAppCampaign, toAppEvent, toAppMinute, toAppFixedExpense, toAppLetterHistory, toAppCarnetTemplate, toAppLetterTemplate 
} from './services/dataMappers';

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
  
  login: (u: string, p: string) => Promise<{user?: User, error?: string}>;
  logout: () => void;
  recoverAccount: (name: string, cpf: string) => string | null;
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
  
  // Legacy single setting
  getBookletSettings: (churchId: string) => Promise<BookletSettings | null>;
  saveBookletSettings: (settings: BookletSettings) => Promise<void>;
  
  // Carnet Template Logic
  getCarnetTemplates: (churchId: string) => Promise<CarnetTemplate[]>;
  addCarnetTemplate: (t: CarnetTemplate) => Promise<{success: boolean, error?: string}>;
  updateCarnetTemplate: (id: string, t: Partial<CarnetTemplate>) => Promise<{success: boolean, error?: string}>;
  deleteCarnetTemplate: (id: string) => Promise<void>;
  setDefaultTemplate: (id: string, churchId: string) => Promise<void>;
  
  // Letter Template Logic
  getLetterTemplates: (churchId: string) => Promise<LetterTemplate[]>;
  addLetterTemplate: (t: LetterTemplate) => Promise<{success: boolean, error?: string}>;
  updateLetterTemplate: (id: string, t: Partial<LetterTemplate>) => Promise<{success: boolean, error?: string}>;
  deleteLetterTemplate: (id: string) => Promise<void>;
  
  uploadBookletBackground: (file: File) => Promise<string | null>;
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
  };

  const login = async (u: string, p: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('username', u).eq('password', p).single();
    if (data) {
        const appUser = toAppUser(data);
        setUser(appUser);
        if (appUser.churchId) {
            const church = churches.find(c => c.id === appUser.churchId);
            if (church) setCurrentChurch(church);
        }
        return { user: appUser };
    }
    return { error: 'Credenciais inválidas' };
  };

  const logout = () => {
    setUser(null);
    setCurrentChurch(null);
  };

  const recoverAccount = (name: string, cpf: string) => {
    const found = users.find(u => u.name === name.toUpperCase() && u.cpf === cpf);
    return found ? found.id : null;
  };

  const updateUserCredentials = async (id: string, username?: string, password?: string) => {
    const updates: any = {};
    if(username) updates.username = username;
    if(password) updates.password = password;
    
    const { error } = await supabase.from('profiles').update(updates).eq('id', id);
    if (!error) {
        setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u));
        return { success: true };
    }
    return { success: false, error: error.message };
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
    if(data) setTransactions([...transactions, toAppTransaction(data[0])]);
  };

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
      const { error } = await supabase.from('churches').update({
          name: d.name,
          address: d.address,
          pastor_name: d.pastorName,
          cnpj: d.cnpj,
          mission_statement: d.missionStatement,
          logo_url: d.logoUrl
      }).eq('id', id);
      if(!error) {
          setChurches(churches.map(c => c.id === id ? { ...c, ...d } : c));
          if(currentChurch?.id === id) setCurrentChurch({ ...currentChurch, ...d });
          return { success: true };
      }
      return { success: false, error: error.message };
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
          await updateChurch(id, { active: !church.active });
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
          background_style: t.backgroundStyle, // NOVO
          layout_json: t.layoutJson,
          is_default: t.isDefault
      };
      const { data, error } = await supabase.from('mission_carnet_templates').insert([payload]).select();
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const updateCarnetTemplate = async (id: string, t: Partial<CarnetTemplate>) => {
      const payload: any = {};
      if(t.name) payload.name = t.name;
      if(t.backgroundUrl !== undefined) payload.background_url = t.backgroundUrl;
      if(t.backgroundStyle) payload.background_style = t.backgroundStyle; // NOVO
      if(t.layoutJson) payload.layout_json = t.layoutJson;
      if(t.isDefault !== undefined) payload.is_default = t.isDefault;

      const { error } = await supabase.from('mission_carnet_templates').update(payload).eq('id', id);
      if (!error) return { success: true };
      return { success: false, error: error.message };
  };

  const deleteCarnetTemplate = async (id: string) => {
      await supabase.from('mission_carnet_templates').delete().eq('id', id);
  };

  const setDefaultTemplate = async (id: string, churchId: string) => {
      await supabase.from('mission_carnet_templates').update({ is_default: false }).eq('church_id', churchId);
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
    addLetterHistory, getBookletSettings, saveBookletSettings, uploadBookletBackground,
    // New Exports
    getCarnetTemplates, addCarnetTemplate, updateCarnetTemplate, deleteCarnetTemplate, setDefaultTemplate,
    getLetterTemplates, addLetterTemplate, updateLetterTemplate, deleteLetterTemplate
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
