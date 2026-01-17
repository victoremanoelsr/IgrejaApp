
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { TransactionCategory, Transaction } from '../types';
import { 
  PlusCircle, MinusCircle, Search, CheckCircle, ShieldAlert, X, 
  Paperclip, ExternalLink, Trash2, Upload, Loader, Filter, 
  Calendar, Edit2, AlertTriangle, Info, ChevronDown, ChevronUp 
} from 'lucide-react';

export const Finance: React.FC = () => {
  const { addTransaction, updateTransaction, deleteTransaction, uploadTransactionFile, members, user, transactions, currentChurch, updateMember } = useApp();
  const [activeTab, setActiveTab] = useState<'ENTRADA' | 'SAIDA' | 'LISTA'>('LISTA');
  
  // Filter States for LIST view
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<'TODOS' | 'DIZIMO' | 'MISSOES' | 'OFERTA' | 'SAIDA' | 'OUTROS'>('TODOS');
  const [showFilters, setShowFilters] = useState(false); // Estado para controlar visibilidade dos filtros

  // Editing State
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Member Search State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // --- CUSTOM CONFIRM/ALERT MODAL STATE ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
    showCancel: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    showCancel: false,
    onConfirm: undefined
  });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: false,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  // ISOLATION: Use currentChurch.id instead of user.churchId
  const viewId = currentChurch?.id;

  // Filter members based on search and ensuring they belong to the current viewing church
  const filteredMembers = members.filter(m => 
    m.churchId === viewId &&
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // --- FILTERING LOGIC FOR LIST ---
  const churchTransactions = transactions
    .filter(t => t.churchId === viewId)
    // --- ALTERAÇÃO CRÍTICA: EXCLUIR TRANSAÇÕES DE CAMPANHAS DO CAIXA GERAL ---
    .filter(t => !t.campaignId) 
    .filter(t => {
        // Date Filter
        const tDate = new Date(t.date);
        const matchesDate = (tDate.getMonth() + 1) === filterMonth && tDate.getFullYear() === filterYear;
        
        // Category Filter
        let matchesCategory = true;
        if (filterType !== 'TODOS') {
            if (filterType === 'SAIDA') {
                matchesCategory = t.type === 'SAIDA';
            } else {
                matchesCategory = t.category === filterType && t.type === 'ENTRADA';
            }
        }
        
        return matchesDate && matchesCategory;
    })
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const canEdit = user?.role !== 'SECRETARIO';

  const handleMemberSelect = (member: typeof members[0]) => {
    setSelectedMemberId(member.id);
    setSearchTerm(member.name);
    // Auto-generate description so the list looks good
    const prefix = category === 'DIZIMO' ? 'Dízimo' : 'Missões';
    setDescription(`${prefix} - ${member.name}`.toUpperCase());
  };

  const clearMemberSelection = () => {
    setSelectedMemberId('');
    setSearchTerm('');
    setDescription('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleEdit = (t: Transaction) => {
      setEditingTransactionId(t.id);
      setActiveTab(t.type);
      
      // Populate fields
      setAmount(t.amount.toString());
      setDate(t.date);
      setCategory(t.category);
      setDescription(t.description);
      
      if (t.memberId) {
          setSelectedMemberId(t.memberId);
          const m = members.find(mem => mem.id === t.memberId);
          if (m) setSearchTerm(m.name);
      } else {
          setSelectedMemberId('');
          setSearchTerm('');
      }
      setSelectedFile(null);
  };

  const handleCancelForm = () => {
      setActiveTab('LISTA');
      setEditingTransactionId(null);
      setAmount('');
      setDescription('');
      setSelectedMemberId('');
      setSearchTerm('');
      setCategory('');
      setSelectedFile(null);
      setShowFilters(false);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    showConfirm(
        'Excluir Lançamento',
        'Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.',
        () => deleteTransaction(id),
        'danger'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !viewId) return;

    // Validation for Tithes/Missions
    if (activeTab === 'ENTRADA' && (category === 'DIZIMO' || category === 'MISSOES') && !selectedMemberId) {
        showAlert('Atenção', 'Por favor, selecione um membro da lista para registrar Dízimo ou Missões.', 'warning');
        return;
    }

    setIsSubmitting(true);

    // --- TITHER CHECK LOGIC ---
    if (activeTab === 'ENTRADA' && category === 'DIZIMO' && selectedMemberId) {
        const member = members.find(m => m.id === selectedMemberId);
        if (member && !member.isTither) {
            await updateMember(member.id, { ...member, isTither: true });
        }
    }
    // -------------------------

    // 1. Upload File if selected
    let attachmentUrl = undefined;
    if (editingTransactionId) {
        // If editing, find original to keep url if not changed
        const original = transactions.find(t => t.id === editingTransactionId);
        attachmentUrl = original?.attachmentUrl;
    }

    if (selectedFile) {
        const url = await uploadTransactionFile(selectedFile);
        if (url) {
            attachmentUrl = url;
        } else {
            showAlert('Aviso', "Falha ao enviar o comprovante. O lançamento será salvo sem o novo arquivo.", 'warning');
        }
    }

    const transactionPayload: Transaction = {
      id: editingTransactionId || '',
      churchId: viewId, 
      type: activeTab === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
      category: category as TransactionCategory,
      amount: parseFloat(amount),
      date: date,
      description: (description || (activeTab === 'ENTRADA' ? category : 'Saída Diversa')).toUpperCase(),
      responsibleUserId: user.id, 
      memberId: (activeTab === 'ENTRADA' && (category === 'DIZIMO' || category === 'MISSOES')) ? selectedMemberId : undefined,
      attachmentUrl: attachmentUrl,
      // NOTA: Em Finance.tsx, não atribuímos campaignId, então vai para o caixa principal.
    };

    if (editingTransactionId) {
        await updateTransaction(editingTransactionId, transactionPayload);
        showAlert('Sucesso', 'Lançamento atualizado com sucesso!', 'success');
    } else {
        await addTransaction(transactionPayload);
        showAlert('Sucesso', 'Lançamento realizado com sucesso!', 'success');
    }
    
    setIsSubmitting(false);
    handleCancelForm();
  };

  // Helper para exibir nome da categoria com acento
  const formatCategoryName = (cat: string, type: string) => {
      if (type === 'SAIDA') return 'SAÍDA';
      if (cat === 'DIZIMO') return 'DÍZIMO';
      if (cat === 'MISSOES') return 'MISSÕES';
      return cat;
  };

  if (!viewId) return <div>Carregando unidade...</div>;

  const renderForm = () => (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-8 animate-fade-in-down">
       <div className="mb-6 border-b pb-4 flex justify-between items-center">
         <div>
            <h2 className="text-xl md:text-2xl font-bold">
            {editingTransactionId 
                ? 'Editar Lançamento' 
                : (activeTab === 'ENTRADA' ? 'Nova Receita' : 'Nova Despesa')}
            </h2>
            <p className="text-sm text-gray-500">Unidade: {currentChurch?.name}</p>
         </div>
         {editingTransactionId && (
             <button onClick={handleCancelForm} className="text-gray-400 hover:text-red-500"><X/></button>
         )}
       </div>

       <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          
          {/* Category Selection for Entrance */}
          {activeTab === 'ENTRADA' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Entrada</label>
              <div className="flex flex-wrap gap-2">
                {[
                    { val: 'DIZIMO', label: 'DÍZIMO' }, 
                    { val: 'MISSOES', label: 'MISSÕES' }, 
                    { val: 'OFERTA', label: 'OFERTA' }
                ].map((item) => (
                  <button
                    type="button"
                    key={item.val}
                    onClick={() => {
                        setCategory(item.val as TransactionCategory);
                        // Only clear if switching type manually, not during initial edit load
                        if (!editingTransactionId) clearMemberSelection(); 
                    }}
                    className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${category === item.val ? 'bg-brand-orange text-white border-brand-orange shadow-md' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Description for Exit */
             <div>
               <label className="block text-sm font-medium text-gray-700">Motivo da Saída</label>
               <input 
                 type="text" 
                 required
                 placeholder="EX: PAGAMENTO DE ENERGIA..."
                 className="mt-1 w-full p-3 border rounded-lg focus:ring-brand-red uppercase text-sm"
                 value={description}
                 onChange={e => setDescription(e.target.value.toUpperCase())}
               />
             </div>
          )}

          {/* Logic for DIZIMO or MISSOES: Member Search */}
          {activeTab === 'ENTRADA' && (category === 'DIZIMO' || category === 'MISSOES') && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <label className="block text-sm font-bold text-gray-800 mb-2">
                Buscar Membro ({category === 'DIZIMO' ? 'Dizimista' : 'Missionário'})
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="DIGITE O NOME..."
                  className="w-full p-3 pl-10 border rounded-lg focus:ring-brand-orange uppercase text-sm"
                  value={searchTerm}
                  onChange={e => {
                      setSearchTerm(e.target.value.toUpperCase());
                      if(selectedMemberId) setSelectedMemberId(''); // Clear selection if typing again
                  }}
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                {searchTerm && (
                    <button 
                        type="button" 
                        onClick={clearMemberSelection}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-red-500"
                    >
                        <X size={18} />
                    </button>
                )}
              </div>
              
              {/* Suggestions List */}
              {searchTerm && !selectedMemberId && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-10">
                  {filteredMembers.length > 0 ? (
                      filteredMembers.map(m => (
                        <div 
                          key={m.id} 
                          onClick={() => handleMemberSelect(m)}
                          className="p-3 hover:bg-orange-100 cursor-pointer flex justify-between items-center border-b last:border-0"
                        >
                          <span className="font-medium text-gray-800 text-sm">{m.name}</span>
                          <span className="text-xs text-gray-500">CPF: {m.cpf}</span>
                        </div>
                      ))
                  ) : (
                      <div className="p-3 text-gray-500 text-sm text-center">Nenhum membro encontrado.</div>
                  )}
                </div>
              )}
              
              {selectedMemberId && (
                  <div className="mt-2 text-green-700 text-xs md:text-sm font-bold flex items-center bg-green-50 p-2 rounded">
                      <CheckCircle size={16} className="mr-2"/> Membro: {searchTerm}
                  </div>
              )}
            </div>
          )}

          {/* Logic for OFERTA: Custom Description */}
          {activeTab === 'ENTRADA' && category === 'OFERTA' && (
             <div>
               <label className="block text-sm font-medium text-gray-700">Descrição da Oferta</label>
               <input 
                 type="text" 
                 required
                 placeholder="EX: CULTO DE DOMINGO..."
                 className="mt-1 w-full p-3 border rounded-lg focus:ring-brand-orange uppercase text-sm"
                 value={description}
                 onChange={e => setDescription(e.target.value.toUpperCase())}
               />
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="0,00"
                className="mt-1 w-full p-3 border rounded-lg focus:ring-brand-orange text-lg font-bold"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input 
                type="date" 
                required
                className="mt-1 w-full p-3 border rounded-lg focus:ring-brand-orange"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Campo de Comprovante - FILE UPLOAD */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Comprovante (Imagem ou PDF)</label>
            <div className="mt-1 relative">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="hidden" 
                    id="transaction-file-upload"
                />
                <label 
                    htmlFor="transaction-file-upload" 
                    className={`flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${selectedFile ? 'border-brand-orange bg-orange-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                >
                    {selectedFile ? (
                        <div className="flex items-center text-brand-orange font-medium">
                            <CheckCircle className="mr-2" size={20}/>
                            <span className="truncate max-w-[200px] md:max-w-xs">{selectedFile.name}</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-gray-500">
                            <Upload className="mr-2" size={20}/>
                            <span>{editingTransactionId ? 'Clique para substituir o arquivo' : 'Clique para buscar nos arquivos'}</span>
                        </div>
                    )}
                </label>
                {selectedFile && (
                    <button 
                        type="button" 
                        onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 bg-white rounded-full shadow text-red-500 hover:text-red-700"
                        title="Remover arquivo"
                    >
                        <X size={16}/>
                    </button>
                )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-3 md:py-4 rounded-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.01] flex justify-center items-center ${activeTab === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-red hover:bg-red-700'} ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isSubmitting && <Loader className="animate-spin mr-2" size={20}/>}
            {isSubmitting ? 'Salvando...' : `Confirmar ${editingTransactionId ? 'Alterações' : (activeTab === 'ENTRADA' ? 'Entrada' : 'Saída')}`}
          </button>
          
          <button type="button" onClick={handleCancelForm} disabled={isSubmitting} className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 text-sm">Cancelar</button>
       </form>
    </div>
  );

  const renderList = () => (
    <div className="space-y-4">
      
      {/* FILTER BAR - RESTRUCTURED */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-fade-in-down">
          
          <div className="flex flex-row justify-between items-center">
              
              {/* LADO ESQUERDO: Botão de Filtro (Expansível) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    showFilters || filterType !== 'TODOS'
                    ? 'bg-brand-black text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                 <Filter size={16} />
                 <span>Filtrar Tipo</span>
                 {filterType !== 'TODOS' && (
                     <span className="ml-2 bg-brand-orange text-white text-[10px] px-2 py-0.5 rounded-full uppercase">
                         {filterType}
                     </span>
                 )}
                 {showFilters ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}
              </button>

              {/* LADO DIREITO: Seleção de Período */}
              <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
                      <Calendar size={16} className="text-gray-400 ml-2 mr-1 hidden sm:block"/>
                      <select 
                          value={filterMonth} 
                          onChange={e => setFilterMonth(parseInt(e.target.value))} 
                          className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer py-1 pl-1 pr-8"
                      >
                        {Array.from({length: 12}, (_, i) => (
                          <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>
                        ))}
                      </select>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <select 
                          value={filterYear} 
                          onChange={e => setFilterYear(parseInt(e.target.value))} 
                          className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer py-1 pl-1 pr-8"
                      >
                         <option value={2023}>2023</option>
                         <option value={2024}>2024</option>
                         <option value={2025}>2025</option>
                         <option value={2026}>2026</option>
                      </select>
                  </div>
              </div>
          </div>

          {/* ÁREA DE FILTROS EXPANSÍVEL (SÓ APARECE QUANDO CLICA NO BOTÃO) */}
          {showFilters && (
             <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center animate-fade-in">
                 <span className="text-xs font-bold text-gray-400 uppercase mb-2 sm:mb-0 sm:mr-4 tracking-wider">Selecione uma categoria:</span>
                 <div className="flex flex-wrap gap-2">
                     {[
                         { id: 'TODOS', label: 'Todos' },
                         { id: 'DIZIMO', label: 'Dízimo' },
                         { id: 'MISSOES', label: 'Missões' },
                         { id: 'OFERTA', label: 'Oferta' },
                         { id: 'SAIDA', label: 'Saída' }
                     ].map(f => (
                         <button
                            key={f.id}
                            onClick={() => { setFilterType(f.id as any); setShowFilters(false); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                                filterType === f.id 
                                ? 'bg-brand-orange text-white border-brand-orange shadow' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                         >
                             {f.label}
                         </button>
                     ))}
                 </div>
             </div>
          )}
      </div>

      {/* INFO ALERT: CAIXA SEPARADO */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start text-sm text-blue-800 animate-fade-in">
          <Info size={18} className="mr-2 mt-0.5 shrink-0"/>
          <span>
              <strong>Atenção:</strong> Esta tela exibe apenas movimentações do <strong>Caixa Principal</strong>. 
              Para visualizar ou gerenciar entradas e saídas de campanhas específicas, acesse o menu <strong>Campanhas</strong>.
          </span>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="hidden md:table-cell px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Comp.</th>
                <th className="px-3 py-2 md:px-6 md:py-3 text-right text-[10px] md:text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {churchTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 md:px-6 md:py-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-xs md:text-sm font-medium text-gray-900 max-w-[120px] md:max-w-none truncate">{t.description}</td>
                  <td className="hidden md:table-cell px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {formatCategoryName(t.category, t.type)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 md:px-6 md:py-4 text-xs md:text-sm font-bold text-right whitespace-nowrap ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-brand-red'}`}>
                    {t.type === 'ENTRADA' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 text-center">
                      {t.attachmentUrl ? (
                          <a 
                              href={t.attachmentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-brand-orange hover:text-white transition-colors"
                              title="Ver Comprovante"
                          >
                              <ExternalLink size={16}/>
                          </a>
                      ) : (
                          <span className="text-gray-300">-</span>
                      )}
                  </td>
                  <td className="px-3 py-2 md:px-6 md:py-4 text-right">
                      {canEdit && (
                          <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => handleEdit(t)} 
                                className="text-brand-orange hover:text-brand-red transition-colors p-1"
                                title="Editar Lançamento"
                              >
                                <Edit2 size={16}/>
                              </button>
                              <button 
                                onClick={() => handleDelete(t.id)} 
                                className="text-red-400 hover:text-red-700 transition-colors p-1"
                                title="Excluir Lançamento"
                              >
                                <Trash2 size={16}/>
                              </button>
                          </div>
                      )}
                  </td>
                </tr>
              ))}
              {churchTransactions.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-4 md:p-8 text-center text-gray-500 text-sm">
                          Nenhum lançamento encontrado para este período/filtro.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 pl-10 md:pl-0">
       {/* Top Navigation / Mode Selection */}
       {!editingTransactionId && (
           <div className="flex flex-col md:flex-row gap-2 md:space-x-4 mb-4 md:mb-8">
             <button
               onClick={() => { handleCancelForm(); setActiveTab('LISTA'); }}
               className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center font-bold transition-all text-sm md:text-base ${activeTab === 'LISTA' ? 'bg-brand-black text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
             >
               Lançamentos (Caixa Principal)
             </button>
             {canEdit ? (
               <div className="flex flex-col md:flex-row gap-2 w-full">
                <button
                  onClick={() => { setActiveTab('ENTRADA'); setEditingTransactionId(null); setCategory(''); clearMemberSelection(); setSelectedFile(null); }}
                  className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all text-sm md:text-base ${activeTab === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  <PlusCircle size={18} /> <span>Entrada</span>
                </button>
                <button
                  onClick={() => { setActiveTab('SAIDA'); setEditingTransactionId(null); setCategory(''); setDescription(''); setSelectedFile(null); }}
                  className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all text-sm md:text-base ${activeTab === 'SAIDA' ? 'bg-brand-red text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  <MinusCircle size={18} /> <span>Saída</span>
                </button>
               </div>
             ) : (
               <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-2 flex items-center justify-center text-brand-orange text-xs font-bold text-center">
                 <ShieldAlert size={16} className="mr-1"/> Modo Apenas Visualização
               </div>
             )}
           </div>
       )}

       {/* Render Form (Create or Edit) OR List */}
       {(activeTab === 'LISTA' && !editingTransactionId) ? renderList() : renderForm()}

       {/* GLOBAL CONFIRM/ALERT MODAL */}
       {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
             <div className={`h-2 ${
               modalState.variant === 'danger' ? 'bg-red-500' : 
               modalState.variant === 'warning' ? 'bg-yellow-500' : 
               modalState.variant === 'success' ? 'bg-green-500' : 
               'bg-blue-500'
             }`}></div>

             <div className="p-6">
                <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-full mr-4 ${
                         modalState.variant === 'danger' ? 'bg-red-100 text-red-500' : 
                         modalState.variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                         modalState.variant === 'success' ? 'bg-green-100 text-green-600' : 
                         'bg-blue-100 text-blue-600'
                    }`}>
                        {modalState.variant === 'danger' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'warning' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'success' && <CheckCircle size={24}/>}
                        {modalState.variant === 'info' && <Info size={24}/>}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{modalState.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-line pl-[3.5rem] -mt-2">
                    {modalState.message}
                </p>

                <div className="flex justify-end space-x-3">
                    {modalState.showCancel && (
                        <button 
                            onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (modalState.onConfirm) modalState.onConfirm();
                            else setModalState(prev => ({ ...prev, isOpen: false }));
                        }}
                        className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${
                            modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                            modalState.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                            modalState.variant === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                            'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {modalState.showCancel ? 'Confirmar' : 'OK'}
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
