
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { TransactionCategory, Transaction, FixedExpense } from '../types';
import { 
  PlusCircle, MinusCircle, Search, CheckCircle, ShieldAlert, X, 
  Paperclip, ExternalLink, Trash2, Upload, Loader, Filter, 
  Calendar, Edit2, AlertTriangle, Info, ChevronDown, ChevronUp, Globe,
  Receipt, PlayCircle, Save, RefreshCw, Clock
} from 'lucide-react';

export const Finance: React.FC = () => {
  const { 
    addTransaction, updateTransaction, deleteTransaction, uploadTransactionFile, confirmTransactionPayment,
    addFixedExpense, generateMonthlyFixedExpenses,
    members, user, transactions, currentChurch, updateMember, fixedExpenses
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'ENTRADA' | 'SAIDA' | 'LISTA'>('LISTA');
  
  // Filter States for LIST view
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  // Removed 'PENDENTE' from type
  const [filterType, setFilterType] = useState<'TODOS' | 'DIZIMO' | 'OFERTA' | 'SAIDA' | 'OUTROS'>('TODOS');
  const [showFilters, setShowFilters] = useState(false);

  // Editing State
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Transaction Form State
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [missionRecipient, setMissionRecipient] = useState(''); 
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isRecurring, setIsRecurring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATE ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'success' | 'info'; showCancel: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'info', showCancel: false, onConfirm: undefined });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: false, onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'success' | 'info' = 'warning') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: true, onConfirm: () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } });
  };
  
  const viewId = currentChurch?.id;

  // --- AUTO GENERATE TRIGGER ---
  useEffect(() => {
      if (viewId && activeTab === 'LISTA') {
          // Passamos o mês selecionado
          const start = new Date(filterYear, filterMonth - 1, 1).toISOString().split('T')[0];
          const end = new Date(filterYear, filterMonth, 0).toISOString().split('T')[0];
          generateMonthlyFixedExpenses(viewId, start, end);
      }
  }, [viewId, filterMonth, filterYear, activeTab]);

  const filteredMembers = members.filter(m => m.churchId === viewId && m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const excludedCategories = ['MISSOES', 'JOVENS', 'CRIANCAS', 'SENHORAS'];

  const churchTransactions = transactions
    .filter(t => t.churchId === viewId)
    .filter(t => !t.campaignId)
    // FILTRO GLOBAL: Remove Pendentes, Carnês e Transações de Departamentos
    .filter(t => t.status !== 'PENDENTE')
    .filter(t => !t.description.includes('CARNÊ'))
    .filter(t => !excludedCategories.includes(t.category))
    .filter(t => {
        const tDate = new Date(t.date + 'T12:00:00');
        const matchesDate = (tDate.getMonth() + 1) === filterMonth && tDate.getFullYear() === filterYear;
        let matchesCategory = true;
        
        if (filterType !== 'TODOS') {
            if (filterType === 'SAIDA') matchesCategory = t.type === 'SAIDA';
            else matchesCategory = t.category === filterType && t.type === 'ENTRADA';
        }
        return matchesDate && matchesCategory;
    })
    .sort((a,b) => {
        // ORDENAÇÃO: Ordem de cadastro (Mais novas em cima)
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // Fallback se não tiver createdAt (ex: dados legados), usa a data da transação
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const canEdit = user?.role !== 'SECRETARIO';

  const handleMemberSelect = (member: typeof members[0]) => {
    setSelectedMemberId(member.id);
    setSearchTerm(member.name);
    const prefix = category === 'DIZIMO' ? 'Dízimo' : 'Oferta';
    setDescription(`${prefix} - ${member.name}`.toUpperCase());
  };

  const clearMemberSelection = () => { setSelectedMemberId(''); setSearchTerm(''); setDescription(''); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]); };

  const handleEditTransaction = (t: Transaction) => {
      setEditingTransactionId(t.id);
      setActiveTab(t.type);
      setAmount(t.amount.toString());
      setDate(t.date);
      setCategory(t.category);
      setDescription(t.description);
      setMissionRecipient(''); // Não usado aqui

      if (t.memberId) {
          setSelectedMemberId(t.memberId);
          const m = members.find(mem => mem.id === t.memberId);
          if (m) setSearchTerm(m.name);
      } else { setSelectedMemberId(''); setSearchTerm(''); }
      
      setSelectedFile(null);
      setIsRecurring(false); 
  };

  const handleCancelForm = () => {
      setActiveTab('LISTA');
      setEditingTransactionId(null);
      setAmount(''); setDescription(''); setSelectedMemberId(''); setSearchTerm(''); setCategory(''); setSelectedFile(null); setShowFilters(false);
      setMissionRecipient('');
      setIsRecurring(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !viewId) return;

    if (activeTab === 'ENTRADA' && category === 'DIZIMO' && !selectedMemberId) {
        showAlert('Atenção', 'Selecione um membro para lançar o Dízimo.', 'warning');
        return;
    }

    setIsSubmitting(true);

    if (activeTab === 'ENTRADA' && category === 'DIZIMO' && selectedMemberId) {
        const member = members.find(m => m.id === selectedMemberId);
        if (member && !member.isTither) await updateMember(member.id, { ...member, isTither: true });
    }

    let attachmentUrl = undefined;
    if (editingTransactionId) {
        const original = transactions.find(t => t.id === editingTransactionId);
        attachmentUrl = original?.attachmentUrl;
    }
    if (selectedFile) {
        const url = await uploadTransactionFile(selectedFile);
        if (url) attachmentUrl = url;
    }

    let finalCategory = category;
    if (activeTab === 'SAIDA' && !category) finalCategory = 'DESPESA_VARIAVEL';

    let finalDescription = (description || (activeTab === 'ENTRADA' ? category : 'Saída')).toUpperCase();

    let generatedFixedId: string | undefined = undefined;

    if (activeTab === 'SAIDA' && isRecurring && !editingTransactionId) {
        const day = parseInt(date.split('-')[2]); 
        
        const fixedId = await addFixedExpense({
            id: '', 
            churchId: viewId,
            description: finalDescription,
            amount: parseFloat(amount),
            category: finalCategory as TransactionCategory,
            dueDay: day,
            autoGenerate: true, 
            active: true
        });
        
        if (fixedId) {
            generatedFixedId = fixedId;
        }
    }

    const transactionPayload: Transaction = {
      id: editingTransactionId || '',
      churchId: viewId, 
      type: activeTab === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
      category: finalCategory as TransactionCategory,
      amount: parseFloat(amount),
      date: date,
      description: finalDescription,
      responsibleUserId: user.id, 
      memberId: (activeTab === 'ENTRADA' && category === 'DIZIMO') ? selectedMemberId : undefined,
      attachmentUrl: attachmentUrl,
      isFixed: isRecurring, 
      fixedExpenseId: generatedFixedId,
      status: 'PAGO' // Manual entry is always PAID immediately
    };

    if (editingTransactionId) {
        await updateTransaction(editingTransactionId, transactionPayload);
        showAlert('Sucesso', 'Atualizado!', 'success');
    } else {
        await addTransaction(transactionPayload);
        if (isRecurring) {
            showAlert('Gasto Fixo Criado', 'Lançamento salvo e configurado para repetir automaticamente nos próximos meses!', 'success');
        } else {
            showAlert('Sucesso', 'Salvo!', 'success');
        }
    }
    
    setIsSubmitting(false);
    handleCancelForm();
  };

  const formatCategoryName = (cat: string, type: string) => {
      return cat;
  };

  if (!viewId) return <div>...</div>;

  const renderTransactionForm = () => (
    <div className="bg-white rounded-xl shadow-md p-3 md:p-8 animate-fade-in-down">
       <div className="mb-4 border-b pb-2 flex justify-between items-center">
         <div><h2 className="text-lg md:text-2xl font-bold flex items-center">{editingTransactionId ? 'Editar' : (activeTab === 'ENTRADA' ? 'Nova Receita' : 'Nova Despesa')}</h2></div>
         {editingTransactionId && <button onClick={handleCancelForm}><X/></button>}
       </div>
       <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
          {activeTab === 'ENTRADA' ? (
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Tipo de Entrada</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[ { val: 'DIZIMO', label: 'DÍZIMO' }, { val: 'OFERTA', label: 'OFERTA' }, { val: 'OUTROS', label: 'OUTROS' } ].map((item) => (
                  <button type="button" key={item.val} onClick={() => { setCategory(item.val as TransactionCategory); if (!editingTransactionId) clearMemberSelection(); }} className={`flex-1 min-w-[80px] px-2 py-2 rounded-lg border font-bold text-xs transition-colors ${category === item.val ? 'bg-brand-orange text-white border-brand-orange' : 'border-gray-300 text-gray-700'}`}>{item.label}</button>
                ))}
              </div>
            </div>
          ) : (
             <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Categoria da Saída</label>
                <div className="flex gap-2 mb-3">
                    {['DESPESA_VARIAVEL'].map(cat => (
                        <button type="button" key={cat} onClick={() => { setCategory(cat as TransactionCategory); setDescription(''); }} className={`flex-1 py-2 px-1 rounded border text-[10px] font-bold ${category === cat ? 'bg-brand-red text-white' : 'bg-white text-gray-600'}`}>
                            ADM GERAL / DESPESA
                        </button>
                    ))}
                </div>
               
               <div>
                   <label className="block text-xs md:text-sm font-medium text-gray-700">Descrição</label>
                   <input 
                       type="text" 
                       required 
                       placeholder="EX: CONTA DE LUZ" 
                       className="mt-1 w-full p-2 border rounded-lg uppercase text-sm" 
                       value={description} 
                       onChange={e => setDescription(e.target.value.toUpperCase())} 
                   />
               </div>
             </div>
          )}

          {activeTab === 'ENTRADA' && category === 'DIZIMO' && (
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
              <label className="block text-xs font-bold text-gray-800 mb-1">Buscar Membro</label>
              <div className="relative">
                <input type="text" placeholder="NOME..." className="w-full p-2 pl-8 border rounded-lg uppercase text-sm" value={searchTerm} onChange={e => { setSearchTerm(e.target.value.toUpperCase()); if(selectedMemberId) setSelectedMemberId(''); }} />
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                {searchTerm && <button type="button" onClick={clearMemberSelection} className="absolute right-2 top-2.5 text-gray-400"><X size={16} /></button>}
              </div>
              {searchTerm && !selectedMemberId && (
                <div className="mt-1 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-10">
                  {filteredMembers.length > 0 ? (filteredMembers.map(m => (<div key={m.id} onClick={() => handleMemberSelect(m)} className="p-2 hover:bg-orange-100 cursor-pointer border-b text-xs"><span className="font-bold">{m.name}</span></div>))) : <div className="p-2 text-gray-500 text-xs text-center">Não encontrado.</div>}
                </div>
              )}
              {selectedMemberId && (<div className="mt-1 text-green-700 text-xs font-bold flex items-center bg-green-50 p-1 rounded"><CheckCircle size={14} className="mr-1"/> {searchTerm}</div>)}
            </div>
          )}

          {activeTab === 'ENTRADA' && category === 'OFERTA' && (<div><label className="block text-xs md:text-sm font-medium text-gray-700">Descrição</label><input type="text" required placeholder="EX: CULTO DOMINGO" className="mt-1 w-full p-2 border rounded-lg uppercase text-sm" value={description} onChange={e => setDescription(e.target.value.toUpperCase())} /></div>)}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs md:text-sm font-medium text-gray-700">Valor (R$)</label><input type="number" step="0.01" required className="mt-1 w-full p-2 border rounded-lg font-bold" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><label className="block text-xs md:text-sm font-medium text-gray-700">Data</label><input type="date" required className="mt-1 w-full p-2 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>

          {activeTab === 'SAIDA' && !editingTransactionId && (
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                      <input 
                        type="checkbox" 
                        name="toggle" 
                        id="recurring-toggle" 
                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300"
                        style={{ right: isRecurring ? '0' : '50%', borderColor: isRecurring ? '#3b82f6' : '#9ca3af' }}
                        checked={isRecurring}
                        onChange={e => setIsRecurring(e.target.checked)}
                      />
                      <label htmlFor="recurring-toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${isRecurring ? 'bg-blue-500' : 'bg-gray-300'}`}></label>
                  </div>
                  <label htmlFor="recurring-toggle" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center">
                      <RefreshCw size={14} className="mr-1.5 text-blue-600"/> 
                      Marcar como Gasto Fixo (Repetir Mensalmente)
                  </label>
              </div>
          )}

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Comprovante</label>
            <div className="mt-1 relative">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" id="transaction-file-upload"/>
                <label htmlFor="transaction-file-upload" className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer ${selectedFile ? 'bg-orange-50 border-brand-orange' : 'border-gray-300'}`}>
                    {selectedFile ? <span className="text-xs font-bold text-brand-orange truncate">{selectedFile.name}</span> : <span className="text-xs text-gray-500 flex items-center"><Upload size={14} className="mr-1"/> Anexar Arquivo</span>}
                </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
             <button type="button" onClick={handleCancelForm} disabled={isSubmitting} className="flex-1 text-gray-500 font-bold py-2 border rounded-lg text-sm uppercase">Cancelar</button>
             <button type="submit" disabled={isSubmitting} className={`flex-1 py-2 rounded-lg font-bold text-white flex justify-center items-center text-sm uppercase ${activeTab === 'ENTRADA' ? 'bg-green-600' : 'bg-brand-red'}`}>{isSubmitting ? <Loader className="animate-spin" size={16}/> : 'Salvar'}</button>
          </div>
       </form>
    </div>
  );

  const renderList = () => (
    <div className="space-y-3">
      {/* FILTER BAR */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-2 items-center justify-between">
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${showFilters || filterType !== 'TODOS' ? 'bg-brand-black text-white' : 'bg-gray-50 text-gray-600'}`}><Filter size={14} /> <span>{filterType === 'TODOS' ? 'Filtrar' : filterType}</span></button>
          <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-0.5">
              <select value={filterMonth} onChange={e => setFilterMonth(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>))}</select>
              <select value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer"><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select>
          </div>
          {showFilters && (
             <div className="w-full flex gap-2 overflow-x-auto pb-1 mt-1 border-t pt-2">
                 {/* Removed 'PENDENTE' button */}
                 {[{ id: 'TODOS', label: 'Tudo' }, { id: 'DIZIMO', label: 'Dízimo' }, { id: 'OFERTA', label: 'Oferta' }, { id: 'SAIDA', label: 'Saída' }, { id: 'OUTROS', label: 'Outros' }].map(f => (<button key={f.id} onClick={() => { setFilterType(f.id as any); setShowFilters(false); }} className={`px-2 py-1 rounded text-[10px] font-bold border whitespace-nowrap ${filterType === f.id ? 'bg-brand-orange text-white' : 'bg-white'}`}>{f.label}</button>))}
             </div>
          )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Data</th><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Desc</th><th className="hidden md:table-cell px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Cat</th><th className="px-2 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">Valor</th><th className="px-1 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">.</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {churchTransactions.map(t => {
                const [year, month, day] = t.date.split('-').map(Number);
                const displayDate = new Date(year, month - 1, day).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                
                return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-[10px] text-gray-600 whitespace-nowrap">{displayDate}</td>
                  <td className="px-2 py-2 text-[10px] font-medium text-gray-900 truncate max-w-[100px] md:max-w-none uppercase">
                    {t.isFixed && <span className="mr-1 text-[8px] bg-blue-100 text-blue-700 px-1 rounded font-bold" title="Gasto Fixo">FIXO</span>}
                    {t.description}
                    <div className="md:hidden text-[9px] text-gray-400">{formatCategoryName(t.category, t.type)}</div>
                  </td>
                  <td className="hidden md:table-cell px-2 py-2 text-xs"><span className={`px-1 rounded text-[10px] font-bold ${t.type === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{formatCategoryName(t.category, t.type)}</span></td>
                  <td className={`px-2 py-2 text-[10px] font-bold text-right whitespace-nowrap ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-brand-red'}`}>{t.type === 'ENTRADA' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td className="px-1 py-2 text-right whitespace-nowrap">
                      {canEdit && (
                          <div className="flex justify-end gap-2">
                              {/* Removed confirmation button as requested */}
                              {t.attachmentUrl && (
                                    <a href={t.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600" title="Ver Comprovante">
                                        <Paperclip size={14}/>
                                    </a>
                                )}
                                <button onClick={() => handleEditTransaction(t)} className="text-gray-400 hover:text-brand-orange"><Edit2 size={14}/></button>
                              <button onClick={() => showConfirm('Excluir', 'Apagar registro?', () => deleteTransaction(t.id), 'danger')} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button>
                          </div>
                      )}
                  </td>
                </tr>
              )})}
              {churchTransactions.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400 text-xs">Sem lançamentos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-3 md:space-y-6">
       {!editingTransactionId && (
           <div className="flex flex-col md:flex-row gap-2 mb-2 md:mb-8">
             <div className="flex-1 flex gap-2">
                <button onClick={() => { handleCancelForm(); setActiveTab('LISTA'); }} className={`flex-1 py-2 md:py-4 rounded-lg font-bold text-xs md:text-base ${activeTab === 'LISTA' ? 'bg-brand-black text-white' : 'bg-white text-gray-500 border'}`}>Extrato</button>
             </div>
             {canEdit && (
               <div className="flex gap-2 flex-1">
                <button onClick={() => { setActiveTab('ENTRADA'); setEditingTransactionId(null); setCategory(''); clearMemberSelection(); setSelectedFile(null); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base ${activeTab === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200'}`}><PlusCircle size={14} /> Entrada</button>
                <button onClick={() => { setActiveTab('SAIDA'); setEditingTransactionId(null); setCategory('DESPESA_VARIAVEL'); setDescription(''); setSelectedFile(null); setIsRecurring(false); setMissionRecipient(''); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base ${activeTab === 'SAIDA' ? 'bg-brand-red text-white' : 'bg-white text-brand-red border border-red-200'}`}><MinusCircle size={14} /> Saída</button>
               </div>
             )}
           </div>
       )}

       {(activeTab === 'LISTA' && !editingTransactionId) && renderList()}
       {(activeTab === 'ENTRADA' || activeTab === 'SAIDA' || editingTransactionId) && renderTransactionForm()}

       {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full overflow-hidden p-4">
             <h3 className="font-bold text-lg mb-2">{modalState.title}</h3>
             <p className="text-gray-600 text-sm mb-4">{modalState.message}</p>
             <div className="flex justify-end gap-2">
                {modalState.showCancel && <button onClick={() => setModalState(prev => ({...prev, isOpen: false}))} className="px-3 py-1.5 border rounded text-xs">Cancelar</button>}
                <button onClick={() => { if (modalState.onConfirm) modalState.onConfirm(); else setModalState(prev => ({...prev, isOpen: false})); }} className={`px-4 py-1.5 rounded text-white text-xs font-bold ${modalState.variant === 'danger' ? 'bg-red-600' : (modalState.variant === 'success' ? 'bg-green-600' : 'bg-brand-black')}`}>OK</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
