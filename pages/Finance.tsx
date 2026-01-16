import React, { useState } from 'react';
import { useApp } from '../context';
import { TransactionCategory, Transaction } from '../types';
import { PlusCircle, MinusCircle, Search, CheckCircle, ShieldAlert, X, Paperclip, ExternalLink, Trash2 } from 'lucide-react';

export const Finance: React.FC = () => {
  const { addTransaction, deleteTransaction, members, user, transactions, currentChurch, updateMember } = useApp();
  const [activeTab, setActiveTab] = useState<'ENTRADA' | 'SAIDA' | 'LISTA'>('LISTA');
  
  // Form State
  const [category, setCategory] = useState<TransactionCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState(''); // Novo estado para o comprovante
  
  // Member Search State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ISOLATION: Use currentChurch.id instead of user.churchId
  const viewId = currentChurch?.id;

  // Filter members based on search and ensuring they belong to the current viewing church
  const filteredMembers = members.filter(m => 
    m.churchId === viewId &&
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const churchTransactions = transactions.filter(t => t.churchId === viewId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
        deleteTransaction(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canEdit || !viewId) return;

    // Validation for Tithes/Missions
    if (activeTab === 'ENTRADA' && (category === 'DIZIMO' || category === 'MISSOES') && !selectedMemberId) {
        alert('Por favor, selecione um membro da lista para registrar Dízimo ou Missões.');
        return;
    }

    // --- TITHER CHECK LOGIC ---
    if (activeTab === 'ENTRADA' && category === 'DIZIMO' && selectedMemberId) {
        const member = members.find(m => m.id === selectedMemberId);
        if (member && !member.isTither) {
            if(window.confirm(`AVISO: O membro "${member.name}" não está marcado como DIZIMISTA no cadastro.\n\nDeseja atualizar o perfil dele para Dizimista agora?`)) {
                updateMember(member.id, { ...member, isTither: true });
                alert(`Perfil de "${member.name}" atualizado para Dizimista!`);
            }
        }
    }
    // -------------------------

    const newTransaction: Transaction = {
      id: '',
      churchId: viewId, // Registers to the currently viewed church
      type: activeTab === 'ENTRADA' ? 'ENTRADA' : 'SAIDA',
      category: category as TransactionCategory,
      amount: parseFloat(amount),
      date: date,
      description: (description || (activeTab === 'ENTRADA' ? category : 'Saída Diversa')).toUpperCase(),
      responsibleUserId: user.id, // The user logging the action remains the same
      memberId: (activeTab === 'ENTRADA' && (category === 'DIZIMO' || category === 'MISSOES')) ? selectedMemberId : undefined,
      attachmentUrl: attachmentUrl || undefined // Salva o comprovante se existir
    };

    addTransaction(newTransaction);
    alert('Lançamento realizado com sucesso!');
    setActiveTab('LISTA');
    // Reset
    setAmount('');
    setDescription('');
    setSelectedMemberId('');
    setSearchTerm('');
    setCategory('');
    setAttachmentUrl('');
  };

  if (!viewId) return <div>Carregando unidade...</div>;

  const renderForm = () => (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-8">
       <div className="mb-6 border-b pb-4">
         <h2 className="text-xl md:text-2xl font-bold">
           {activeTab === 'ENTRADA' ? 'Nova Receita' : 'Nova Despesa'}
         </h2>
         <p className="text-sm text-gray-500">Unidade: {currentChurch?.name}</p>
       </div>

       <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          
          {/* Category Selection for Entrance */}
          {activeTab === 'ENTRADA' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Entrada</label>
              <div className="flex flex-wrap gap-2">
                {['DIZIMO', 'MISSOES', 'OFERTA'].map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => {
                        setCategory(cat as TransactionCategory);
                        clearMemberSelection(); // Reset fields when switching category
                    }}
                    className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${category === cat ? 'bg-brand-orange text-white border-brand-orange shadow-md' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {cat}
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

          {/* Campo de Comprovante - NOVO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Link do Comprovante (URL)</label>
            <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Paperclip className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Cole aqui o link do comprovante..."
                  className="block w-full pl-10 p-3 border rounded-lg focus:ring-brand-orange text-sm"
                  value={attachmentUrl}
                  onChange={e => setAttachmentUrl(e.target.value)} // URLs não devem ser uppercase
                />
            </div>
          </div>

          <button type="submit" className={`w-full py-3 md:py-4 rounded-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.01] ${activeTab === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-red hover:bg-red-700'}`}>
            Confirmar {activeTab === 'ENTRADA' ? 'Entrada' : 'Saída'}
          </button>
          
          <button type="button" onClick={() => setActiveTab('LISTA')} className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 text-sm">Cancelar</button>
       </form>
    </div>
  );

  const renderList = () => (
    <div className="space-y-6">
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
                      {t.type === 'SAIDA' ? 'SAÍDA' : t.category}
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
                          <button 
                              onClick={() => handleDelete(t.id)} 
                              className="text-red-400 hover:text-red-700 transition-colors p-1"
                              title="Excluir Lançamento"
                          >
                              <Trash2 size={16}/>
                          </button>
                      )}
                  </td>
                </tr>
              ))}
              {churchTransactions.length === 0 && (
                  <tr>
                      <td colSpan={6} className="p-4 md:p-8 text-center text-gray-500 text-sm">Nenhum lançamento encontrado nesta unidade.</td>
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
       <div className="flex flex-col md:flex-row gap-2 md:space-x-4 mb-4 md:mb-8">
         <button
           onClick={() => setActiveTab('LISTA')}
           className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center font-bold transition-all text-sm md:text-base ${activeTab === 'LISTA' ? 'bg-brand-black text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
         >
           Ver Lançamentos
         </button>
         {canEdit ? (
           <div className="flex flex-col md:flex-row gap-2 w-full">
            <button
              onClick={() => { setActiveTab('ENTRADA'); setCategory(''); clearMemberSelection(); setAttachmentUrl(''); }}
              className={`w-full py-3 md:py-4 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all text-sm md:text-base ${activeTab === 'ENTRADA' ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <PlusCircle size={18} /> <span>Entrada</span>
            </button>
            <button
              onClick={() => { setActiveTab('SAIDA'); setCategory(''); setDescription(''); setAttachmentUrl(''); }}
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

       {activeTab === 'LISTA' ? renderList() : renderForm()}
    </div>
  );
};