import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { User, Church, Member, Transaction, Campaign, Event, Minute } from './types';

// --- MOCK DATA ---

// Dados limpos conforme solicitado, mantendo apenas o Super Admin
const MOCK_CHurches: Church[] = [];

const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Victor', 
    username: 'victor', 
    cpf: '000.000.000-00', 
    role: 'SUPER_ADM', 
    churchId: '', // Sem igreja vinculada inicialmente
    password: '123' 
  }
];

const MOCK_MEMBERS: Member[] = [];

const MOCK_TRANSACTIONS: Transaction[] = [];

const MOCK_CAMPAIGNS: Campaign[] = [];

// --- CONTEXT SETUP ---

interface AppContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  
  // Data Access
  users: User[];
  churches: Church[];
  members: Member[];
  transactions: Transaction[];
  campaigns: Campaign[];
  events: Event[];
  minutes: Minute[];
  
  // Hierarchy & Navigation
  currentChurch: Church | null; // The church currently being VIEWED
  availableChurches: Church[]; // List of churches the user CAN switch to
  selectChurch: (churchId: string) => void;

  // Actions
  addTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void; // Added
  addMember: (m: Member) => void;
  updateMember: (id: string, m: Member) => void;
  deleteMember: (id: string) => void;
  addEvent: (e: Event) => void;
  addCampaign: (c: Campaign) => void;
  updateCampaign: (id: string, c: Campaign) => void; // Added
  deleteCampaign: (id: string) => void; // Added
  addMinute: (m: Minute) => void;
  addChurch: (c: Church) => void;
  addCongregation: (c: Church) => void; // New action for Pastors
  addUser: (u: User) => void;
  updateUser: (id: string, u: User) => void;
  deleteUser: (id: string) => void;
  updateChurch: (id: string, data: Partial<Church>) => void;
  deleteChurch: (id: string) => void; // Nova função
  toggleChurchStatus: (id: string) => void;
  recoverAccount: (name: string, cpf: string) => string | null;
  updateUserCredentials: (userId: string, newUsername?: string, newPassword?: string) => void;

  // Super Admin Legacy (Ghost Mode is now integrated into selectChurch logic for simplicity, but keeping helpers if needed)
  enterAdminView: (churchId: string) => void;
  exitAdminView: () => void;
  adminViewChurchId: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  // View State
  const [viewChurchId, setViewChurchId] = useState<string | null>(null);

  // State for data (simulating DB)
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [churches, setChurches] = useState<Church[]>(MOCK_CHurches);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [events, setEvents] = useState<Event[]>([]);
  const [minutes, setMinutes] = useState<Minute[]>([]);

  // --- HIERARCHY LOGIC ---

  // Determine which churches are available to the current user
  const availableChurches = useMemo(() => {
    if (!user) return [];

    // 1. Super Admin: All Churches
    if (user.role === 'SUPER_ADM') {
      return churches;
    }

    // 2. Pastor Presidente/Vice (Sede Scope): Own Sede + All Child Congregations
    if (user.role === 'PRESIDENTE' || user.role === 'VICE_PRESIDENTE') {
      const myChurch = churches.find(c => c.id === user.churchId);
      if (!myChurch) return [];

      // If I am at Sede, I see Sede + Children
      if (myChurch.type === 'SEDE') {
        return churches.filter(c => c.id === user.churchId || c.parentId === user.churchId);
      }
      // If I am at Congregation (unlikely for Pres/Vice of field, but possible for local leaders), usually just local
      return [myChurch];
    }

    // 3. Local Staff (Tesoureiro, Secretario): Only their specific unit
    const myChurch = churches.find(c => c.id === user.churchId);
    return myChurch ? [myChurch] : [];
  }, [user, churches]);

  // Determine the Current Church Object based on selection
  const currentChurch = useMemo(() => {
    if (!viewChurchId) return null;
    return churches.find(c => c.id === viewChurchId) || null;
  }, [viewChurchId, churches]);

  // Set default view upon login or user change
  useEffect(() => {
    // CORREÇÃO: Se for SUPER_ADM, NÃO seleciona igreja automaticamente. Mantém viewChurchId como null.
    // Isso garante que ele veja o "Painel Master" e não o menu operacional.
    if (user && !viewChurchId && user.role !== 'SUPER_ADM') {
      setViewChurchId(user.churchId);
    }
  }, [user]);

  const selectChurch = (churchId: string) => {
    // Security check: ensure user is allowed to view this church
    const canView = availableChurches.some(c => c.id === churchId);
    if (canView || user?.role === 'SUPER_ADM') {
      setViewChurchId(churchId);
    } else {
      console.error("Acesso negado a esta unidade.");
    }
  };

  const login = async (username: string, password?: string) => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase());
    
    if (found) {
      if (found.password && found.password !== password) return false;

      const usersChurch = churches.find(c => c.id === found.churchId);
      // Admin não precisa de igreja ativa para logar
      if (found.role !== 'SUPER_ADM' && usersChurch && !usersChurch.active) {
        alert("Acesso suspenso. Entre em contato com a administração.");
        return false;
      }
      setUser(found);
      // IMPORTANTE: Não setamos setViewChurchId aqui para Super Admins
      if (found.role !== 'SUPER_ADM') {
        setViewChurchId(found.churchId);
      } else {
        setViewChurchId(null); // Garante reset para Global View
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setViewChurchId(null);
  };

  // --- ACTIONS ---

  // Add Church (Sede - Super Admin)
  const addChurch = (c: Church) => {
    setChurches(prev => [...prev, { ...c, id: Math.random().toString(36).substr(2, 9), type: 'SEDE' }]);
  };

  // Add Congregation (Child - Pastor)
  const addCongregation = (c: Church) => {
    if (!user) return;
    // UPDATED: Allow passing an ID (for creating linked users immediately) or generate one
    setChurches(prev => [...prev, { 
      ...c, 
      id: c.id || Math.random().toString(36).substr(2, 9), 
      type: 'CONGREGACAO',
      parentId: user.role === 'SUPER_ADM' && currentChurch ? currentChurch.id : user.churchId // Linked to the viewed Sede if Admin
    }]);
  };

  const addTransaction = (t: Transaction) => setTransactions(prev => [...prev, { ...t, id: Math.random().toString(36).substr(2, 9) }]);
  const deleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));
  
  const addMember = (m: Member) => setMembers(prev => [...prev, { ...m, id: Math.random().toString(36).substr(2, 9) }]);
  const updateMember = (id: string, m: Member) => setMembers(prev => prev.map(item => item.id === id ? { ...m, id } : item));
  const deleteMember = (id: string) => setMembers(prev => prev.filter(m => m.id !== id));
  
  const addEvent = (e: Event) => setEvents(prev => [...prev, { ...e, id: Math.random().toString(36).substr(2, 9) }]);
  
  const addCampaign = (c: Campaign) => setCampaigns(prev => [...prev, { ...c, id: Math.random().toString(36).substr(2, 9) }]);
  const updateCampaign = (id: string, c: Campaign) => setCampaigns(prev => prev.map(item => item.id === id ? { ...c, id } : item));
  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    // Optional: Delete transactions linked to campaign? keeping them for safety for now or handled by logic
  };

  const addMinute = (m: Minute) => setMinutes(prev => [...prev, { ...m, id: Math.random().toString(36).substr(2, 9) }]);
  const addUser = (u: User) => setUsers(prev => [...prev, { ...u, id: Math.random().toString(36).substr(2, 9) }]);
  const updateUser = (id: string, updated: User) => setUsers(prev => prev.map(u => u.id === id ? { ...updated, id } : u));
  const deleteUser = (id: string) => setUsers(prev => prev.filter(u => u.id !== id));
  const updateChurch = (id: string, data: Partial<Church>) => setChurches(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  
  const deleteChurch = (id: string) => setChurches(prev => prev.filter(c => c.id !== id));

  const toggleChurchStatus = (id: string) => {
    setChurches(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const recoverAccount = (name: string, cpf: string) => {
    const found = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.cpf === cpf);
    return found ? found.id : null;
  };

  const updateUserCredentials = (userId: string, newUsername?: string, newPassword?: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, username: newUsername || u.username, password: newPassword || u.password } : u));
  };

  const enterAdminView = (churchId: string) => selectChurch(churchId);
  const exitAdminView = () => setViewChurchId(null);

  return (
    <AppContext.Provider value={{
      user, login, logout, 
      currentChurch, availableChurches, selectChurch,
      
      users, churches, members, transactions, campaigns, events, minutes,
      
      addTransaction, deleteTransaction, 
      addMember, updateMember, deleteMember, addEvent, 
      addCampaign, updateCampaign, deleteCampaign,
      addMinute, addChurch, addCongregation, addUser, updateUser, deleteUser, updateChurch, deleteChurch,
      recoverAccount, updateUserCredentials, toggleChurchStatus,
      
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