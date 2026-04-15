import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, DollarSign,
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

const MEN_ROLES: {role: Role, label: string}[] = [
    { role: 'LIDER_SENHORES', label: 'Líder de Senhores' },
    { role: 'TESOUREIRO_SENHORES', label: 'Tesoureiro(a) de Senhores' }
];

export const MenPanel: React.FC = () => {
  const { 
      user, currentChurch, transactions, members, users,
      addTransaction, deleteTransaction, 
      uploadTransactionFile,
      addUser, updateUser, deleteUser, updateUserCredentials, updateMember,
      addFixedExpense
  } = useApp();
  const location = useLocation();
  
  const isMenRole = user && (['LIDER_SENHORES', 'TESOUREIRO_SENHORES'].includes(user.role) || ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'].includes(user.role));

  const [viewMode, setViewMode] = useState<'SELECTION' | 'DASHBOARD'>(isMenRole ? 'DASHBOARD' : 'SELECTION');
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
  const [teamFormData, setTeamFormData] = useState({ name: '', username: '', password: '', role: 'LIDER_SENHORES' as Role, cpf: '' });
  
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
      if (t.category !== 'SENHORES') return false; 
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
              dueDay: day, category: 'SENHORES', autoGenerate: true, active: true
          });
      }

      await addTransaction({
          id: '', churchId: currentChurch.id, type: transType, category: 'SENHORES', amount: parseFloat(amount),
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

  const toggleBrotherMember = async (member: Member) => {
      await updateMember(member.id, { ...member, isBrother: !member.isBrother });
      showFeedback(member.isBrother ? 'Removido da Sociedade de Homens' : 'Adicionado à Sociedade de Homens');
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
      setTeamFormMode('LIST'); setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'LIDER_SENHORES', cpf: '' });
  };

  const teamUsers = users.filter(u => u.churchId === currentChurch?.id && MEN_ROLES.some(r => r.role === u.role));

  const memberSuggestions = members.filter(m => {
    if (m.churchId !== currentChurch?.id) return false;
    if (teamFormData.name.length < 2) return false; 
    return m.name.toLowerCase().includes(teamFormData.name.toLowerCase());
  });

  const handleSelectMember = (member: Member) => {
    const firstName = member.name.split(' ')[0].toLowerCase();
    const suggestedUser = member.email ? member.email.split('@')[0] : firstName;
    
    setTeamFormData(prev => ({
      ...prev,
      name: member.name,
      cpf: member.cpf,
      username: suggestedUser
    }));
    setShowSuggestions(false);
  };

  const renderDashboard = () => {
      const daysInMonth = new Date(dashYear, dashMonth, 0).getDate();

      const monthlyTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'SENHORES') return false;
          if (t.status !== 'PAGO') return false;
          const tDate = new Date(t.date + 'T12:00:00');
          return (tDate.getMonth() + 1) === dashMonth && tDate.getFullYear() === dashYear;
      });

      const monthlyIn = monthlyTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const monthlyOut = monthlyTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);

      const lastDayOfSelectedMonth = new Date(dashYear, dashMonth, 0).toISOString().split('T')[0];
      const cumulativeTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'SENHORES') return false;
          if (t.status !== 'PAGO') return false;
          return t.date <= lastDayOfSelectedMonth;
      });

      const totalInAllTime = cumulativeTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const totalOutAllTime = cumulativeTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const currentBalance = totalInAllTime - totalOutAllTime;

      const totalMen = members.filter(m => m.churchId === currentChurch?.id && m.isBrother).length;

      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
          day: i + 1,
          entradas: 0,
          saidas: 0
      }));

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
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total de Senhores</p>
                      <p className="text-4xl font-extrabold text-gray-800 mt-2">{totalMen}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded-full text-gray-700 z-10">
                      <Shield size={28} className="text-blue-600"/>
                  </div>
                  <div className="absolute -right-4 -bottom-4 text-gray-50 opacity-20 transform rotate-12">
                      <Shield size={100}/>
                  </div>
              </div>

              <div className="col-span-12 md:col-span-8 bg-white rounded-xl shadow-sm border-l-4 border-blue-500 p-6 flex flex-col justify-center relative overflow-hidden">
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
                          <p className={`text-lg md:text-2xl font-black ${currentBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                              {formatCurrency(currentBalance)}
                          </p>
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                  <Globe className="mr-2 text-teal-600"/> Fluxo de Caixa Mensal ({new Date(0, dashMonth-1).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()} / {dashYear})
              </h3>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorEntradasMen" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorSaidasMen" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <XAxis dataKey="day" />
                          <YAxis tickFormatter={(value) => `R$${value}`}/>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} />
                          <Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradasMen)" name="Entradas" />
                          <Area type="monotone" dataKey="saidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidasMen)" name="Saídas" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
      );
  };

  const renderMembersTab = () => {
      const brotherMembers = members.filter(m => m.churchId === currentChurch?.id && m.isBrother);
      const allMembers = members.filter(m => m.churchId === currentChurch?.id && m.name.toLowerCase().includes(memberSearch.toLowerCase()));

      return (
          <div className="bg-white p-6 rounded-xl shadow border">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Shield className="mr-2"/> Sociedade de Homens</h3>
              
              <div className="mb-6">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Adicionar / Buscar Irmão</label>
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
                                      onClick={() => toggleBrotherMember(m)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold ${m.isBrother ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}
                                  >
                                      {m.isBrother ? 'Remover' : 'Adicionar'}
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brotherMembers.map(m => (
                      <div key={m.id} className="p-3 border rounded-lg flex items-center gap-3 bg-gray-50">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                              {m.name.charAt(0)}
                          </div>
                          <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-gray-800 truncate">{m.name}</p>
                              <p className="text-[10px] text-gray-500">{m.phone || 'Sem telefone'}</p>
                          </div>
                          <button onClick={() => toggleBrotherMember(m)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                      </div>
                  ))}
                  {brotherMembers.length === 0 && <p className="col-span-full text-center text-gray-400 py-4">Nenhum irmão cadastrado.</p>}
              </div>
          </div>
      );
  };

  const renderTeamTab = () => (
      <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center text-lg"><Users size={24} className="mr-2 text-blue-600"/> Equipe de Senhores</h3>
              {teamFormMode === 'LIST' && (
                  <button onClick={() => { setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'LIDER_SENHORES', cpf: '' }); setTeamFormMode('EDIT'); }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow hover:bg-blue-700 transition-colors">
                      <PlusCircle size={16} className="mr-2"/> Adicionar
                  </button>
              )}
          </div>
          
          {teamFormMode === 'LIST' ? (
              <div className="space-y-3">
                  {teamUsers.map(u => (
                      <div key={u.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center">
                              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 font-bold">
                                  <UserIcon size={20}/>
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-gray-800">{u.name}</p>
                                  <p className="text-xs text-gray-500">@{u.username} • <span className="text-blue-600 font-semibold">{MEN_ROLES.find(r => r.role === u.role)?.label}</span></p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => { setEditingUserId(u.id); setTeamFormData({name: u.name, username: u.username, password: '', cpf: u.cpf, role: u.role as Role}); setTeamFormMode('EDIT'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit2 size={16}/></button>
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
                      <input 
                        required 
                        autoComplete="off"
                        className="w-full p-2.5 border rounded-lg uppercase text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        value={teamFormData.name} 
                        onChange={e => {
                            setTeamFormData({...teamFormData, name: e.target.value.toUpperCase()});
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                      />
                      {showSuggestions && teamFormData.name.length >= 2 && memberSuggestions.length > 0 && !editingUserId && (
                        <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                          {memberSuggestions.map((member) => (
                            <div 
                              key={member.id}
                              onClick={() => handleSelectMember(member)}
                              className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-gray-800 text-xs">{member.name}</p>
                                <p className="text-[10px] text-gray-500">CPF: {member.cpf}</p>
                              </div>
                              <PlusCircle size={14} className="text-blue-600" />
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Cargo</label>
                      <select className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={teamFormData.role} onChange={e => setTeamFormData({...teamFormData, role: e.target.value as Role})}>
                          {MEN_ROLES.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Usuário (Login)</label>
                          <input className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required value={teamFormData.username} onChange={e => setTeamFormData({...teamFormData, username: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Senha {editingUserId && '(Opcional)'}</label>
                          <div className="relative">
                              <Key size={14} className="absolute left-3 top-3 text-gray-400"/>
                              <input 
                                  type="password" 
                                  className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                  value={teamFormData.password} 
                                  onChange={e => setTeamFormData({...teamFormData, password: e.target.value})} 
                                  required={!editingUserId}
                                  placeholder={editingUserId ? "Manter atual" : ""}
                              />
                          </div>
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">CPF (Opcional)</label>
                      <input className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={teamFormData.cpf} onChange={e => setTeamFormData({...teamFormData, cpf: e.target.value})} maxLength={14} placeholder="000.000.000-00"/>
                  </div>
                  <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setTeamFormMode('LIST')} className="flex-1 py-2.5 border rounded-lg text-sm font-bold text-gray-600 hover:bg-white transition-colors">Cancelar</button>
                      <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-md">Salvar Membro</button>
                  </div>
              </form>
          )}
      </div>
  );

  const renderReports = () => {
      const filteredReportTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'SENHORES') return false;
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

      const applyDateFilter = () => {
          setAppliedRepStart(repStartDate);
          setAppliedRepEnd(repEndDate);
      };

      const generatePDFReport = () => {
        const doc = new jsPDF();
        const periodText = reportFilterType === 'MONTH' 
            ? `${repMonth.toString().padStart(2, '0')}/${repYear}` 
            : `${new Date(appliedRepStart).toLocaleDateString()} a ${new Date(appliedRepEnd).toLocaleDateString()}`;
        
        doc.setFontSize(18);
        doc.text("Relatório de Senhores", 14, 20);
        doc.setFontSize(10);
        doc.text(`Período: ${periodText}`, 14, 26);
        doc.text(`Unidade: ${currentChurch?.name}`, 14, 32);

        if (reportViewMode === 'SUMMARY') {
            autoTable(doc, {
                startY: 40,
                head: [['Tipo', 'Valor']],
                body: [
                    ['Entradas', totalIn.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})],
                    ['Saídas', totalOut.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})],
                    ['Saldo Final', repBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})]
                ]
            });
        } else {
             autoTable(doc, {
                startY: 40,
                head: [['Data', 'Descrição', 'Tipo', 'Valor']],
                body: filteredReportTransactions.map(t => [
                    new Date(t.date).toLocaleDateString('pt-BR'),
                    t.description,
                    t.type,
                    t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
                ])
            });
            
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.text(`Total Entradas: ${totalIn.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY);
            doc.text(`Total Saídas: ${totalOut.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY + 6);
            doc.text(`Saldo: ${repBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY + 12);
        }

        doc.save(`Relatorio_Senhores_${periodText.replace(/\//g, '-')}.pdf`);
    };

      return (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-md flex flex-col gap-6 border border-gray-100">
                  <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                      <div>
                          <h2 className="text-2xl font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-brand-orange"/> Relatórios</h2>
                          <p className="text-gray-500 text-sm">Unidade: <span className="font-semibold">{currentChurch?.name}</span></p>
                      </div>
                      
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button onClick={() => setReportViewMode('DETAILED')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'DETAILED' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}><FileText size={16} className="mr-2"/> Detalhado</button>
                          <button onClick={() => setReportViewMode('SUMMARY')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'SUMMARY' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}><PieChart size={16} className="mr-2"/> Resumido</button>
                      </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 w-full border-t pt-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-fit h-fit">
                       <button onClick={() => setReportFilterType('MONTH')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${reportFilterType === 'MONTH' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Mensal</button>
                       <button onClick={() => setReportFilterType('PERIOD')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${reportFilterType === 'PERIOD' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Por Período</button>
                    </div>

                    <div className="flex flex-1 gap-2 items-center flex-wrap md:flex-nowrap">
                       {reportFilterType === 'MONTH' ? (
                          <>
                            <select value={repMonth} onChange={e => setRepMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>))}</select>
                            <select value={repYear} onChange={e => setRepYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]"><option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select>
                          </>
                       ) : (
                          <div className="flex items-center gap-2 w-full flex-wrap md:flex-nowrap">
                              <div className="relative w-full md:w-auto flex-1"><span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">De</span><input type="date" className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]" value={repStartDate} onChange={e => setRepStartDate(e.target.value)}/></div>
                              <div className="relative w-full md:w-auto flex-1"><span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">Até</span><input type="date" className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]" value={repEndDate} onChange={e => setRepEndDate(e.target.value)}/></div>
                              <button onClick={applyDateFilter} className="bg-brand-orange text-white px-4 h-[42px] rounded-lg font-bold text-sm hover:bg-brand-red flex items-center shadow-lg w-full md:w-auto justify-center"><Search size={16} className="mr-1"/> Pesquisar</button>
                          </div>
                       )}
                       
                       <button onClick={generatePDFReport} className="w-full md:w-auto ml-auto bg-brand-black text-white px-6 h-[42px] rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center justify-center shadow-lg transition-transform hover:scale-105"><Download size={16} className="mr-2"/> Baixar PDF {reportViewMode === 'DETAILED' ? 'Detalhado' : 'Resumido'}</button>
                    </div>
                  </div>
              </div>

              <div className="border-t-4 border-brand-orange rounded-t-xl bg-white shadow-lg p-6">
                  <div className="text-center mb-8">
                      <h3 className="text-xl font-extrabold text-gray-800 uppercase tracking-wide">RELATÓRIO FINANCEIRO {reportViewMode === 'DETAILED' ? 'DETALHADO' : 'RESUMIDO'}</h3>
                      <div className="inline-block bg-orange-50 text-brand-orange px-4 py-1 rounded-full text-xs font-bold mt-2 border border-orange-100"><Calendar size={12} className="inline mr-1"/> {reportFilterType === 'MONTH' ? `${repMonth.toString().padStart(2, '0')}/${repYear}` : `${new Date(appliedRepStart).toLocaleDateString()} - ${new Date(appliedRepEnd).toLocaleDateString()}`}</div>
                  </div>

                  {reportViewMode === 'DETAILED' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                              <div className="flex items-center mb-4 text-green-700 font-bold border-b pb-2 border-green-100"><TrendingUp className="mr-2"/> Entradas Detalhadas</div>
                              <div className="space-y-4">
                                  <div className="border rounded-lg overflow-hidden">
                                      <div className="bg-green-50 p-3 flex justify-between items-center border-b border-green-100"><span className="font-bold text-green-800 text-sm">Entradas de Senhores</span><span className="text-xs font-bold text-green-600">Total: {formatCurrency(totalIn)}</span></div>
                                      <div className="bg-white">
                                          <table className="w-full text-left"><thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold"><tr><th className="p-2 w-20">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right w-24">Valor</th></tr></thead><tbody className="divide-y divide-gray-100">{inflows.map(t => (<tr key={t.id} className="text-xs hover:bg-gray-50"><td className="p-2 text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td><td className="p-2 font-medium text-gray-800">{t.description}</td><td className="p-2 text-right font-bold text-green-600">{formatCurrency(t.amount)}</td></tr>))}{inflows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400 text-xs">Nenhum registro encontrado.</td></tr>}</tbody></table>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div>
                              <div className="flex items-center mb-4 text-red-700 font-bold border-b pb-2 border-red-100"><TrendingDown className="mr-2"/> Saídas Detalhadas</div>
                              <div className="space-y-4">
                                  <div className="border rounded-lg overflow-hidden">
                                      <div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100"><span className="font-bold text-red-800 text-sm">Saídas de Senhores</span><span className="text-xs font-bold text-red-600">Total: {formatCurrency(totalOut)}</span></div>
                                      <div className="bg-white">
                                          <table className="w-full text-left"><thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold"><tr><th className="p-2 w-20">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right w-24">Valor</th></tr></thead><tbody className="divide-y divide-gray-100">{outflows.map(t => (<tr key={t.id} className="text-xs hover:bg-gray-50"><td className="p-2 text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td><td className="p-2 font-medium text-gray-800">{t.description}</td><td className="p-2 text-right font-bold text-red-600">{formatCurrency(t.amount)}</td></tr>))}{outflows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400 text-xs">Nenhum registro encontrado.</td></tr>}</tbody></table>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-green-50 p-6 rounded-lg border border-green-100"><p className="text-xs font-bold text-green-700 uppercase mb-2">Total de Entradas</p><p className="text-3xl font-black text-green-600">{formatCurrency(totalIn)}</p></div>
                          <div className="bg-red-50 p-6 rounded-lg border border-red-100"><p className="text-xs font-bold text-red-700 uppercase mb-2">Total de Saídas</p><p className="text-3xl font-black text-red-600">{formatCurrency(totalOut)}</p></div>
                          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-600 uppercase mb-2">Saldo Final</p><p className={`text-3xl font-black ${repBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(repBalance)}</p></div>
                      </div>
                  )}
                  {reportViewMode === 'DETAILED' && (
                      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div className="bg-green-100 p-4 rounded-lg flex justify-between items-center border border-green-200"><span className="font-bold text-green-800 text-sm uppercase">Total Entradas</span><span className="font-black text-green-900 text-lg">{formatCurrency(totalIn)}</span></div>
                          <div className="bg-red-100 p-4 rounded-lg flex justify-between items-center border border-red-200"><span className="font-bold text-red-800 text-sm uppercase">Total Saídas</span><span className="font-black text-red-900 text-lg">{formatCurrency(totalOut)}</span></div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <>
        {modal.show && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-bold ${modal.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{modal.msg}</div>}
        
        <div className="space-y-6">
            {activeTab === 'DASHBOARD' && renderDashboard()}
            {activeTab === 'MEMBROS' && renderMembersTab()}
            {activeTab === 'CAIXA' && (
                <div className="w-full space-y-3 md:space-y-6">
                    <div className="flex flex-col md:flex-row gap-2 mb-2 md:mb-8">
                        <div className="flex-1 flex gap-2">
                            <button onClick={() => { handleCancelForm(); setSubTab('LISTA'); }} className={`flex-1 py-2 md:py-4 rounded-lg font-bold text-xs md:text-base transition-colors ${subTab === 'LISTA' ? 'bg-brand-black text-white' : 'bg-white text-gray-500 border'}`}>Extrato</button>
                        </div>
                        <div className="flex gap-2 flex-1">
                            <button onClick={() => { setSubTab('ENTRADA'); setTransType('ENTRADA'); handleCancelForm(); setSubTab('ENTRADA'); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base transition-colors ${subTab === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200'}`}><PlusCircle size={14} /> Entrada</button>
                            <button onClick={() => { setSubTab('SAIDA'); setTransType('SAIDA'); handleCancelForm(); setSubTab('SAIDA'); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base transition-colors ${subTab === 'SAIDA' ? 'bg-brand-red text-white' : 'bg-white text-brand-red border border-red-200'}`}><MinusCircle size={14} /> Saída</button>
                        </div>
                    </div>

                    {subTab === 'LISTA' && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold border bg-gray-50 text-gray-600"><Filter size={14} /> <span>Filtros</span></div>
                                <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-0.5">
                                    <select value={historyMonth} onChange={e => setHistoryMonth(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer outline-none">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>))}</select>
                                    <select value={historyYear} onChange={e => setHistoryYear(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer outline-none"><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                                <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Data</th><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Desc</th><th className="hidden md:table-cell px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Cat</th><th className="px-2 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">Valor</th><th className="px-1 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">.</th></tr></thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                    {historyTransactions.map(t => {
                                        const [year, month, day] = t.date.split('-').map(Number);
                                        const displayDate = new Date(year, month - 1, day).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                                        return (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-2 py-2 text-[10px] text-gray-600 whitespace-nowrap">{displayDate}</td>
                                        <td className="px-2 py-2 text-[10px] font-medium text-gray-900 truncate max-w-[100px] md:max-w-none uppercase">{t.description}</td>
                                        <td className="hidden md:table-cell px-2 py-2 text-xs"><span className={`px-1 rounded text-[10px] font-bold ${t.type === 'ENTRADA' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{t.category}</span></td>
                                        <td className={`px-2 py-2 text-[10px] font-bold text-right whitespace-nowrap ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-brand-red'}`}>{t.type === 'ENTRADA' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                                        <td className="px-1 py-2 text-right whitespace-nowrap"><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                                        </tr>
                                    )})}
                                    {historyTransactions.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400 text-xs">Sem lançamentos neste período.</td></tr>}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'ENTRADA' && (
                        <div className="bg-white rounded-xl shadow-md p-3 md:p-8 animate-fade-in-down">
                            <h2 className="text-lg md:text-2xl font-bold mb-4 flex items-center">Nova Receita</h2>
                            <form onSubmit={handleTransactionSubmit} className="space-y-4">
                                <div><label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Tipo de Entrada</label><div className="flex gap-2"><button type="button" className="flex-1 py-2 px-1 rounded border text-[10px] md:text-xs font-bold bg-green-600 text-white border-green-600">ENTRADA</button></div></div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                    <input type="number" step="0.01" min="0.01" required className="w-full p-2 md:p-3 border rounded-lg text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"/>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                    <input type="text" className="w-full p-2 md:p-3 border rounded-lg uppercase text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: OFERTA DE SENHORES"/>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Data</label>
                                    <input type="date" required className="w-full p-2 md:p-3 border rounded-lg text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={date} onChange={e => setDate(e.target.value)}/>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Comprovante (Opcional)</label>
                                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={handleFileChange}/>
                                    {selectedFile && <p className="text-xs text-green-600 mt-1">Arquivo: {selectedFile.name}</p>}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleCancelForm} className="flex-1 py-2 md:py-3 border rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2 md:py-3 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? <Loader size={16} className="animate-spin"/> : <><Save size={16}/> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {subTab === 'SAIDA' && (
                        <div className="bg-white rounded-xl shadow-md p-3 md:p-8 animate-fade-in-down">
                            <h2 className="text-lg md:text-2xl font-bold mb-4 flex items-center">Nova Despesa</h2>
                            <form onSubmit={handleTransactionSubmit} className="space-y-4">
                                <div><label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Tipo de Saída</label><div className="flex gap-2"><button type="button" className="flex-1 py-2 px-1 rounded border text-[10px] md:text-xs font-bold bg-red-600 text-white border-red-600">SAÍDA</button></div></div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                    <input type="number" step="0.01" min="0.01" required className="w-full p-2 md:p-3 border rounded-lg text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"/>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                    <input type="text" className="w-full p-2 md:p-3 border rounded-lg uppercase text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: DESPESA DE SENHORES"/>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Data</label>
                                    <input type="date" required className="w-full p-2 md:p-3 border rounded-lg text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none" value={date} onChange={e => setDate(e.target.value)}/>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                    <input type="checkbox" id="recurring-men" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                                    <label htmlFor="recurring-men" className="text-sm font-medium text-gray-700 cursor-pointer">Despesa Fixa (recorrente mensal)</label>
                                </div>
                                <div>
                                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Comprovante (Opcional)</label>
                                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={handleFileChange}/>
                                    {selectedFile && <p className="text-xs text-green-600 mt-1">Arquivo: {selectedFile.name}</p>}
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleCancelForm} className="flex-1 py-2 md:py-3 border rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-2 md:py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? <Loader size={16} className="animate-spin"/> : <><Save size={16}/> Salvar</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'EQUIPE' && renderTeamTab()}
            {activeTab === 'RELATORIOS' && renderReports()}
        </div>
    </>
  );
};
