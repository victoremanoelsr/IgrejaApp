import React, { useState } from 'react';
import { useApp } from '../context';
import { 
  Megaphone, Plus, Target, Calendar, DollarSign, X, TrendingUp, History, 
  Trash2, Edit2, FileText, ArrowUpCircle, ArrowDownCircle, Save, Download, CheckCircle, Lock
} from 'lucide-react';
import { Campaign, Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ViewMode = 'DASHBOARD' | 'LANCAMENTOS' | 'HISTORICO' | 'EDITAR';

export const Campaigns: React.FC = () => {
  const { 
    campaigns, transactions, user, currentChurch,
    addCampaign, updateCampaign, deleteCampaign, 
    addTransaction, deleteTransaction 
  } = useApp();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Create Form State
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');

  const churchCampaigns = campaigns.filter(c => c.churchId === currentChurch?.id);

  // --- HANDLERS FOR MAIN LIST ---
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChurch) return;

    const newCampaign: Campaign = {
      id: '',
      churchId: currentChurch.id,
      name: newName.toUpperCase(),
      goal: parseFloat(newGoal),
      startDate: newStartDate,
      description: newDescription.toUpperCase(),
      status: 'ATIVA'
    };

    addCampaign(newCampaign);
    setShowCreateForm(false);
    setNewName('');
    setNewGoal('');
    setNewDescription('');
    alert('Campanha criada com sucesso!');
  };

  const handleDeleteCampaign = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if(window.confirm(`Tem certeza que deseja excluir a campanha "${name}"?\n\nTodo o histórico de lançamentos vinculados a ela será mantido apenas no financeiro geral.`)) {
        deleteCampaign(id);
    }
  }

  // ==================================================================================
  // INTERNAL CAMPAIGN VIEW COMPONENT
  // ==================================================================================
  
  const CampaignDetailModal = () => {
    if (!selectedCampaign || !currentChurch) return null;

    const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
    const isFinished = selectedCampaign.status === 'FINALIZADA';
    
    // --- Lançamentos State ---
    const [transType, setTransType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
    const [transAmount, setTransAmount] = useState('');
    const [transDate, setTransDate] = useState(new Date().toISOString().split('T')[0]);
    // Entrada: Doador / Saída: Destino
    const [transPerson, setTransPerson] = useState(''); // Donor Name or "Quem retirou"
    const [transDesc, setTransDesc] = useState(''); // Description/Destination

    // --- Edit Campaign State ---
    const [editName, setEditName] = useState(selectedCampaign.name);
    const [editGoal, setEditGoal] = useState(selectedCampaign.goal.toString());
    const [editDate, setEditDate] = useState(selectedCampaign.startDate);

    // --- Derived Data ---
    const campTransactions = transactions
      .filter(t => t.campaignId === selectedCampaign.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalIn = campTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = campTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIn - totalOut;

    // --- ACTIONS ---

    const handleTransactionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (isFinished) {
        alert("Esta campanha está finalizada e não aceita novos lançamentos.");
        return;
      }

      const descriptionFinal = transType === 'ENTRADA' 
        ? `DOAÇÃO: ${transPerson}` 
        : `${transDesc} (RETIRADO POR: ${transPerson})`;

      const newT: Transaction = {
        id: '',
        churchId: currentChurch.id,
        campaignId: selectedCampaign.id, // VINCULO ESSENCIAL
        type: transType,
        category: transType === 'ENTRADA' ? 'OUTROS' : 'DESPESA_VARIAVEL', // Generico
        amount: parseFloat(transAmount),
        date: transDate,
        description: descriptionFinal.toUpperCase(),
        responsibleUserId: user.id
      };

      addTransaction(newT);
      alert('Lançamento realizado!');
      setTransAmount('');
      setTransPerson('');
      setTransDesc('');
    };

    const handleDeleteTransaction = (id: string) => {
      if(window.confirm('Deseja excluir este lançamento do histórico?')) {
        deleteTransaction(id);
      }
    };

    const handleUpdateCampaign = (e: React.FormEvent) => {
      e.preventDefault();
      updateCampaign(selectedCampaign.id, {
        ...selectedCampaign,
        name: editName.toUpperCase(),
        goal: parseFloat(editGoal),
        startDate: editDate
      });
      alert('Dados da campanha atualizados!');
      setViewMode('DASHBOARD');
    };

    const handleFinishCampaign = () => {
      if (isFinished) {
        if(window.confirm("Esta campanha já está finalizada. Deseja REABRIR a campanha para novos lançamentos?")) {
           const updated = { ...selectedCampaign, status: 'ATIVA' as const };
           updateCampaign(selectedCampaign.id, updated);
           setSelectedCampaign(updated);
           alert('Campanha reaberta com sucesso!');
        }
        return;
      }

      if(window.confirm(`Deseja FINALIZAR a campanha "${selectedCampaign.name}"?\n\nEla será encerrada. O histórico financeiro será mantido, mas não será possível adicionar novos lançamentos.`)) {
        const updated = { ...selectedCampaign, status: 'FINALIZADA' as const };
        updateCampaign(selectedCampaign.id, updated);
        setSelectedCampaign(updated);
        alert('Campanha finalizada com sucesso!');
        setViewMode('DASHBOARD'); // Volta para o dashboard para ver o status atualizado
      }
    };

    const generateReport = () => {
      if (!currentChurch || !selectedCampaign) return;

      const doc = new jsPDF();
      const orange = [249, 115, 22]; // RGB do brand-orange
      
      // Cabeçalho
      doc.setFontSize(18);
      doc.setTextColor(orange[0], orange[1], orange[2]);
      doc.text(currentChurch.name.toUpperCase(), 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Relatório Financeiro de Campanha ${selectedCampaign.status === 'FINALIZADA' ? '(FINALIZADA)' : ''}`, 14, 28);
      
      doc.setDrawColor(200);
      doc.line(14, 32, 196, 32);

      // Dados da Campanha
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(selectedCampaign.name, 14, 42);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Início: ${new Date(selectedCampaign.startDate).toLocaleDateString('pt-BR')}`, 14, 48);
      if (selectedCampaign.description) {
        doc.text(`Descrição: ${selectedCampaign.description}`, 14, 53);
      }

      // Quadro de Resumo
      const summaryY = 60;
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(220);
      doc.roundedRect(14, summaryY, 182, 25, 2, 2, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Meta Alvo', 20, summaryY + 8);
      doc.text('Total Entradas', 70, summaryY + 8);
      doc.text('Total Saídas', 120, summaryY + 8);
      doc.text('Saldo Atual', 170, summaryY + 8, { align: 'right' }); 

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text(`R$ ${selectedCampaign.goal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, summaryY + 18);
      
      doc.setTextColor(22, 163, 74);
      doc.text(`R$ ${totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 70, summaryY + 18);
      
      doc.setTextColor(220, 38, 38);
      doc.text(`R$ ${totalOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 120, summaryY + 18);
      
      doc.setTextColor(0);
      doc.text(`R$ ${balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 170, summaryY + 18, { align: 'right' });
      doc.setFont(undefined, 'normal');

      const tableRows = campTransactions.map(t => [
        new Date(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.type,
        `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
      ]);

      autoTable(doc, {
        startY: summaryY + 35,
        head: [['Data', 'Descrição', 'Tipo', 'Valor']],
        body: tableRows,
        theme: 'striped',
        headStyles: { 
          fillColor: orange, 
          textColor: 255, 
          fontStyle: 'bold' 
        },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [255, 247, 237] },
        columnStyles: {
          0: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 35, halign: 'right' }
        }
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} via IgrejaApp`, 14, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {align: 'right'});
      }

      doc.save(`Relatorio_Campanha_${selectedCampaign.name.replace(/\s+/g, '_')}.pdf`);
    };

    // --- RENDER CONTENT BASED ON VIEW ---
    const renderContent = () => {
      switch(viewMode) {
        case 'LANCAMENTOS':
          if (isFinished) {
            return (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                <Lock size={48} className="mb-2 text-gray-300"/>
                <p className="font-bold">Campanha Finalizada</p>
                <p className="text-sm">Novos lançamentos estão bloqueados.</p>
                <button onClick={() => setViewMode('DASHBOARD')} className="mt-4 text-brand-orange hover:underline text-sm">Voltar ao painel</button>
              </div>
            );
          }
          
          return (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
               <h4 className="font-bold text-lg mb-4 text-gray-700 flex items-center">
                 {transType === 'ENTRADA' ? <ArrowUpCircle className="text-green-600 mr-2"/> : <ArrowDownCircle className="text-red-600 mr-2"/>}
                 Novo Lançamento
               </h4>
               
               <div className="flex space-x-4 mb-4">
                 <button onClick={() => setTransType('ENTRADA')} className={`flex-1 py-2 rounded font-bold ${transType === 'ENTRADA' ? 'bg-green-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>Entrada</button>
                 <button onClick={() => setTransType('SAIDA')} className={`flex-1 py-2 rounded font-bold ${transType === 'SAIDA' ? 'bg-red-600 text-white shadow' : 'bg-white text-gray-500 border'}`}>Saída</button>
               </div>

               <form onSubmit={handleTransactionSubmit} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">Valor (R$)</label>
                      <input required type="number" step="0.01" className="w-full p-2 border rounded" value={transAmount} onChange={e => setTransAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase">Data</label>
                      <input required type="date" className="w-full p-2 border rounded" value={transDate} onChange={e => setTransDate(e.target.value)} />
                    </div>
                 </div>

                 {transType === 'ENTRADA' ? (
                   <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase">Nome do Doador</label>
                     <input required type="text" placeholder="EX: IRMÃO JOÃO" className="w-full p-2 border rounded uppercase" value={transPerson} onChange={e => setTransPerson(e.target.value.toUpperCase())} />
                   </div>
                 ) : (
                   <>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Destino do Gasto (Descrição)</label>
                       <input required type="text" placeholder="EX: COMPRA DE TINTAS" className="w-full p-2 border rounded uppercase" value={transDesc} onChange={e => setTransDesc(e.target.value.toUpperCase())} />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase">Quem retirou?</label>
                       <input required type="text" placeholder="EX: TESOUREIRO MARCOS" className="w-full p-2 border rounded uppercase" value={transPerson} onChange={e => setTransPerson(e.target.value.toUpperCase())} />
                     </div>
                   </>
                 )}

                 <button type="submit" className={`w-full py-3 rounded text-white font-bold ${transType === 'ENTRADA' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                   Confirmar Lançamento
                 </button>
               </form>
            </div>
          );

        case 'HISTORICO':
          return (
            <div className="bg-white rounded-lg border overflow-hidden">
               <table className="w-full text-sm text-left">
                 <thead className="bg-gray-100 text-gray-600 font-bold">
                   <tr>
                     <th className="p-3">Data</th>
                     <th className="p-3">Descrição</th>
                     <th className="p-3 text-right">Valor</th>
                     <th className="p-3 text-center">Ações</th>
                   </tr>
                 </thead>
                 <tbody>
                   {campTransactions.map(t => (
                     <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                       <td className="p-3">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                       <td className="p-3">{t.description}</td>
                       <td className={`p-3 text-right font-bold ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                         {t.type === 'ENTRADA' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                       </td>
                       <td className="p-3 text-center">
                         <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-400 hover:text-red-600 p-1">
                           <Trash2 size={16}/>
                         </button>
                       </td>
                     </tr>
                   ))}
                   {campTransactions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">Nenhum registro.</td></tr>}
                 </tbody>
               </table>
            </div>
          );

        case 'EDITAR':
           if (isFinished) {
            return (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                <Lock size={48} className="mb-2 text-gray-300"/>
                <p className="font-bold">Campanha Finalizada</p>
                <p className="text-sm">Edição bloqueada.</p>
                <button onClick={() => setViewMode('DASHBOARD')} className="mt-4 text-brand-orange hover:underline text-sm">Voltar ao painel</button>
              </div>
            );
          }
          return (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
               <h4 className="font-bold text-lg mb-4 text-yellow-800 flex items-center"><Edit2 className="mr-2" size={20}/> Editar Dados</h4>
               <form onSubmit={handleUpdateCampaign} className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Nome da Campanha</label>
                   <input className="w-full p-2 border rounded uppercase" value={editName} onChange={e => setEditName(e.target.value.toUpperCase())} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Meta (R$)</label>
                   <input type="number" step="0.01" className="w-full p-2 border rounded" value={editGoal} onChange={e => setEditGoal(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase">Data de Início</label>
                   <input type="date" className="w-full p-2 border rounded" value={editDate} onChange={e => setEditDate(e.target.value)} />
                 </div>
                 <button type="submit" className="w-full bg-yellow-600 text-white py-2 rounded font-bold hover:bg-yellow-700">Salvar Alterações</button>
               </form>
            </div>
          );

        default: // DASHBOARD
           return (
             <div className="text-center py-10 text-gray-400 bg-gray-50 rounded border border-dashed">
               <TrendingUp size={48} className="mx-auto mb-2 opacity-50"/>
               <p>Selecione uma ação nos botões acima para gerenciar a campanha.</p>
               {isFinished && <p className="text-sm font-bold text-brand-orange mt-2">Esta campanha está finalizada.</p>}
             </div>
           );
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-fade-in-down flex flex-col max-h-[95vh]">
          
          {/* HEADER - Changes color based on Status */}
          <div className={`${isFinished ? 'bg-gray-600' : 'bg-brand-orange'} p-6 flex justify-between items-start text-white shrink-0 transition-colors`}>
            <div>
              <h2 className="text-3xl font-black flex items-center">
                {isFinished ? <CheckCircle className="mr-3" size={32}/> : <Target className="mr-3" size={32}/>} 
                {selectedCampaign.name}
              </h2>
              <p className="text-orange-100 mt-1 text-sm">{selectedCampaign.description}</p>
              <div className="flex items-center space-x-2 mt-2">
                 <p className="text-xs bg-black/20 inline-block px-2 py-1 rounded">Início: {new Date(selectedCampaign.startDate).toLocaleDateString('pt-BR')}</p>
                 {isFinished && <p className="text-xs bg-white text-gray-700 font-bold inline-block px-2 py-1 rounded border shadow-sm">FINALIZADA</p>}
              </div>
            </div>
            <button onClick={() => setSelectedCampaign(null)} className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full">
              <X size={28} />
            </button>
          </div>

          {/* BODY - SCROLLABLE */}
          <div className="p-6 overflow-y-auto flex-1">
            
            {/* 1. STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
               <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                 <p className="text-xs text-gray-500 uppercase font-extrabold tracking-wider">Meta Alvo</p>
                 <p className="text-2xl font-black text-gray-700 mt-1">R$ {selectedCampaign.goal.toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                 <p className="text-xs text-green-600 uppercase font-extrabold tracking-wider">Entradas</p>
                 <p className="text-2xl font-black text-green-700 mt-1">R$ {totalIn.toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                 <p className="text-xs text-red-600 uppercase font-extrabold tracking-wider">Saídas</p>
                 <p className="text-2xl font-black text-red-700 mt-1">R$ {totalOut.toLocaleString('pt-BR')}</p>
               </div>
               <div className="bg-brand-black p-4 rounded-xl border border-gray-800 text-white shadow-lg transform scale-105">
                 <p className="text-xs text-brand-orange uppercase font-extrabold tracking-wider">Saldo Atual</p>
                 <p className="text-2xl font-black mt-1">R$ {balance.toLocaleString('pt-BR')}</p>
               </div>
            </div>

            {/* 2. ACTION BUTTONS */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              <button 
                onClick={() => setViewMode(viewMode === 'LANCAMENTOS' ? 'DASHBOARD' : 'LANCAMENTOS')}
                disabled={isFinished}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    isFinished ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60' : 
                    viewMode === 'LANCAMENTOS' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white hover:bg-orange-50 text-gray-600'
                }`}
              >
                <DollarSign size={20} className="mb-1"/>
                <span className="text-xs font-bold">Lançamentos</span>
              </button>
              
              <button 
                onClick={() => setViewMode(viewMode === 'HISTORICO' ? 'DASHBOARD' : 'HISTORICO')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${viewMode === 'HISTORICO' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white hover:bg-orange-50 text-gray-600'}`}
              >
                <History size={20} className="mb-1"/>
                <span className="text-xs font-bold">Histórico</span>
              </button>

              <button 
                onClick={generateReport}
                className="flex flex-col items-center justify-center p-3 rounded-lg border bg-white hover:bg-blue-50 text-blue-600 border-gray-200"
              >
                <Download size={20} className="mb-1"/>
                <span className="text-xs font-bold">Relatório</span>
              </button>

              <button 
                onClick={() => setViewMode(viewMode === 'EDITAR' ? 'DASHBOARD' : 'EDITAR')}
                disabled={isFinished}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    isFinished ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60' :
                    viewMode === 'EDITAR' ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white hover:bg-orange-50 text-gray-600'
                }`}
              >
                <Edit2 size={20} className="mb-1"/>
                <span className="text-xs font-bold">Editar</span>
              </button>

              <button 
                onClick={handleFinishCampaign}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${isFinished ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-green-50 text-green-600 border-green-200'}`}
              >
                <CheckCircle size={20} className="mb-1"/>
                <span className="text-xs font-bold">{isFinished ? 'Finalizada' : 'Finalizar'}</span>
              </button>
            </div>

            {/* 3. DYNAMIC CONTENT AREA */}
            <div className="min-h-[200px] transition-all duration-300">
               {renderContent()}
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ==================================================================================
  // MAIN RENDER
  // ==================================================================================

  return (
    <div className="space-y-6 relative">
      <CampaignDetailModal />

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <Megaphone className="mr-3 text-brand-orange" /> Campanhas
        </h1>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800"
        >
          <Plus size={20} className="mr-2"/> Cadastrar Campanha
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-fade-in-down mb-6">
          <h3 className="text-lg font-bold mb-4 flex items-center"><Plus className="mr-2"/> Cadastro de Nova Campanha</h3>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Campanha</label>
                <input 
                  type="text" 
                  required
                  placeholder="EX: REFORMA DO TELHADO 2024"
                  className="mt-1 block w-full p-2 border rounded-md uppercase"
                  value={newName}
                  onChange={e => setNewName(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Meta de Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="mt-1 block w-full p-2 border rounded-md"
                  value={newGoal}
                  onChange={e => setNewGoal(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data de Início</label>
                <input 
                  type="date" 
                  required
                  className="mt-1 block w-full p-2 border rounded-md"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  className="mt-1 block w-full p-2 border rounded-md uppercase"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
               <button type="button" onClick={() => setShowCreateForm(false)} className="mr-3 text-gray-500 hover:text-gray-800">Cancelar</button>
               <button type="submit" className="bg-brand-orange text-white px-6 py-2 rounded-lg hover:bg-brand-red font-bold">Salvar Campanha</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {churchCampaigns.map(campaign => {
          // Calculate stats for preview card
          const cTransactions = transactions.filter(t => t.campaignId === campaign.id);
          const raised = cTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
          const progress = Math.min((raised / campaign.goal) * 100, 100);
          const isFinished = campaign.status === 'FINALIZADA';

          return (
            <div key={campaign.id} className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border ${isFinished ? 'border-gray-200 bg-gray-50' : 'border-gray-100'} group relative`}>
              
               {/* DELETE BUTTON */}
               <button 
                onClick={(e) => handleDeleteCampaign(e, campaign.id, campaign.name)}
                className="absolute top-4 right-4 p-1.5 bg-gray-100 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 z-10 transition-colors"
                title="Excluir Campanha"
              >
                <Trash2 size={16}/>
              </button>

              <div className="p-6">
                <div className="flex justify-between items-start mb-4 pr-8">
                  <h3 className={`text-xl font-bold line-clamp-1 transition-colors ${isFinished ? 'text-gray-500' : 'text-gray-900 group-hover:text-brand-orange'}`} title={campaign.name}>{campaign.name}</h3>
                  <div className={`p-2 rounded-full shrink-0 ml-2 ${isFinished ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-brand-orange'}`}>
                    {isFinished ? <CheckCircle size={20} /> : <Target size={20} />}
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm mb-6 h-10 overflow-hidden line-clamp-2">{campaign.description || 'Sem descrição.'}</p>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Arrecadado</span>
                    <span className="font-bold text-gray-900">R$ {raised.toFixed(2)}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`${isFinished ? 'bg-gray-400' : 'bg-brand-orange'} h-2.5 rounded-full transition-all duration-500`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-sm text-gray-500 pt-1">
                    <span className="flex items-center"><DollarSign size={14} className="mr-1"/> Meta: {campaign.goal.toLocaleString('pt-BR')}</span>
                    {isFinished && <span className="text-xs font-bold bg-gray-200 px-2 rounded">CONCLUÍDA</span>}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedCampaign(campaign)}
                  className="w-full text-center bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-brand-black hover:text-white hover:border-transparent transition-all shadow-sm"
                >
                  Gerenciar Campanha
                </button>
              </div>
            </div>
          );
        })}
        {churchCampaigns.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-2"/>
            <p>Nenhuma campanha ativa no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};