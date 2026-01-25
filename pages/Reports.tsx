
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Search, HeartHandshake } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';

export const Reports: React.FC = () => {
  const { transactions, currentChurch, generateMonthlyFixedExpenses } = useApp();
  
  // Filter States
  const [filterType, setFilterType] = useState<'MONTH' | 'PERIOD'>('MONTH');
  
  // View Mode State: DETAILED (Lista tudo) vs SUMMARY (Só totais)
  const [reportViewMode, setReportViewMode] = useState<'DETAILED' | 'SUMMARY'>('DETAILED');
  
  // Month Mode
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Period Mode - Inputs (O que o usuário digita/seleciona)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  // Period Mode - Applied (O que o sistema usa para filtrar após clicar em Pesquisar)
  const [appliedStartDate, setAppliedStartDate] = useState(firstDay);
  const [appliedEndDate, setAppliedEndDate] = useState(lastDay);

  const viewId = currentChurch?.id;
  const monthString = selectedMonth.toString().padStart(2, '0');

  // --- AUTO GENERATE TRIGGER (RANGE AWARE) ---
  useEffect(() => {
      if (!viewId) return;

      if (filterType === 'MONTH') {
          // Gerar apenas para o mês selecionado
          const start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
          const end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
          generateMonthlyFixedExpenses(viewId, start, end);
      } else {
          // Gerar para o range aplicado
          generateMonthlyFixedExpenses(viewId, appliedStartDate, appliedEndDate);
      }
  }, [selectedMonth, selectedYear, filterType, appliedStartDate, appliedEndDate, viewId]);

  // Função para aplicar o filtro de período com tratamento de dados vazios
  const handleApplyFilter = () => {
      // Tratamento: Se vazio, assume datas padrão
      const finalStart = startDate ? startDate : '2000-01-01'; // Início dos tempos
      const finalEnd = endDate ? endDate : new Date().toISOString().split('T')[0]; // Hoje

      setAppliedStartDate(finalStart);
      setAppliedEndDate(finalEnd);
      
      // Atualiza os inputs visuais para refletir o que foi aplicado caso estivessem vazios
      if (!startDate) setStartDate(finalStart);
      if (!endDate) setEndDate(finalEnd);
  };
  
  // --- FILTERING LOGIC ---
  const filteredTransactions = transactions.filter(t => {
    // 1. Basic Filters & Security (Isolamento por Unidade)
    if (t.churchId !== viewId) return false;
    if (t.campaignId) return false; // Exclude campaigns

    // 2. Date Filters
    if (filterType === 'MONTH') {
        const d = new Date(t.date + 'T12:00:00'); // Fix TZ issues
        return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    } else {
        // Period Mode: Lógica GTE (>=) e LTE (<=)
        const tDate = t.date.substring(0, 10); 
        return tDate >= appliedStartDate && tDate <= appliedEndDate;
    }
  });

  // --- Grouping Data (Status Aware) ---
  const tithesList = filteredTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA');
  const offeringsList = filteredTransactions.filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA');
  const missionsInList = filteredTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA');
  const otherEntriesList = filteredTransactions.filter(t => (t.category === 'OUTROS' || t.category === 'CONSTRUCAO') && t.type === 'ENTRADA');
  
  // Exits Split
  const missionsOutList = filteredTransactions.filter(t => t.category === 'MISSOES' && t.type === 'SAIDA');
  const generalExitsList = filteredTransactions
    .filter(t => t.type === 'SAIDA' && t.category !== 'MISSOES')
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Calculations ---
  // 1. Entradas Totais
  const totalIn = filteredTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  
  // 2. Totais por Categoria
  const totalTithes = tithesList.reduce((acc, t) => acc + t.amount, 0);
  const totalOfferings = offeringsList.reduce((acc, t) => acc + t.amount, 0);
  const totalMissionsIn = missionsInList.reduce((acc, t) => acc + t.amount, 0);
  const totalOther = otherEntriesList.reduce((acc, t) => acc + t.amount, 0);

  // 3. Saídas Totais (Real + Pendente)
  // TOTAL GERAL (Todas as saídas)
  const totalOutProjected = filteredTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
  
  const totalMissionsOut = missionsOutList.reduce((acc, t) => acc + t.amount, 0);
  // TOTAL APENAS DESPESAS (Sem missões)
  const totalGeneralExits = generalExitsList.reduce((acc, t) => acc + t.amount, 0);

  const balanceProjected = totalIn - totalOutProjected;

  // --- Dynamic Labels ---
  const getPeriodLabel = () => {
      if (filterType === 'MONTH') {
          return `${monthString}/${selectedYear}`;
      }
      if (!appliedStartDate || !appliedEndDate) return "Período";
      const startParts = appliedStartDate.split('-');
      const endParts = appliedEndDate.split('-');
      return `${startParts[2]}/${startParts[1]}/${startParts[0]} a ${endParts[2]}/${endParts[1]}/${endParts[0]}`;
  };

  // --- Helper for PDF ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const orange = [249, 115, 22]; 

    // Header
    doc.setFontSize(22);
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(currentChurch?.name.toUpperCase() || 'IGREJA', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const reportTitle = reportViewMode === 'DETAILED' ? 'RELATÓRIO DETALHADO' : 'RELATÓRIO RESUMIDO';
    doc.text(`${reportTitle} (${filterType === 'MONTH' ? 'MENSAL' : 'PERÍODO'})`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: ${getPeriodLabel()}`, pageWidth / 2, 36, { align: 'center' });
    
    if(currentChurch?.cnpj) doc.text(`CNPJ: ${currentChurch.cnpj}`, pageWidth / 2, 42, { align: 'center' });

    let finalY = 50;

    // --- MODO SINTÉTICO (RESUMO) ---
    if (reportViewMode === 'SUMMARY') {
        autoTable(doc, {
            startY: finalY + 5,
            head: [['CATEGORIA', 'TIPO', 'VALOR (R$)']],
            body: [
                ['DÍZIMOS', 'ENTRADA', totalTithes.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['OFERTAS', 'ENTRADA', totalOfferings.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['TOTAL DE MISSÕES', 'ENTRADA', totalMissionsIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['OUTRAS ENTRADAS', 'ENTRADA', totalOther.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['', '', ''], 
                ['MISSÕES (SAÍDAS)', 'SAÍDA', totalMissionsOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['DESPESAS GERAIS', 'SAÍDA', totalGeneralExits.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                ['', '', ''], 
                ['TOTAL ENTRADAS', 'ENTRADA', totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
                // No modo SINTÉTICO, mostra apenas o total de Despesas Gerais (Sem missões)
                ['TOTAL SAÍDAS', 'SAÍDA', totalGeneralExits.toLocaleString('pt-BR', {minimumFractionDigits: 2})], 
                ['SALDO FINAL', (balanceProjected >= 0 ? 'POSITIVO' : 'NEGATIVO'), balanceProjected.toLocaleString('pt-BR', {minimumFractionDigits: 2})],
            ],
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], fontStyle: 'bold' },
            columnStyles: { 
                2: { halign: 'right', fontStyle: 'bold' } 
            },
            didParseCell: function(data) {
                if (data.row.raw[0] === 'TOTAL ENTRADAS') {
                    data.cell.styles.textColor = [22, 163, 74];
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.row.raw[0] === 'TOTAL SAÍDAS') {
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.row.raw[0] === 'MISSÕES (SAÍDAS)') {
                    data.cell.styles.textColor = [220, 38, 38];
                }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
        
    } else {
        // --- MODO DETALHADO (LISTAS) ---
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text("RESUMO CONSOLIDADO", 14, finalY + 5);
        
        autoTable(doc, {
            startY: finalY + 8,
            head: [['ENTRADAS', 'SAÍDAS', 'SALDO']],
            body: [[
                `R$ ${totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
                // No modo DETALHADO, mostra o Total Geral (Despesas + Missões)
                `R$ ${totalOutProjected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 
                `R$ ${balanceProjected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]],
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: 'bold' },
            bodyStyles: { fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { textColor: [22, 163, 74] },
                1: { textColor: [220, 38, 38] },
                2: { textColor: balanceProjected >= 0 ? [0, 0, 0] : [220, 38, 38] }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;

        // Helper to print tables
        const printTable = (title: string, data: Transaction[], color: [number, number, number]) => {
            if (data.length === 0) return;
            if (finalY > 250) { doc.addPage(); finalY = 20; }

            doc.setFontSize(10);
            doc.setTextColor(0,0,0);
            doc.text(title, 14, finalY + 10);
            
            autoTable(doc, {
                startY: finalY + 15,
                head: [['DATA', 'DESCRIÇÃO / NOME', 'STATUS', 'VALOR (R$)']],
                body: data.map(t => [
                    new Date(t.date).toLocaleDateString('pt-BR'),
                    t.description.replace('(PROJEÇÃO)', '(FIXO)'), // Ajuste visual para PDF
                    t.status === 'PENDENTE' ? 'A PAGAR' : 'PAGO',
                    t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})
                ]),
                theme: 'grid',
                headStyles: { fillColor: color, fontStyle: 'bold' },
                bodyStyles: { textColor: 0 },
                columnStyles: { 
                    0: { cellWidth: 30 }, 
                    2: { cellWidth: 30, fontStyle: 'bold' },
                    3: { cellWidth: 40, halign: 'right' } 
                },
                didParseCell: function(data) {
                    // Force RED for all exits (column index 3 is Value)
                    if (data.column.index === 3 && title.includes('SAÍDAS') || title.includes('DESPESAS')) {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });
            finalY = (doc as any).lastAutoTable.finalY + 5;
        };

        printTable(`DÍZIMOS (Total: R$ ${totalTithes.toFixed(2)})`, tithesList, [22, 163, 74]); 
        printTable(`OFERTAS (Total: R$ ${totalOfferings.toFixed(2)})`, offeringsList, [22, 163, 74]); 
        printTable(`TOTAL DE MISSÕES (Total: R$ ${totalMissionsIn.toFixed(2)})`, missionsInList, [22, 163, 74]); 
        if (otherEntriesList.length > 0) printTable(`OUTROS (Total: R$ ${totalOther.toFixed(2)})`, otherEntriesList, [22, 163, 74]);
        
        // Single table for Exits
        printTable(`SAÍDAS DE MISSÕES (Total: R$ ${totalMissionsOut.toFixed(2)})`, missionsOutList, [220, 38, 38]); 
        printTable(`DESPESAS GERAIS (Total: R$ ${totalGeneralExits.toFixed(2)})`, generalExitsList, [220, 38, 38]); 
    }

    doc.save(`relatorio_${reportViewMode.toLowerCase()}_${getPeriodLabel().replace(/\//g, '-')}.pdf`);
  };

  // --- Render Transaction Table Component ---
  const TransactionTable = ({ title, data, total, type }: { title: string, data: Transaction[], total: number, type: 'IN' | 'OUT' }) => (
    <div className="mb-8 border rounded-lg overflow-hidden shadow-sm">
        <div className={`p-4 flex justify-between items-center ${type === 'IN' ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
            <h4 className={`font-bold text-lg ${type === 'IN' ? 'text-green-800' : 'text-red-800'}`}>{title}</h4>
            <span className="font-bold text-gray-700">Total: R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
        </div>
        <div className="bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map(t => {
                        const isPending = t.status === 'PENDENTE';
                        return (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                {new Date(t.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                                {/* Substitui visualmente PROJEÇÃO por FIXO e remove o badge PENDENTE conforme solicitado */}
                                {t.description.replace('(PROJEÇÃO)', '(FIXO)')} 
                            </td>
                            {/* Force RED for all OUT types, removing condition for pending orange */}
                            <td className={`px-6 py-2 whitespace-nowrap text-right text-sm font-bold ${type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    )})}
                    {data.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">Nenhum registro encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  const SummaryCard = ({ title, value, colorClass, bgClass, icon: Icon }: { title: string, value: number, colorClass: string, bgClass: string, icon?: any }) => (
      <div className={`p-6 rounded-xl border ${bgClass} shadow-sm flex flex-col justify-between h-32`}>
          <div className="flex justify-between items-start">
            <p className={`text-xs font-bold uppercase tracking-wider opacity-70 ${colorClass}`}>{title}</p>
            {Icon && <Icon size={16} className={`opacity-50 ${colorClass}`}/>}
          </div>
          <p className={`text-3xl font-black ${colorClass}`}>R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>
  );

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="bg-white p-6 rounded-xl shadow-md flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-brand-orange"/> Relatórios</h2>
                <p className="text-gray-500 text-sm">Unidade: <span className="font-semibold">{currentChurch?.name}</span></p>
            </div>
            
            {/* VIEW MODE TOGGLE */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setReportViewMode('DETAILED')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'DETAILED' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <FileText size={16} className="mr-2"/> Detalhado
                </button>
                <button 
                    onClick={() => setReportViewMode('SUMMARY')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'SUMMARY' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <PieChart size={16} className="mr-2"/> Resumido
                </button>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full border-t pt-4">
          {/* Toggle Type */}
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-fit h-fit">
             <button 
                onClick={() => setFilterType('MONTH')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'MONTH' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
             >
                Mensal
             </button>
             <button 
                onClick={() => setFilterType('PERIOD')}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === 'PERIOD' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
             >
                Por Período
             </button>
          </div>

          {/* Dynamic Inputs */}
          <div className="flex flex-1 gap-2 items-center flex-wrap md:flex-nowrap">
             {filterType === 'MONTH' ? (
                <>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]">
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                    ))}
                  </select>
                  <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]">
                    <option value={2023}>2023</option>
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </>
             ) : (
                <div className="flex items-center gap-2 w-full flex-wrap md:flex-nowrap">
                    <div className="relative w-full md:w-auto flex-1">
                        <span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">De</span>
                        <input 
                            type="date" 
                            className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full md:w-auto flex-1">
                        <span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">Até</span>
                        <input 
                            type="date" 
                            className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    {/* Botão PESQUISAR apenas para Período */}
                    <button 
                        onClick={handleApplyFilter}
                        className="bg-brand-orange text-white px-4 h-[42px] rounded-lg flex items-center justify-center hover:bg-brand-red shadow-sm transition-colors w-full md:w-auto"
                        title="Filtrar Período"
                    >
                        <Search size={18} className="mr-1"/> <span className="font-bold text-sm">Pesquisar</span>
                    </button>
                </div>
             )}
          </div>

          <button onClick={generatePDF} className="bg-brand-black text-white px-6 py-2 h-[42px] rounded-lg flex items-center justify-center hover:bg-gray-800 shadow transition-transform hover:scale-105 shrink-0 ml-auto w-full md:w-auto">
             <Download size={18} className="mr-2"/> <span>Baixar PDF {reportViewMode === 'SUMMARY' ? 'Resumido' : 'Detalhado'}</span>
           </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-8 border-brand-orange">
         <div className="text-center mb-10">
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest">
                {reportViewMode === 'DETAILED' ? 'Relatório Financeiro Detalhado' : 'Relatório Financeiro Resumido'}
            </h3>
            <div className="inline-flex items-center bg-orange-50 text-brand-orange px-3 py-1 rounded-full border border-orange-200 mt-2">
                <Calendar size={14} className="mr-2"/>
                <span className="font-bold text-sm">{getPeriodLabel()}</span>
            </div>
         </div>

         {/* CONDITIONAL RENDERING BASED ON VIEW MODE */}
         {reportViewMode === 'SUMMARY' ? (
             <div className="animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                     <SummaryCard title="Total de Dízimos" value={totalTithes} colorClass="text-green-700" bgClass="bg-green-50 border-green-200" />
                     <SummaryCard title="Total de Ofertas" value={totalOfferings} colorClass="text-green-700" bgClass="bg-green-50 border-green-200" />
                     <SummaryCard title="TOTAL DE MISSÕES" value={totalMissionsIn} colorClass="text-green-700" bgClass="bg-green-50 border-green-200" />
                     <SummaryCard title="Missões (Saídas)" value={totalMissionsOut} colorClass="text-red-700" bgClass="bg-red-50 border-red-200" icon={HeartHandshake}/>
                     {/* No Resumo, Total de Saídas mostra apenas Despesas Gerais */}
                     <SummaryCard title="Total de Saídas" value={totalGeneralExits} colorClass="text-red-700" bgClass="bg-red-50 border-red-200" />
                 </div>
             </div>
         ) : (
             <div className="animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Entradas */}
                    <div>
                        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><TrendingUp className="mr-2 text-green-600"/> Entradas Detalhadas</h3>
                        
                        <TransactionTable title="Dízimos" data={tithesList} total={totalTithes} type="IN" />
                        <TransactionTable title="Ofertas" data={offeringsList} total={totalOfferings} type="IN" />
                        <TransactionTable title="TOTAL DE MISSÕES" data={missionsInList} total={totalMissionsIn} type="IN" />
                        {otherEntriesList.length > 0 && (
                            <TransactionTable title="Outras Entradas" data={otherEntriesList} total={totalOther} type="IN" />
                        )}
                        
                        <div className="bg-green-100 p-4 rounded-lg flex justify-between items-center border border-green-200">
                        <span className="font-bold text-green-800">TOTAL ENTRADAS</span>
                        <span className="text-xl font-black text-green-700">R$ {totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    {/* Right Column: Saídas (Separado) */}
                    <div className="flex flex-col h-full">
                        <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><TrendingDown className="mr-2 text-red-600"/> Saídas Detalhadas</h3>
                        
                        {missionsOutList.length > 0 && (
                            <TransactionTable 
                                title="Saídas de Missões" 
                                data={missionsOutList} 
                                total={totalMissionsOut} 
                                type="OUT" 
                            />
                        )}

                        <TransactionTable 
                            title="Despesas Gerais" 
                            data={generalExitsList} 
                            total={totalGeneralExits} 
                            type="OUT" 
                        />
                        
                        <div className="mt-auto space-y-4">
                            <div className="bg-red-100 p-4 rounded-lg flex justify-between items-center border border-red-200">
                                <span className="font-bold text-red-800">TOTAL SAÍDAS</span>
                                {/* No modo Detalhado, mostra o Total Geral (Despesas + Missões) */}
                                <span className="text-xl font-black text-red-700">R$ {totalOutProjected.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
         )}
      </div>
    </div>
  );
};
