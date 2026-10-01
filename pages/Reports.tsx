import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, Search, Filter, Info, ChevronDown, Briefcase, X, ShieldCheck, Users, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';
import { PisPasep } from './PisPasep';
import { getChurchDisplayName } from '../utils/churchUtils';

export const Reports: React.FC = () => {
  const { transactions, currentChurch, generateMonthlyFixedExpenses } = useApp();
  const churchName = getChurchDisplayName(currentChurch);
  
  // Filter States
  const [filterType, setFilterType] = useState<'MONTH' | 'PERIOD'>('MONTH');
  const [reportViewMode, setReportViewMode] = useState<'DETAILED' | 'SUMMARY' | 'PISPASEP'>('DETAILED');
  
  // Month Mode
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Period Mode
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  // Applied Filters
  const [appliedStartDate, setAppliedStartDate] = useState(firstDay);
  const [appliedEndDate, setAppliedEndDate] = useState(lastDay);

  const viewId = currentChurch?.id;

  // --- AUTO GENERATE TRIGGER ---
  useEffect(() => {
      if (!viewId) return;
      let start, end;

      if (filterType === 'MONTH') {
          start = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split('T')[0];
          end = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
      } else {
          start = appliedStartDate;
          end = appliedEndDate;
      }
      generateMonthlyFixedExpenses(viewId, start, end);
  }, [selectedMonth, selectedYear, filterType, appliedStartDate, appliedEndDate, viewId]);

  const handleApplyFilter = () => {
      const finalStart = startDate || '2000-01-01';
      const finalEnd = endDate || new Date().toISOString().split('T')[0];
      setAppliedStartDate(finalStart);
      setAppliedEndDate(finalEnd);
      if (!startDate) setStartDate(finalStart);
      if (!endDate) setEndDate(finalEnd);
  };
  
  const excludedCategories = ['MISSOES', 'JOVENS', 'CRIANCAS', 'ADOLESCENTES', 'SENHORAS', 'SENHORES', 'CARNE', 'CARNÊ'];

  // --- CALCULATIONS ---

  // 1. Determine Date Range Limits based on Filter Type
  let rangeStart: string;
  let rangeEnd: string; // Used for "Up To" in cumulative balance

  if (filterType === 'MONTH') {
      const endObj = new Date(selectedYear, selectedMonth, 0); // Last day of month
      rangeStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      rangeEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endObj.getDate()).padStart(2, '0')}`;
  } else {
      rangeStart = appliedStartDate;
      rangeEnd = appliedEndDate;
  }

  // 2. Filter Transactions for PERIOD FLOW (Entradas/Saídas do Mês/Período)
  const periodTransactions = transactions.filter(t => {
      if (t.churchId !== viewId) return false;
      if (t.campaignId) return false;
      if (excludedCategories.includes(t.category)) return false; 
      if (t.status !== 'PAGO') return false;
      const descUpper = (t.description || '').toUpperCase();
      if (descUpper.includes('CARNÊ') || descUpper.includes('CARNE')) return false;

      const tDate = t.date; // YYYY-MM-DD
      return tDate >= rangeStart && tDate <= rangeEnd;
  }).sort((a,b) => a.date.localeCompare(b.date));

  // --- SUMMARIES ---
  
  // Period Flow
  const totalInPeriod = periodTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
  const totalOutPeriod = periodTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);

  // Balance (Calculado apenas sobre o período, conforme solicitado: Entradas - Saídas)
  const finalBalance = totalInPeriod - totalOutPeriod;

  // Detailed Lists
  const inflowsList = periodTransactions.filter(t => t.type === 'ENTRADA');
  const outflowsList = periodTransactions.filter(t => t.type === 'SAIDA');

  // Sub-grouping for Display (visual layout requirement)
  const dizimosList = inflowsList.filter(t => t.category === 'DIZIMO');
  const ofertasList = inflowsList.filter(t => t.category === 'OFERTA');
  const outrosList = inflowsList.filter(t => !['DIZIMO', 'OFERTA', ...excludedCategories].includes(t.category));

  const totalDizimos = dizimosList.reduce((acc, t) => acc + t.amount, 0);
  const totalOfertas = ofertasList.reduce((acc, t) => acc + t.amount, 0);

  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!showExportModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExportModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal]);

  // Mapeamento amigável de tipos para relatório público
  const getPublicEntryType = (t: Transaction): string => {
    if (t.category === 'DIZIMO') return 'Dízimo';
    if (t.category === 'OFERTA') return 'Oferta';
    const map: Record<string, string> = {
      MISSOES: 'Missões',
      JOVENS: 'Jovens',
      CRIANCAS: 'Crianças',
      ADOLESCENTES: 'Adolescentes',
      SENHORAS: 'Senhoras',
      SENHORES: 'Senhores',
      CONSTRUCAO: 'Construção / Obras',
      OUTROS: 'Outras Contribuições'
    };
    return map[t.category] || 'Contribuição';
  };

  const getPeriodLabel = () => {
    return filterType === 'MONTH' 
        ? `${String(selectedMonth).padStart(2,'0')}/${selectedYear}` 
        : `${new Date(rangeStart).toLocaleDateString('pt-BR')} a ${new Date(rangeEnd).toLocaleDateString('pt-BR')}`;
  };

  // --- PDF GENERATION: DETALHADO (ADMINISTRATIVO) ---
  const generateDetailedPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodLabel = getPeriodLabel();
    
    // Header institucional
    doc.setFillColor(255, 100, 0);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(churchName.toUpperCase() || 'RELATÓRIO FINANCEIRO', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Relatório Financeiro Detalhado — Uso Administrativo / Tesouraria`, pageWidth / 2, 25, { align: 'center' });
    doc.text(`Período: ${periodLabel}`, pageWidth / 2, 31, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, 36, { align: 'center' });

    let finalY = 42;

    // Summary Table
    autoTable(doc, {
        startY: finalY,
        head: [['ENTRADAS (Período)', 'SAÍDAS (Período)', 'SALDO (Período)']],
        body: [[
            `R$ ${totalInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            `R$ ${totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            `R$ ${finalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        ]],
        headStyles: { fillColor: [255, 100, 0], halign: 'center', fontStyle: 'bold' },
        bodyStyles: { halign: 'center', fontStyle: 'bold' },
        columnStyles: {
            0: { textColor: [22, 163, 74] },
            1: { textColor: [220, 38, 38] },
            2: { textColor: finalBalance >= 0 ? [22, 163, 74] : [220, 38, 38] }
        }
    });
    finalY = (doc as any).lastAutoTable.finalY + 12;

    // Entradas Detalhadas
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text("Entradas Detalhadas", 14, finalY);
    finalY += 4;
    
    if (inflowsList.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Data', 'Descrição / Identificação', 'Categoria', 'Valor']],
            body: inflowsList.map(t => [
                new Date(t.date).toLocaleDateString('pt-BR'),
                t.description,
                t.category,
                `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
            foot: [['TOTAL ENTRADAS', '', '', `R$ ${totalInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]],
            footStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontStyle: 'bold' }
        });
        finalY = (doc as any).lastAutoTable.finalY + 12;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhuma entrada registrada no período.", 14, finalY + 4);
        finalY += 12;
    }

    // Saídas Detalhadas
    if (finalY > 230) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text("Saídas Detalhadas", 14, finalY);
    finalY += 4;

    if (outflowsList.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Data', 'Descrição / Finalidade', 'Valor']],
            body: outflowsList.map(t => [
                new Date(t.date).toLocaleDateString('pt-BR'),
                t.description,
                `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
            foot: [['TOTAL SAÍDAS', '', `R$ ${totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]],
            footStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhuma saída registrada no período.", 14, finalY + 4);
        finalY += 10;
    }

    // Rodapé de páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} • Sistema IgrejaApp`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save(`Relatorio_Financeiro_Detalhado_${periodLabel.replace(/\//g, '-')}.pdf`);
    setShowExportModal(false);
  };

  // --- PDF GENERATION: PÚBLICO / PRESTAÇÃO DE CONTAS (SEM NOMES DE DIZIMISTAS) ---
  const generatePublicPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const periodLabel = getPeriodLabel();
    
    // Header institucional
    doc.setFillColor(255, 100, 0);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(churchName.toUpperCase() || 'PRESTAÇÃO DE CONTAS', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 100, 0);
    doc.text(`PRESTAÇÃO DE CONTAS — RELATÓRIO PÚBLICO`, pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Período: ${periodLabel}`, pageWidth / 2, 31, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Relatório para a Congregação`, pageWidth / 2, 36, { align: 'center' });

    let finalY = 42;

    // Resumo Geral do Período
    autoTable(doc, {
        startY: finalY,
        head: [['ENTRADAS (Período)', 'SAÍDAS (Período)', 'SALDO DO PERÍODO']],
        body: [[
            `R$ ${totalInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            `R$ ${totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
            `R$ ${finalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        ]],
        headStyles: { fillColor: [255, 100, 0], halign: 'center', fontStyle: 'bold' },
        bodyStyles: { halign: 'center', fontStyle: 'bold' },
        columnStyles: {
            0: { textColor: [22, 163, 74] },
            1: { textColor: [220, 38, 38] },
            2: { textColor: finalBalance >= 0 ? [22, 163, 74] : [220, 38, 38] }
        }
    });
    finalY = (doc as any).lastAutoTable.finalY + 12;

    // Entradas Públicas (mostra Data, Tipo e Valor - SEM nomes de pessoas)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text("Entradas e Contribuições", 14, finalY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text("* Por privacidade e zelo cristão pastoral, as entradas não exibem nomes de doadores.", 14, finalY + 4.5);
    finalY += 7;

    if (inflowsList.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Data', 'Tipo de Entrada', 'Valor']],
            body: inflowsList.map(t => [
                new Date(t.date).toLocaleDateString('pt-BR'),
                getPublicEntryType(t),
                `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74], fontStyle: 'bold' },
            foot: [['TOTAL ENTRADAS', '', `R$ ${totalInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]],
            footStyles: { fillColor: [240, 253, 244], textColor: [22, 163, 74], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 45, halign: 'right' }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY + 12;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhuma entrada no período.", 14, finalY + 4);
        finalY += 12;
    }

    // Saídas / Despesas (Mostra Data, Para que foi / Descrição e Valor)
    if (finalY > 220) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text("Saídas e Despesas Pagas", 14, finalY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text("Discriminação de todas as despesas da congregação no período.", 14, finalY + 4.5);
    finalY += 7;

    if (outflowsList.length > 0) {
        autoTable(doc, {
            startY: finalY,
            head: [['Data', 'Descrição / Para que foi', 'Valor']],
            body: outflowsList.map(t => [
                new Date(t.date).toLocaleDateString('pt-BR'),
                t.description || 'Despesa eclesiástica',
                `R$ ${t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [220, 38, 38], fontStyle: 'bold' },
            foot: [['TOTAL SAÍDAS', '', `R$ ${totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`]],
            footStyles: { fillColor: [254, 242, 242], textColor: [220, 38, 38], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 45, halign: 'right' }
            }
        });
        finalY = (doc as any).lastAutoTable.finalY + 12;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text("Nenhuma saída registrada no período.", 14, finalY + 4);
        finalY += 12;
    }

    // Nota final de encerramento
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, finalY, pageWidth - 28, 18, 3, 3, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text("Transparência e Prestação de Contas Congregacional", 18, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Relatório emitido pela liderança eclesiástica para acompanhamento de todos os membros e congregação.", 18, finalY + 12);

    // Rodapé de páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} • Prestação de Contas Oficial`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save(`Prestacao_Contas_${periodLabel.replace(/\//g, '-')}.pdf`);
    setShowExportModal(false);
  };

  const renderSectionHeader = (title: string, color: 'green' | 'red') => (
      <div className={`flex items-center font-bold text-lg mb-4 ${color === 'green' ? 'text-green-700' : 'text-red-700'}`}>
          {color === 'green' ? <TrendingUp size={20} className="mr-2"/> : <TrendingDown size={20} className="mr-2"/>}
          {title}
      </div>
  );

  const renderTableBlock = (title: string, data: Transaction[], total: number, colorClass: string) => (
      <div className="mb-6 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
          <div className={`flex justify-between items-center p-3 ${colorClass === 'green' ? 'bg-green-50' : 'bg-gray-50'}`}>
              <h4 className={`text-sm font-bold ${colorClass === 'green' ? 'text-green-800' : 'text-gray-700'}`}>{title}</h4>
              <span className="text-xs font-bold text-gray-600">Total: R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
          <div className="bg-white">
              <table className="w-full text-left">
                  <thead className="bg-white border-b">
                      <tr>
                          <th className="p-2 text-[10px] font-bold text-gray-400 uppercase w-20">Data</th>
                          <th className="p-2 text-[10px] font-bold text-gray-400 uppercase">Descrição</th>
                          <th className="p-2 text-[10px] font-bold text-gray-400 uppercase text-right w-24">Valor</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {data.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                              <td className="p-2 text-[10px] text-gray-500 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                              <td className="p-2 text-[10px] text-gray-700 font-medium uppercase truncate max-w-[200px]">{t.description}</td>
                              <td className={`p-2 text-[10px] font-bold text-right ${colorClass === 'green' ? 'text-green-600' : 'text-gray-700'}`}>
                                  R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                              </td>
                          </tr>
                      ))}
                      {data.length === 0 && (
                          <tr><td colSpan={3} className="p-3 text-center text-[10px] text-gray-400">Nenhum registro encontrado.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <FileText className="mr-2 text-brand-orange"/> Relatórios
                </h2>
                <p className="text-sm text-gray-500">Unidade: {churchName}</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setReportViewMode('DETAILED')}
                    className={`px-4 py-2 rounded text-xs font-bold flex items-center transition-all ${reportViewMode === 'DETAILED' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText size={14} className="mr-2"/> Detalhado
                </button>
                <button 
                    onClick={() => setReportViewMode('SUMMARY')}
                    className={`px-4 py-2 rounded text-xs font-bold flex items-center transition-all ${reportViewMode === 'SUMMARY' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PieChart size={14} className="mr-2"/> Resumido
                </button>
                <button 
                    onClick={() => setReportViewMode('PISPASEP')}
                    className={`px-4 py-2 rounded text-xs font-bold flex items-center transition-all ${reportViewMode === 'PISPASEP' ? 'bg-blue-700 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Briefcase size={14} className="mr-2"/> PIS/PASEP
                </button>
            </div>
        </div>

        {reportViewMode !== 'PISPASEP' && (
        <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center border-t pt-4">
            {/* Toggle Monthly/Period */}
            <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                <button 
                    onClick={() => setFilterType('MONTH')}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all ${filterType === 'MONTH' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                >
                    Mensal
                </button>
                <button 
                    onClick={() => setFilterType('PERIOD')}
                    className={`px-4 py-2 rounded text-xs font-bold transition-all ${filterType === 'PERIOD' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                >
                    Por Período
                </button>
            </div>

            {/* Inputs */}
            <div className="flex-1 w-full flex flex-col md:flex-row gap-2">
                {filterType === 'MONTH' ? (
                    <div className="flex gap-2">
                        <select 
                            value={selectedMonth} 
                            onChange={e => setSelectedMonth(parseInt(e.target.value))} 
                            className="p-2.5 border rounded bg-gray-50 text-xs font-bold uppercase w-40 outline-none"
                        >
                            {Array.from({length: 12}, (_, i) => (
                                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
                            ))}
                        </select>
                        <select 
                            value={selectedYear} 
                            onChange={e => setSelectedYear(parseInt(e.target.value))} 
                            className="p-2.5 border rounded bg-gray-50 text-xs font-bold w-24 outline-none"
                        >
                            <option value={2023}>2023</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full flex-wrap md:flex-nowrap">
                        <div className="relative flex-1 min-w-[120px] h-[42px] border rounded-lg bg-white overflow-hidden group focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange transition-all">
                            <span className="absolute left-2 top-1 text-[8px] text-gray-500 font-bold uppercase tracking-wider">De</span>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="w-full h-full pt-3 pb-1 px-2 text-xs font-bold text-gray-800 bg-transparent outline-none"
                            />
                        </div>
                        <div className="relative flex-1 min-w-[120px] h-[42px] border rounded-lg bg-white overflow-hidden group focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange transition-all">
                            <span className="absolute left-2 top-1 text-[8px] text-gray-500 font-bold uppercase tracking-wider">Até</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="w-full h-full pt-3 pb-1 px-2 text-xs font-bold text-gray-800 bg-transparent outline-none"
                            />
                        </div>
                        <button 
                            onClick={handleApplyFilter} 
                            className="h-[42px] px-6 bg-brand-orange text-white rounded-lg font-bold text-xs hover:bg-brand-red transition-all flex items-center shadow-sm active:scale-95"
                        >
                            <Search size={16} className="mr-2"/> Pesquisar
                        </button>
                    </div>
                )}
            </div>

            <button 
                onClick={() => setShowExportModal(true)}
                className="bg-brand-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center shadow-lg transition-transform active:scale-95 w-full md:w-auto justify-center"
                title="Clique para escolher e baixar a Prestação de Contas ou Relatório Detalhado"
            >
                <Download size={16} className="mr-2 text-brand-orange"/> Prestação de Contas
            </button>
        </div>
        )}
      </div>

      {reportViewMode === 'PISPASEP' ? (
        <PisPasep />
      ) : (
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-brand-orange overflow-hidden pb-4">
          <div className="text-center py-6 border-b border-gray-100">
              <h2 className="text-xl font-extrabold text-brand-black uppercase tracking-wider">RELATÓRIO FINANCEIRO {reportViewMode === 'DETAILED' ? 'DETALHADO' : 'RESUMIDO'}</h2>
              <div className="inline-block bg-orange-50 text-brand-orange px-4 py-1 rounded-full text-xs font-bold mt-2 border border-orange-100">
                  <Calendar size={12} className="inline mr-1"/> 
                  {filterType === 'MONTH' ? `${String(selectedMonth).padStart(2,'0')}/${selectedYear}` : `${new Date(rangeStart).toLocaleDateString()} a ${new Date(rangeEnd).toLocaleDateString()}`}
              </div>
          </div>

          <div className="p-6">
              {reportViewMode === 'DETAILED' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div>
                          {renderSectionHeader('Entradas Detalhadas', 'green')}
                          {renderTableBlock('Dízimos', dizimosList, totalDizimos, 'green')}
                          {renderTableBlock('Ofertas', ofertasList, totalOfertas, 'green')}
                          {outrosList.length > 0 && renderTableBlock('Outras Entradas', outrosList, outrosList.reduce((a,b)=>a+b.amount,0), 'green')}
                          <div className="bg-green-100 p-4 rounded-lg flex justify-between items-center mt-4">
                              <span className="font-bold text-green-800 text-sm uppercase">TOTAL ENTRADAS</span>
                              <span className="font-black text-green-900 text-lg">R$ {totalInPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                      </div>
                      <div>
                          {renderSectionHeader('Saídas Detalhadas', 'red')}
                          {renderTableBlock('Despesas Gerais', outflowsList, totalOutPeriod, 'red')}
                          <div className="bg-red-100 p-4 rounded-lg flex justify-between items-center mt-4">
                              <span className="font-bold text-red-800 text-sm uppercase">TOTAL SAÍDAS</span>
                              <span className="font-black text-red-900 text-lg">R$ {totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 h-32 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-green-600 uppercase mb-1">TOTAL DE DÍZIMOS</p>
                          <p className="text-2xl font-black text-green-700">R$ {totalDizimos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 h-32 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-green-600 uppercase mb-1">TOTAL DE OFERTAS</p>
                          <p className="text-2xl font-black text-green-700">R$ {totalOfertas.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100 h-32 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-red-600 uppercase mb-1">TOTAL DE SAÍDAS</p>
                          <p className="text-2xl font-black text-red-700">R$ {totalOutPeriod.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                  </div>
              )}
          </div>
          
          <div className="mx-6 mb-6 p-5 border rounded-xl bg-gray-50 flex justify-between items-center shadow-sm">
              <span className="text-xl font-black text-brand-black uppercase tracking-tight">SALDO</span>
              <span className={`text-3xl font-black ${finalBalance >= 0 ? 'text-brand-black' : 'text-red-600'}`}>
                  R$ {finalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </span>
          </div>
        </div>
      )}

      {/* MODAL DE OPÇÕES DE DOWNLOAD: RELATÓRIO DETALHADO OU RELATÓRIO PÚBLICO */}
      {showExportModal && (
        <div 
          onClick={() => setShowExportModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative animate-fade-in"
          >
            {/* Fechar */}
            <button 
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-100 text-brand-orange rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Download size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-800 uppercase tracking-tight">
                Exportar Relatório / Prestação de Contas
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Período: <span className="font-bold text-gray-700">{getPeriodLabel()}</span> • {churchName}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Selecione o tipo de PDF que deseja baixar:
              </p>
            </div>

            {/* Opções */}
            <div className="space-y-3">
              {/* Opção 1: Baixar Relatório Público (Prestação de Contas para WhatsApp / Grupos) */}
              <button
                type="button"
                onClick={generatePublicPDF}
                className="w-full text-left p-4 rounded-xl border-2 border-orange-200 hover:border-brand-orange bg-orange-50/50 hover:bg-orange-50 transition-all group flex items-start gap-4 shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-orange text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                  <Users size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-brand-orange transition-colors">
                      Baixar Relatório Público
                    </span>
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                      Recomendado p/ Grupos
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Mostra apenas <strong>Data, Tipo e Valor</strong> nas entradas (<strong>sem o nome da pessoa</strong> que dizimou). Saídas completas com datas e motivos. Ideal para enviar no grupo da igreja.
                  </p>
                </div>
              </button>

              {/* Opção 2: Baixar Relatório Detalhado (Administração) */}
              <button
                type="button"
                onClick={generateDetailedPDF}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-gray-400 bg-gray-50 hover:bg-white transition-all group flex items-start gap-4 shadow-sm hover:shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                  <FileText size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                      Baixar Relatório Detalhado
                    </span>
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full shrink-0">
                      Uso Administrativo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Relatório interno completo para pastor e tesoureiro. Inclui as descrições integrais com identificação de cada membro dizimista/ofertante e todas as movimentações.
                  </p>
                </div>
              </button>
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};