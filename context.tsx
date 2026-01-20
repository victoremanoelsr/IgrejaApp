
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, Church, Member, Transaction, Campaign, Event, Minute } from './types';
import { supabase } from './services/supabaseClient';
import { 
  toAppChurch, toAppUser, toAppMember, toAppTransaction, 
  toAppCampaign, toAppEvent, toAppMinute 
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
          .maybeSingle(); // Alterado de .single() para .maybeSingle() para evitar erro PGRST116 (0 rows)
      
      if (error) {
        console.error("Erro Supabase:", error);
        if (error.code === '42703') {
           return { user: null, error: 'ERRO DE BANCO: Coluna "password" não existe. Execute o script setup.sql.' };
        }
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
        } else {
          if (appUser.role !== 'SUPER_ADM') {
             return { user: null, error: 'Usuário sem vínculo com igreja. Contate o suporte.' };
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
      console.error("Erro inesperado:", e);
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

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, file);

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

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

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

      const { error: uploadError } = await supabase.storage
        .from('minutes-files')
        .upload(filePath, file);

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

      const { error: uploadError } = await supabase.storage
        .from('transaction-files')
        .upload(filePath, file);

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

      const { error: uploadError } = await supabase.storage
        .from('church-logos')
        .upload(filePath, file);

      if (uploadError) return null;
      const { data } = supabase.storage.from('church-logos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) { return null; }
  };

  const addChurch = async (c: Church) => {
    const { error } = await supabase.from('churches').insert([{
      id: ensureId(c.id),
      name: c.name, address: c.address, active: c.active, type: c.type, 
      pastor_name: c.pastorName, cnpj: c.cnpj
    }]);
    if (!error) refreshData();
  };

  const addCongregation = async (c: Church): Promise<string | null> => {
     const newId = ensureId(c.id);
     const { data, error } = await supabase.from('churches').insert([{
      id: newId,
      name: c.name, 
      address: c.address, 
      active: c.active, 
      type: 'CONGREGACAO',
      parent_id: c.parentId, 
      pastor_name: c.pastorName
    }])
    .select()
    .single();

    if (!error && data) {
        refreshData();
        return data.id;
    }
    return null;
  };

  const addUser = async (u: User): Promise<{ success: boolean; error?: string }> => {
    const newId = ensureId(u.id);
    const { error } = await supabase.from('profiles').insert([{
        id: newId,
        name: u.name, username: u.username, password: u.password, cpf: u.cpf,
        role: u.role, church_id: u.churchId || null
    }]);

    if (error) {
        console.error("Erro ao adicionar usuário:", error);
        if (error.code === '23505') return { success: false, error: 'Este nome de usuário já existe.' };
        return { success: false, error: error.message };
    }
    refreshData();
    return { success: true };
  };

  const addMember = async (m: Member): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('members').insert([{
          id: ensureId(m.id),
          church_id: m.churchId, 
          name: m.name, 
          cpf: m.cpf, 
          birth_date: cleanDate(m.birthDate), 
          member_number: m.memberNumber, 
          is_tither: m.isTither, 
          baptism_date: cleanDate(m.baptismDate), 
          address: m.address,
          photo_url: m.photo,
          email: m.email, 
          phone: m.phone,
          marital_status: m.maritalStatus
      }]);
      
      if (error) {
        console.error("Erro ao adicionar membro:", error);
        return { success: false, error: error.message };
      }
      refreshData();
      return { success: true };
    } catch (e: any) {
       return { success: false, error: e.message };
    }
  };

  const updateMember = async (id: string, m: Member): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.from('members').update({
          name: m.name, 
          cpf: m.cpf, 
          birth_date: cleanDate(m.birthDate), 
          member_number: m.memberNumber,
          is_tither: m.isTither, 
          baptism_date: cleanDate(m.baptismDate), 
          address: m.address,
          photo_url: m.photo,
          email: m.email, 
          phone: m.phone,
          marital_status: m.maritalStatus
      }).eq('id', id);

      if (error) {
          return { success: false, error: error.message };
      }
      refreshData();
      return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
           alert("Erro: Este membro possui registros financeiros (dízimos/ofertas) vinculados. Não é possível excluí-lo diretamente.");
        } else {
           alert(`Erro ao excluir membro: ${error.message}`);
        }
        return;
      }
      refreshData();
      alert("Membro excluído com sucesso.");
    } catch (e: any) {
      alert("Ocorreu um erro inesperado ao tentar excluir o membro.");
    }
  };

  const addTransaction = async (t: Transaction) => {
    const { error } = await supabase.from('transactions').insert([{
        id: ensureId(t.id),
        church_id: t.churchId, type: t.type, category: t.category, amount: t.amount,
        date: t.date, description: t.description, member_id: t.memberId,
        responsible_user_id: t.responsibleUserId, campaign_id: t.campaignId,
        attachment_url: t.attachmentUrl
    }]);
    if (error) console.error("Erro transação", error);
    refreshData();
  };

  const updateTransaction = async (id: string, t: Transaction) => {
    const { error } = await supabase.from('transactions').update({
        type: t.type, 
        category: t.category, 
        amount: t.amount,
        date: t.date, 
        description: t.description, 
        member_id: t.memberId,
        attachment_url: t.attachmentUrl,
        campaign_id: t.campaignId // Ensure this field is handled if passed
    }).eq('id', id);
    if (error) console.error("Erro ao atualizar transação", error);
    refreshData();
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    refreshData();
  };

  const addCampaign = async (c: Campaign) => {
    await supabase.from('campaigns').insert([{
        id: ensureId(c.id),
        church_id: c.churchId, name: c.name, goal: c.goal, 
        start_date: c.startDate, description: c.description, status: c.status
    }]);
    refreshData();
  };

  const updateCampaign = async (id: string, c: Campaign): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.from('campaigns').update({
        name: c.name, goal: c.goal, start_date: c.startDate, 
        description: c.description, status: c.status
    }).eq('id', id);
    
    if (error) {
        console.error("Erro ao atualizar campanha:", error);
        return { success: false, error: error.message };
    }
    
    refreshData();
    return { success: true };
  };

  const deleteCampaign = async (id: string) => {
    try {
        // 1. Tentar deletar as transações vinculadas primeiro (garantia no app)
        await supabase.from('transactions').delete().eq('campaign_id', id);

        // 2. Deletar a campanha
        const { error } = await supabase.from('campaigns').delete().eq('id', id);
        
        if (error) {
            console.error("Erro ao excluir campanha:", error);
            alert(`Erro ao excluir campanha: ${error.message}`);
            return;
        }
        refreshData();
        alert("Campanha e seus registros financeiros foram excluídos com sucesso.");
    } catch (e: any) {
        console.error("Exceção:", e);
        alert("Erro inesperado ao excluir campanha.");
    }
  };

  const addEvent = async (e: Event) => {
    await supabase.from('events').insert([{
        id: ensureId(e.id),
        church_id: e.churchId, name: e.name, date: e.date, 
        time: e.time, responsible_name: e.responsibleName,
        image_url: e.imageUrl,
        location: e.location // ADICIONADO CAMPO LOCATION
    }]);
    refreshData();
  };

  const updateEvent = async (id: string, e: Event) => {
    await supabase.from('events').update({
        name: e.name,
        date: e.date,
        time: e.time,
        responsible_name: e.responsibleName,
        image_url: e.imageUrl,
        location: e.location // ADICIONADO CAMPO LOCATION
    }).eq('id', id);
    refreshData();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    refreshData();
  };

  const addMinute = async (m: Minute) => {
    await supabase.from('minutes').insert([{
        id: ensureId(m.id),
        church_id: m.churchId, 
        title: m.title, 
        date: m.date, 
        file_url: JSON.stringify(m.fileUrls) // MUDANÇA: Salva array como string
    }]);
    refreshData();
  };

  const updateMinute = async (id: string, m: Minute) => {
    await supabase.from('minutes').update({
        title: m.title,
        date: m.date,
        file_url: JSON.stringify(m.fileUrls) // MUDANÇA: Salva array como string
    }).eq('id', id);
    refreshData();
  };

  const deleteMinute = async (id: string) => {
    await supabase.from('minutes').delete().eq('id', id);
    refreshData();
  };

  const updateUser = async (id: string, u: User) => {
     await supabase.from('profiles').update({
         name: u.name, username: u.username, cpf: u.cpf, role: u.role,
         church_id: u.churchId || null
     }).eq('id', id);
     refreshData();
  };

  const deleteUser = async (id: string) => {
      await supabase.from('profiles').delete().eq('id', id);
      refreshData();
  };

  const updateChurch = async (id: string, data: Partial<Church>): Promise<{ success: boolean; error?: string }> => {
      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.address !== undefined) updates.address = data.address;
      if (data.pastorName !== undefined) updates.pastor_name = data.pastorName;
      if (data.cnpj !== undefined) updates.cnpj = data.cnpj;
      if (data.missionStatement !== undefined) updates.mission_statement = data.missionStatement;
      if (data.active !== undefined) updates.active = data.active;
      if (data.logoUrl !== undefined) updates.logo_url = data.logoUrl;

      if (Object.keys(updates).length > 0) {
          const { error } = await supabase.from('churches').update(updates).eq('id', id);
          
          if (error) {
              console.error("Erro ao atualizar igreja:", error);
              return { success: false, error: error.message };
          }
          refreshData();
          return { success: true };
      }
      return { success: true };
  };

  const deleteChurch = async (id: string) => {
      try {
        // 1. Identificar TODAS as igrejas envolvidas (Sede + Congregações)
        const idsToDelete = [id];
        
        // Encontrar congregações filhas
        const children = churches.filter(c => c.parentId === id);
        children.forEach(c => idsToDelete.push(c.id));

        console.log("Deletando igrejas e dados para IDs:", idsToDelete);

        // 2. Exclusão em Lote (Batch Delete) para todas as tabelas dependentes
        // A ordem importa para evitar conflitos de Foreign Key (Transações > Membros/Campanhas > Igrejas)

        // A. Transações (dependem de Membros, Campanhas e Igrejas)
        await supabase.from('transactions').delete().in('church_id', idsToDelete);
        
        // B. Campanhas (dependem de Igrejas)
        await supabase.from('campaigns').delete().in('church_id', idsToDelete);
        
        // C. Membros (dependem de Igrejas)
        await supabase.from('members').delete().in('church_id', idsToDelete);
        
        // D. Eventos e Atas
        await supabase.from('events').delete().in('church_id', idsToDelete);
        await supabase.from('minutes').delete().in('church_id', idsToDelete);
        
        // E. Usuários vinculados a estas igrejas
        await supabase.from('profiles').delete().in('church_id', idsToDelete);

        // 3. Excluir as Igrejas (Filhas e Pai)
        // O uso do .in resolve tudo de uma vez
        const { error } = await supabase.from('churches').delete().in('id', idsToDelete);
        
        if (error) {
            console.error("Erro ao excluir igreja:", error);
            alert(`Erro ao excluir: ${error.message}`);
        } else {
            alert(`Igreja e ${children.length} congregações (com todos os dados vinculados) excluídas com sucesso.`);
        }
        
        refreshData();
      } catch (e: any) {
          console.error("Erro inesperado ao excluir igreja:", e);
          alert("Ocorreu um erro inesperado. Verifique o console.");
      }
  };

  const toggleChurchStatus = async (id: string) => {
      const church = churches.find(c => c.id === id);
      if (church) {
          await supabase.from('churches').update({ active: !church.active }).eq('id', id);
          refreshData();
      }
  };
  
  const updateUserCredentials = async (userId: string, newUsername?: string, newPassword?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const updates: any = {};
        if (newUsername) updates.username = newUsername.trim(); // Trim spaces
        if (newPassword) updates.password = newPassword.trim(); // Trim spaces
        
        const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
        
        if (error) {
            console.error("Erro ao atualizar credenciais:", error);
            return { success: false, error: error.message };
        }
        
        await refreshData();
        return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const recoverAccount = (name: string, cpf: string) => {
    const searchName = name.toLowerCase().trim();
    const searchCpf = cpf.trim();

    // 1. Busca na tabela de MEMBROS (Prioridade Solicitada)
    // Usamos 'includes' para ser mais tolerante com nomes incompletos (ex: "Victor" acha "Victor Hugo")
    const memberMatch = members.find(m => 
        m.cpf === searchCpf && 
        m.name.toLowerCase().includes(searchName)
    );

    // 2. Busca na tabela de USUÁRIOS (Profiles)
    // Necessário, pois só podemos resetar a senha se existir um Usuário de Sistema
    const userMatch = users.find(u => u.cpf === searchCpf);

    // Cenário Ideal: É Membro e tem Usuário vinculado pelo CPF
    if (memberMatch && userMatch) {
        return userMatch.id;
    }

    // Cenário Alternativo: Não achou como membro, mas achou como usuário (ex: Admin externo)
    // Nesse caso, verifica se o nome bate com o do usuário
    if (!memberMatch && userMatch) {
        if (userMatch.name.toLowerCase().includes(searchName)) {
            return userMatch.id;
        }
    }

    // Se achou membro mas NÃO tem usuário -> Não dá pra recuperar senha (não tem conta)
    return null;
  };

  const enterAdminView = (churchId: string) => selectChurch(churchId);
  const exitAdminView = () => setViewChurchId(null);

  return (
    <AppContext.Provider value={{
      user, login, logout, 
      currentChurch, availableChurches, selectChurch,
      
      users, churches, members, transactions, campaigns, events, minutes,
      
      addTransaction, updateTransaction, deleteTransaction, uploadTransactionFile,
      addMember, updateMember, deleteMember, uploadMemberPhoto,
      addEvent, updateEvent, deleteEvent, uploadEventImage,
      addCampaign, updateCampaign, deleteCampaign,
      
      addMinute, 
      updateMinute, 
      deleteMinute, 
      uploadMinuteFile, 
      
      addChurch, addCongregation, 
      addUser, updateUser, deleteUser, updateUserCredentials, recoverAccount,
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
