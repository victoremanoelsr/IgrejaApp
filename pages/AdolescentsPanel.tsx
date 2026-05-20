import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { useLocation } from 'react-router-dom';
import { 
  BookOpen, DollarSign,
  Download, Save, X, Search, CheckCircle, Info,
  LayoutDashboard, Settings,
  Upload, History, Trash2, Calendar,
  User as UserIcon, Eye, FileText, RefreshCw, PlusCircle, MinusCircle,
  Users, Edit2, Key, Star, Globe, Filter, Loader, PieChart, TrendingUp, TrendingDown
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Transaction, Member, User, Role } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ADOLESCENTS_ROLES: {role: Role, label: string}[] = [
    { role: 'LIDER_ADOLESCENTES', label: 'Líder dos Adolescentes' },
    { role: 'TESOUREIRO_ADOLESCENTES', label: 'Tesoureiro(a) Adolescentes' }
];

export const AdolescentsPanel: React.FC = () => {
  const { 
      user, currentChurch, transactions, members, users,
      addTransaction, deleteTransaction, 
      uploadTransactionFile,
      addUser, updateUser, deleteUser, updateUserCredentials, updateMember,
      addFixedExpense
  } = useApp();
  const location = useLocation();
  
  const isAdolescentsRole = user && (['LIDER_ADOLESCENTES', 'TESOUREIRO_ADOLESCENTES'].includes(user.role) || ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'].includes(user.role));

  const [viewMode, setViewMode] = useState<'SELECTION' | 'DASHBOARD'>(isAdolescentsRole ? 'DASHBOARD' : 'SELECTION');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CAIXA' | 'MEMBROS' | 'RELATORIOS' | 'EQUIPE'>('DASHBOARD');

  const [dashMonth, setDashMonth] = useState(new Date().getMonth() + 1);
  const [dashYear, setDashYear] = useState(new Date().getFullYear());

  const [reportFilterType, setReportFilterType] = useState<'MONTH' | 'PERIOD'>('MONTH');
  const [reportViewMode, setReportViewMode] = useState<'DETAILED' | 'SUMMARY'>('DETAILED');
  const [repMonth, setRepMonth] = useState(new Date().getMonth() + 1);
  const [repYear, setRepYear] = useState(new Date().getFullYear());
  
  const today = new Date();
  const [repStartDate, setRepStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [repEndDate, setRepEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
  
  const [appliedRepStart, setAppliedRepStart] = useState(repStartDate);
  const [appliedRepEnd, setAppliedRepEnd] = useState(repEndDate);

  const [subTab, setSubTab] = useState<'LISTA' | 'ENTRADA' | 'SAIDA'>('LISTA');
  const [transType, setTransType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  const [teamFormMode, setTeamFormMode] = useState<'LIST' | 'EDIT'>('LIST');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [teamFormData, setTeamFormData] = useState({ name: '', username: '', password: '', role: 'LIDER_ADOLESCENTES' as Role, cpf: '' });
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [memberSearch, setMemberSearch] = useState('');

  const [modal, setModal] = useState<{show: boolean, msg: string, type: 'success'|'error'}>({show: false, msg: '', type: 'success'});
  const showFeedback = (msg: string, type: 'success'|'error' = 'success') => {
      setModal({show: true, msg, type});
      setTimeout(() => setModal({show: false, msg: '', type: 'success'}), 3000);
  };

  useEffect(() => {
      const state = location.state as { activeTab?: string; entered?: boolean } | null;
      if (state?.activeTab) { 
          setViewMode('DASHBOARD'); 
          setActiveTab(state.activeTab as any); 
      }
  }, [currentChurch, location]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const historyTransactions = transactions.filter(t => {
      if (t.churchId !== currentChurch?.id) return false;
      if (t.category !== 'ADOLESCENTES') return false; 
      const d = new Date(t.date + 'T12:00:00');
      const matchesDate = (d.getMonth() + 1) === historyMonth && d.getFullYear() === historyYear;
      return matchesDate;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCancelForm = () => {
    setAmount(''); setDesc(''); setSelectedFile(null);
    setSubTab('LISTA');
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentChurch || !user) return;
      setIsSubmitting(true);
      
      let finalDesc = desc.toUpperCase();
      if (transType === 'ENTRADA' && !finalDesc) finalDesc = `ENTRADA`;

      let attUrl = undefined;
      if (selectedFile) attUrl = await uploadTransactionFile(selectedFile);

      let fixedId: string | undefined = undefined;
      if (transType === 'SAIDA' && isRecurring) {
          const day = parseInt(date.split('-')[2]);
          fixedId = await addFixedExpense({
              id: '', churchId: currentChurch.id, description: finalDesc, amount: parseFloat(amount),
              dueDay: day, category: 'ADOLESCENTES', autoGenerate: true, active: true
          });
      }

      await addTransaction({
          id: '', churchId: currentChurch.id, type: transType, category: 'ADOLESCENTES', amount: parseFloat(amount),
          date, description: finalDesc, responsibleUserId: user.id, status: 'PAGO', attachmentUrl: attUrl, 
          isFixed: isRecurring, fixedExpenseId: fixedId
      });
      setIsSubmitting(false);
      showFeedback('Lançamento realizado!');
      handleCancelForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleDeleteTransaction = (id: string) => {
      if(window.confirm('Excluir este lançamento?')) deleteTransaction(id);
  };

  const toggleAdolescentMember = async (member: Member) => {
      await updateMember(member.id, { ...member, isAdolescent: !member.isAdolescent });
      showFeedback(member.isAdolescent ? 'Removido dos Adolescentes' : 'Adicionado aos Adolescentes');
  };

  const handleSaveTeamMember = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentChurch) return;
      const payload: User = {
          id: editingUserId || '', name: teamFormData.name.toUpperCase(), username: teamFormData.username,
          cpf: teamFormData.cpf, role: teamFormData.role, churchId: currentChurch.id, password: teamFormData.password
      };
      if (editingUserId) {
          await updateUser(editingUserId, payload);
          if (teamFormData.password) await updateUserCredentials(editingUserId, undefined, teamFormData.password);
          showFeedback('Atualizado!');
      } else {
          const res = await addUser(payload);
          if (res.success) showFeedback('Adicionado!'); else showFeedback(res.error || 'Erro', 'error');
      }
      setTeamFormMode('LIST'); setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'LIDER_ADOLESCENTES', cpf: '' });
  };

  const teamUsers = users.filter(u => u.churchId === currentChurch?.id && ADOLESCENTS_ROLES.some(r => r.role === u.role));

  const memberSuggestions = members.filter(m => {
    if (m.churchId !== currentChurch?.id) return false;
    if (teamFormData.name.length < 2) return false;
    return m.name.toLowerCase().includes(teamFormData.name.toLowerCase());
  });

  const handleSelectMember = (member: Member) => {
    const firstName = member.name.split(' ')[0].toLowerCase();
    const suggestedUser = member.email ? member.email.split('@')[0] : firstName;
    setTeamFormData(prev => ({ ...prev, name: member.name, cpf: member.cpf, username: suggestedUser }));
    setShowSuggestions(false);
  };

  const renderDashboard = () => {
      const daysInMonth = new Date(dashYear, dashMonth, 0).getDate();

      const monthlyTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'ADOLESCENTES') return false;
          if (t.status !== 'PAGO') return false;
          const tDate = new Date(t.date + 'T12:00:00');
          return (tDate.getMonth() + 1) === dashMonth && tDate.getFullYear() === dashYear;
      });

      const monthlyIn = monthlyTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const monthlyOut = monthlyTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);

      const lastDayOfSelectedMonth = new Date(dashYear, dashMonth, 0).toISOString().split('T')[0];
      const cumulativeTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'ADOLESCENTES') return false;
          if (t.status !== 'PAGO') return false;
          return t.date <= lastDayOfSelectedMonth;
      });

      const totalInAllTime = cumulativeTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const totalOutAllTime = cumulativeTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const currentBalance = totalInAllTime - totalOutAllTime;

      const totalAdolescents = members.filter(m => m.churchId === currentChurch?.id && m.isAdolescent).length;

      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, entradas: 0, saidas: 0 }));

      monthlyTransactions.forEach(t => {
          const tDate = new Date(t.date + 'T12:00:00');
          const dayIndex = tDate.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
              if (t.type === 'ENTRADA') dailyData[dayIndex].entradas += t.amount;
              else dailyData[dayIndex].saidas += t.amount;
          }
      });

      return (
      <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <h2 className="text-lg font-bold text-gray-700">Visão Geral</h2>
              <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                  <div className="px-2 text-gray-400"><Calendar size={16}/></div>
                  <select value={dashMonth} onChange={(e) => setDashMonth(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer border-r border-gray-200">
                      {Array.from({length: 12}, (_, i) => (<option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()}</option>))}
                  </select>
                  <select value={dashYear} onChange={(e) => setDashYear(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer pl-2">
                      <option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option>
                  </select>
              </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-4 bg-white rounded-xl shadow-sm border-l-4 border-brand-black p-6 flex items-center justify-between relative overflow-hidden">
                  <div className="z-10">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Adolescentes</p>
                      <p className="text-4xl font-extrabold text-gray-800 mt-2">{totalAdolescents}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-full text-gray-700 z-10">
                      <BookOpen size={28} className="text-purple-600"/>
                  </div>
                  <div className="absolute -right-4 -bottom-4 text-gray-50 opacity-20 transform rotate-12">
                      <BookOpen size={100}/>
                  </div>
              </div>

              <div className="col-span-12 md:col-span-8 bg-white rounded-xl shadow-sm border-l-4 border-purple-500 p-6 flex flex-col justify-center relative overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 divide-x divide-gray-100 z-10">
                      <div className="text-center px-2 md:px-4">
                          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Entradas</p>
                          <p className="text-lg md:text-2xl font-black text-green-600">{formatCurrency(monthlyIn)}</p>
                      </div>
                      <div className="text-center px-2 md:px-4">
                          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saídas</p>
                          <p className="text-lg md:text-2xl font-black text-red-600">{formatCurrency(monthlyOut)}</p>
                      </div>
                      <div className="text-center px-2 md:px-4">
                          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Saldo</p>
                          <p className={`text-lg md:text-2xl font-black ${currentBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(currentBalance)}</p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                  <Globe className="mr-2 text-purple-600"/> Fluxo de Caixa Mensal ({new Date(0, dashMonth-1).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()} / {dashYear})
              </h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorEntradasAdol" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorSaidasAdol" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <XAxis dataKey="day" />
                          <YAxis tickFormatter={(value) => `R$${value}`}/>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} />
                          <Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradasAdol)" name="Entradas" />
                          <Area type="monotone" dataKey="saidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidasAdol)" name="Saídas" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
      );
  };

  const renderMembersTab = () => {
      const adolescentMembers = members.filter(m => m.churchId === currentChurch?.id && m.isAdolescent);
      const allMembers = members.filter(m => m.churchId === currentChurch?.id && m.name.toLowerCase().includes(memberSearch.toLowerCase()));

      return (
          <div className="bg-white p-6 rounded-xl shadow border">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center"><BookOpen className="mr-2"/> Departamento Adolescentes</h3>
              
              <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Adicionar / Buscar Adolescente</label>
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <input 
                          type="text" 
                          placeholder="Buscar por nome..." 
                          className="w-full pl-10 p-2 border rounded text-sm uppercase"
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value.toUpperCase())}
                      />
                  </div>
                  {memberSearch && (
                      <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-gray-50">
                          {allMembers.slice(0, 10).map(m => (
                              <div key={m.id} className="p-2 border-b flex justify-between items-center hover:bg-white">
                                  <span className="text-xs font-bold text-gray-700">{m.name}</span>
                                  <button 
                                      onClick={() => toggleAdolescentMember(m)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold ${m.isAdolescent ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                                  >
                                      {m.isAdolescent ? 'Remover' : 'Adicionar'}
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {adolescentMembers.map(m => (
                      <div key={m.id} className="p-3 border rounded-lg flex items-center gap-3 bg-gray-50">
                          <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                              {m.name.charAt(0)}
                          </div>
                          <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-gray-800 truncate">{m.name}</p>
                              <p className="text-[10px] text-gray-500">Nasc: {m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR') : '-'}</p>
                          </div>
                          <button onClick={() => toggleAdolescentMember(m)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                      </div>
                  ))}
                  {adolescentMembers.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Nenhum adolescente cadastrado.</p>}
              </div>
          </div>
      );
  };

  const renderTeamTab = () => (
      <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center text-lg"><Users size={24} className="mr-2 text-purple-600"/> Equipe Adolescentes</h3>
              {teamFormMode === 'LIST' && (
                  <button onClick={() => { setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'LIDER_ADOLESCENTES', cpf: '' }); setTeamFormMode('EDIT'); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow hover:bg-purple-700 transition-colors">
                      <PlusCircle size={16} className="mr-2"/> Adicionar
                  </button>
              )}
          </div>
          {teamFormMode === 'LIST' ? (
              <div className="space-y-3">
                  {teamUsers.map(u => (
                      <div key={u.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                              <div className="h-10 w-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 font-bold"><UserIcon size={20}/></div>
                              <div>
                                  <p className="text-sm font-bold text-gray-800">{u.name}</p>
                                  <p className="text-xs text-gray-500">@{u.username} • <span className="text-purple-600 font-semibold">{ADOLESCENTS_ROLES.find(r => r.role === u.role)?.label}</span></p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => { setEditingUserId(u.id); setTeamFormData({name: u.name, username: u.username, password: '', cpf: u.cpf, role: u.role as Role}); setTeamFormMode('EDIT'); }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"><Edit2 size={16}/></button>
                              <button onClick={() => deleteUser(u.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16}/></button>
                          </div>
                      </div>
                  ))}
                  {teamUsers.length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
                          <Users size={32} className="mx-auto text-gray-300 mb-2"/>
                          <p className="text-gray-500 text-sm">Nenhum membro na equipe de liderança.</p>
                      </div>
                  )}
              </div>
          ) : (
              <form onSubmit={handleSaveTeamMember} className="space-y-4 max-w-lg mx-auto bg-gray-50 p-6 rounded-xl border">
                  <h4 className="font-bold text-gray-700 border-b pb-2 mb-4">{editingUserId ? 'Editar Membro' : 'Novo Membro da Equipe'}</h4>
                  <div className="relative" ref={wrapperRef}>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Nome Completo</label>
                      <input required autoComplete="off" className="w-full p-2.5 border rounded-lg uppercase text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={teamFormData.name} onChange={e => { setTeamFormData({...teamFormData, name: e.target.value.toUpperCase()}); setShowSuggestions(true); }} placeholder="Nome do membro..."/>
                      {showSuggestions && memberSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                              {memberSuggestions.map(m => (
                                  <div key={m.id} onClick={() => handleSelectMember(m)} className="p-2 hover:bg-purple-50 cursor-pointer text-sm font-medium text-gray-700">{m.name}</div>
                              ))}
                          </div>
                      )}
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">CPF</label>
                      <input className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={teamFormData.cpf} onChange={e => setTeamFormData({...teamFormData, cpf: e.target.value})} placeholder="000.000.000-00"/>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Usuário (login)</label>
                      <input required className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={teamFormData.username} onChange={e => setTeamFormData({...teamFormData, username: e.target.value})} placeholder="usuario"/>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Senha {editingUserId && '(deixe em branco para não alterar)'}</label>
                      <input type="password" className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={teamFormData.password} onChange={e => setTeamFormData({...teamFormData, password: e.target.value})} placeholder="••••••"/>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Função</label>
                      <select className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" value={teamFormData.role} onChange={e => setTeamFormData({...teamFormData, role: e.target.value as Role})}>
                          {ADOLESCENTS_ROLES.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center"><Save size={16} className="mr-2"/> Salvar</button>
                      <button type="button" onClick={() => { setTeamFormMode('LIST'); setEditingUserId(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition-colors">Cancelar</button>
                  </div>
              </form>
          )}
      </div>
  );

  const renderReports = () => {
      const filteredReportTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'ADOLESCENTES') return false;
          if (t.status !== 'PAGO') return false; 

          if (reportFilterType === 'MONTH') {
              const tDate = new Date(t.date + 'T12:00:00');
              return (tDate.getMonth() + 1) === repMonth && tDate.getFullYear() === repYear;
          } else {
              return t.date >= appliedRepStart && t.date <= appliedRepEnd;
          }
      });

      const totalIn = filteredReportTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const totalOut = filteredReportTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const repBalance = totalIn - totalOut;

      const inflows = filteredReportTransactions.filter(t => t.type === 'ENTRADA');
      const outflows = filteredReportTransactions.filter(t => t.type === 'SAIDA');

      const handleGeneratePDF = () => {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Relatório - Departamento Adolescentes', 14, 20);
          doc.setFontSize(10);
          doc.text(`Igreja: ${currentChurch?.name || ''}`, 14, 30);
          const filterLabel = reportFilterType === 'MONTH'
              ? `${new Date(0, repMonth-1).toLocaleString('pt-BR', {month: 'long'})} / ${repYear}`
              : `${appliedRepStart} a ${appliedRepEnd}`;
          doc.text(`Período: ${filterLabel}`, 14, 37);
          doc.text(`Total Entradas: ${formatCurrency(totalIn)}   Total Saídas: ${formatCurrency(totalOut)}   Saldo: ${formatCurrency(repBalance)}`, 14, 44);

          if (reportViewMode === 'DETAILED') {
              autoTable(doc, {
                  startY: 52,
                  head: [['Data', 'Descrição', 'Tipo', 'Valor']],
                  body: filteredReportTransactions.map(t => [
                      new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR'),
                      t.description,
                      t.type === 'ENTRADA' ? 'Entrada' : 'Saída',
                      formatCurrency(t.amount)
                  ]),
              });
          } else {
              autoTable(doc, {
                  startY: 52,
                  head: [['', 'Total']],
                  body: [
                      ['Total Entradas', formatCurrency(totalIn)],
                      ['Total Saídas', formatCurrency(totalOut)],
                      ['Saldo', formatCurrency(repBalance)],
                  ],
              });
          }
          doc.save(`relatorio-adolescentes-${Date.now()}.pdf`);
      };

      return (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow border">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h3 className="font-bold text-gray-700 flex items-center"><FileText className="mr-2 text-purple-600"/> Relatórios Adolescentes</h3>
                      <button onClick={handleGeneratePDF} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow hover:bg-purple-700 transition-colors">
                          <Download size={16} className="mr-2"/> Exportar PDF
                      </button>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-xl border">
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Filtrar por</label>
                          <div className="flex gap-2">
                              <button onClick={() => setReportFilterType('MONTH')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${reportFilterType === 'MONTH' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>Mês</button>
                              <button onClick={() => setReportFilterType('PERIOD')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${reportFilterType === 'PERIOD' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>Período</button>
                          </div>
                      </div>
                      {reportFilterType === 'MONTH' ? (
                          <>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 block mb-1">Mês</label>
                                  <select value={repMonth} onChange={e => setRepMonth(parseInt(e.target.value))} className="p-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                      {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 block mb-1">Ano</label>
                                  <select value={repYear} onChange={e => setRepYear(parseInt(e.target.value))} className="p-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                                      <option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option>
                                  </select>
                              </div>
                          </>
                      ) : (
                          <>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 block mb-1">Data Início</label>
                                  <input type="date" value={repStartDate} onChange={e => setRepStartDate(e.target.value)} className="p-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"/>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 block mb-1">Data Fim</label>
                                  <input type="date" value={repEndDate} onChange={e => setRepEndDate(e.target.value)} className="p-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"/>
                              </div>
                              <div className="flex items-end">
                                  <button onClick={() => { setAppliedRepStart(repStartDate); setAppliedRepEnd(repEndDate); }} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1"><Filter size={12}/> Aplicar</button>
                              </div>
                          </>
                      )}
                      <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">Visualização</label>
                          <div className="flex gap-2">
                              <button onClick={() => setReportViewMode('DETAILED')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${reportViewMode === 'DETAILED' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>Detalhado</button>
                              <button onClick={() => setReportViewMode('SUMMARY')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${reportViewMode === 'SUMMARY' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}>Resumo</button>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                          <p className="text-xs font-bold text-green-600 uppercase">Entradas</p>
                          <p className="text-xl font-black text-green-700">{formatCurrency(totalIn)}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                          <p className="text-xs font-bold text-red-600 uppercase">Saídas</p>
                          <p className="text-xl font-black text-red-700">{formatCurrency(totalOut)}</p>
                      </div>
                      <div className={`border rounded-xl p-4 text-center ${repBalance >= 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                          <p className="text-xs font-bold text-gray-500 uppercase">Saldo</p>
                          <p className={`text-xl font-black ${repBalance >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{formatCurrency(repBalance)}</p>
                      </div>
                  </div>

                  {reportViewMode === 'DETAILED' ? (
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                              <thead><tr className="bg-gray-50 border-b"><th className="p-3 text-left text-xs font-bold text-gray-500">DATA</th><th className="p-3 text-left text-xs font-bold text-gray-500">DESCRIÇÃO</th><th className="p-3 text-left text-xs font-bold text-gray-500">TIPO</th><th className="p-3 text-right text-xs font-bold text-gray-500">VALOR</th><th className="p-3"></th></tr></thead>
                              <tbody>
                                  {filteredReportTransactions.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum lançamento no período.</td></tr>}
                                  {filteredReportTransactions.map(t => (
                                      <tr key={t.id} className="border-b hover:bg-gray-50">
                                          <td className="p-3 text-gray-600">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                          <td className="p-3 font-medium text-gray-800">{t.description}</td>
                                          <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td>
                                          <td className={`p-3 text-right font-bold ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                                          <td className="p-3 text-right"><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200"><span className="font-bold text-green-700">Total de Entradas</span><span className="font-black text-green-700 text-lg">{formatCurrency(totalIn)}</span></div>
                          <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-200"><span className="font-bold text-red-700">Total de Saídas</span><span className="font-black text-red-700 text-lg">{formatCurrency(totalOut)}</span></div>
                          <div className={`flex justify-between items-center p-4 rounded-lg border ${repBalance >= 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}><span className="font-bold text-gray-700">Saldo do Período</span><span className={`font-black text-lg ${repBalance >= 0 ? 'text-gray-800' : 'text-red-700'}`}>{formatCurrency(repBalance)}</span></div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderCaixaTab = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                  <button onClick={() => { setSubTab('LISTA'); }} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'LISTA' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300'}`}><History size={14} className="inline mr-1"/>Histórico</button>
                  <button onClick={() => { setSubTab('ENTRADA'); setTransType('ENTRADA'); }} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'ENTRADA' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300'}`}><PlusCircle size={14} className="inline mr-1"/>Entrada</button>
                  <button onClick={() => { setSubTab('SAIDA'); setTransType('SAIDA'); }} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${subTab === 'SAIDA' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300'}`}><MinusCircle size={14} className="inline mr-1"/>Saída</button>
              </div>
              {subTab === 'LISTA' && (
                  <div className="flex items-center gap-2">
                      <select value={historyMonth} onChange={e => setHistoryMonth(parseInt(e.target.value))} className="p-1.5 border rounded text-sm">
                          {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'})}</option>)}
                      </select>
                      <select value={historyYear} onChange={e => setHistoryYear(parseInt(e.target.value))} className="p-1.5 border rounded text-sm">
                          <option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option>
                      </select>
                  </div>
              )}
          </div>

          {subTab === 'LISTA' && (
              <div className="bg-white rounded-xl shadow border overflow-hidden">
                  <table className="w-full text-sm">
                      <thead><tr className="bg-gray-50 border-b"><th className="p-3 text-left text-xs font-bold text-gray-500">DATA</th><th className="p-3 text-left text-xs font-bold text-gray-500">DESCRIÇÃO</th><th className="p-3 text-right text-xs font-bold text-gray-500">VALOR</th><th className="p-3"></th></tr></thead>
                      <tbody>
                          {historyTransactions.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum lançamento neste mês.</td></tr>}
                          {historyTransactions.map(t => (
                              <tr key={t.id} className="border-b hover:bg-gray-50">
                                  <td className="p-3 text-gray-600">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                  <td className="p-3 font-medium text-gray-800">{t.description}</td>
                                  <td className={`p-3 text-right font-bold ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'SAIDA' ? '-' : ''}{formatCurrency(t.amount)}</td>
                                  <td className="p-3 text-right"><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}

          {(subTab === 'ENTRADA' || subTab === 'SAIDA') && (
              <div className="bg-white rounded-xl shadow border p-6 max-w-lg mx-auto">
                  <h3 className={`font-bold text-lg mb-4 ${subTab === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}`}>
                      {subTab === 'ENTRADA' ? <><PlusCircle className="inline mr-2"/>Nova Entrada</> : <><MinusCircle className="inline mr-2"/>Nova Saída</>}
                  </h3>
                  <form onSubmit={handleTransactionSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Valor (R$)</label>
                          <input required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0,00"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Descrição</label>
                          <input type="text" value={desc} onChange={e => setDesc(e.target.value.toUpperCase())} className="w-full p-2.5 border rounded-lg text-sm uppercase focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Descrição..."/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Data</label>
                          <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"/>
                      </div>
                      {subTab === 'SAIDA' && (
                          <div className="flex items-center gap-2">
                              <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded"/>
                              <label htmlFor="recurring" className="text-sm text-gray-600">Despesa fixa (mensal)</label>
                          </div>
                      )}
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Anexo (opcional)</label>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/>
                          {selectedFile && <p className="text-xs text-gray-500 mt-1">Arquivo: {selectedFile.name}</p>}
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button type="submit" disabled={isSubmitting} className={`flex-1 py-2.5 rounded-lg font-bold text-white transition-colors flex items-center justify-center ${subTab === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}>
                              {isSubmitting ? <Loader size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Salvar
                          </button>
                          <button type="button" onClick={handleCancelForm} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition-colors">Cancelar</button>
                      </div>
                  </form>
              </div>
          )}
      </div>
  );

  if (viewMode === 'SELECTION') {
      return (
          <div className="flex items-center justify-center h-[60vh]">
              <div className="text-center">
                  <BookOpen size={64} className="mx-auto text-purple-300 mb-4"/>
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">Departamento Adolescentes</h2>
                  <p className="text-gray-500 mb-6">Você não possui acesso a este painel.</p>
              </div>
          </div>
      );
  }

  return (
      <div className="space-y-6 animate-fade-in">
          {modal.show && (
              <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg font-bold text-white flex items-center gap-2 transition-all ${modal.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {modal.type === 'success' ? <CheckCircle size={18}/> : <X size={18}/>} {modal.msg}
              </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                  <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                      <BookOpen className="mr-3 text-purple-600"/> Departamento Adolescentes
                  </h1>
                  <p className="text-gray-500 mt-1">{currentChurch?.name}</p>
              </div>
          </div>

          <div className="border-b border-gray-200">
              <nav className="-mb-px flex gap-1 overflow-x-auto">
                  {[
                      { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
                      { id: 'CAIXA', label: 'Caixa', icon: DollarSign },
                      { id: 'MEMBROS', label: 'Membros', icon: Users },
                      { id: 'RELATORIOS', label: 'Relatórios', icon: FileText },
                      { id: 'EQUIPE', label: 'Equipe', icon: UserIcon },
                  ].map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                              activeTab === tab.id
                                  ? 'border-purple-600 text-purple-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                          <tab.icon size={16}/> {tab.label}
                      </button>
                  ))}
              </nav>
          </div>

          <div>
              {activeTab === 'DASHBOARD' && renderDashboard()}
              {activeTab === 'CAIXA' && renderCaixaTab()}
              {activeTab === 'MEMBROS' && renderMembersTab()}
              {activeTab === 'RELATORIOS' && renderReports()}
              {activeTab === 'EQUIPE' && renderTeamTab()}
          </div>
      </div>
  );
};
