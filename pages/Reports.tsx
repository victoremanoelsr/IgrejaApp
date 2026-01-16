import React, { useState } from 'react';
import { useApp } from '../context';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '../types';

export const Reports: React.FC = () => {
  const { transactions, currentChurch } = useApp();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const viewId = currentChurch?.id;
  const monthString = selectedMonth.toString().padStart(2, '0');
  
  // Filter by VIEWED Church ID, not User Church ID
  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return t.churchId === viewId && 
           (d.getMonth() + 1) === selectedMonth && 
           d.getFullYear() === selectedYear;
  });

  // --- Grouping Data ---
  const missionsList = filteredTransactions.filter(t => t.category === 'MISSOES' && t.type === 'ENTRADA');
  const tithesList = filteredTransactions.filter(t => t.category === 'DIZIMO' && t.type === 'ENTRADA');
  const offeringsList = filteredTransactions.filter(t => t.category === 'OFERTA' && t.type === 'ENTRADA');
  const exitsList = filteredTransactions.filter(t => t.type === 'SAIDA');

  // --- Calculations ---
  const totalMissions = missionsList.reduce((acc, t) => acc + t.amount, 0);
  const totalTithes = tithesList.reduce((acc, t) => acc + t.amount, 0);
  const totalOfferings = offeringsList.reduce((acc, t) => acc + t.amount, 0);
  
  const totalIn = totalMissions + totalTithes + totalOfferings;
  const totalOut = exitsList.reduce((acc, t) => acc + t.amount, 0);
  const finalBalance = totalIn - totalOut;

  // --- Helper for PDF ---
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const orange = [249, 115, 22]; // brand-orange RGB

    // Header
    doc.setFontSize(22);
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(currentChurch?.name.toUpperCase() || 'IGREJA', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`RELATÓRIO FINANCEIRO DETALHADO - ${monthString}/${selectedYear}`, pageWidth / 2, 30, { align: 'center' });
    if(currentChurch?.cnpj) doc.text(`CNPJ: ${currentChurch.cnpj}`, pageWidth / 2, 36, { align: 'center' });

    let finalY = 45;

    // Helper to print tables
    const printTable = (title: string, data: Transaction[], color: [number, number, number]) => {
        if (data.length === 0) return;
        
        doc.text(title, 14, finalY + 10);
        
        autoTable(doc, {
            startY: finalY + 15,
            head: [['DATA', 'DESCRIÇÃO / NOME', 'VALOR (R$)']],
            body: data.map(t => [
                new Date(t.date).toLocaleDateString('pt-BR'),
                t.description,
                t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})
            ]),
            theme: 'grid',
            headStyles: { fillColor: color, fontStyle: 'bold' },
            columnStyles: { 
                0: { cellWidth: 30 }, 
                2: { cellWidth: 40, halign: 'right' } 
            },
        });
        finalY = (doc as any).lastAutoTable.finalY + 5;
    };

    // Print Tables
    printTable(`DÍZIMOS (Total: R$ ${totalTithes.toFixed(2)})`, tithesList, [22, 163, 74]); // Green
    printTable(`OFERTAS (Total: R$ ${totalOfferings.toFixed(2)})`, offeringsList, [22, 163, 74]); // Green
    printTable(`MISSÕES (Total: R$ ${totalMissions.toFixed(2)})`, missionsList, [22, 163, 74]); // Green
    printTable(`SAÍDAS (Total: R$ ${totalOut.toFixed(2)})`, exitsList, [220, 38, 38]); // Red

    // Final Summary Box
    finalY += 10;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY, 182, 25, 'F');
    
    doc.setFontSize(10);
    doc.text('TOTAL ENTRADAS', 20, finalY + 8);
    doc.text('TOTAL SAÍDAS', 80, finalY + 8);
    doc.text('SALDO FINAL', 140, finalY + 8);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 20, finalY + 18);
    
    doc.setTextColor(220, 38, 38);
    doc.text(`R$ ${totalOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 80, finalY + 18);
    
    doc.setTextColor(0, 0, 0);
    doc.text(`R$ ${finalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 140, finalY + 18);

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text("Tesoureiro(a)", 30, footerY);
    doc.line(20, footerY - 5, 70, footerY - 5);

    doc.text("Pastor Presidente", 140, footerY);
    doc.line(130, footerY - 5, 180, footerY - 5);

    doc.save(`relatorio_${selectedMonth}_${selectedYear}.pdf`);
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição / Nome</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                {new Date(t.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900 uppercase">
                                {t.description}
                            </td>
                            <td className={`px-6 py-2 whitespace-nowrap text-right text-sm font-bold ${type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">Nenhum registro encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Controls Header */}
      <div className="bg-white p-6 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-brand-orange"/> Relatórios Mensais</h2>
           <p className="text-gray-500 text-sm">Unidade: <span className="font-semibold">{currentChurch?.name}</span></p>
        </div>
        <div className="flex space-x-4">
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange">
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange">
             <option value={2023}>2023</option>
             <option value={2024}>2024</option>
             <option value={2025}>2025</option>
             <option value={2026}>2026</option>
          </select>
          <button onClick={generatePDF} className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow transition-transform hover:scale-105">
             <Download size={18} className="mr-2"/> PDF
           </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-8 border-brand-orange">
         <div className="text-center mb-10">
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-widest">Resumo Financeiro</h3>
            <p className="text-brand-orange font-bold">{monthString}/{selectedYear}</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Entradas */}
            <div>
                <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><TrendingUp className="mr-2 text-green-600"/> Entradas Detalhadas</h3>
                
                <TransactionTable title="Dízimos" data={tithesList} total={totalTithes} type="IN" />
                <TransactionTable title="Ofertas" data={offeringsList} total={totalOfferings} type="IN" />
                <TransactionTable title="Missões" data={missionsList} total={totalMissions} type="IN" />
                
                <div className="bg-green-100 p-4 rounded-lg flex justify-between items-center border border-green-200">
                   <span className="font-bold text-green-800">TOTAL ENTRADAS</span>
                   <span className="text-xl font-black text-green-700">R$ {totalIn.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>

            {/* Right Column: Saídas & Saldo */}
            <div className="flex flex-col h-full">
                <h3 className="text-xl font-bold text-gray-700 mb-4 flex items-center border-b pb-2"><TrendingDown className="mr-2 text-red-600"/> Saídas Detalhadas</h3>
                
                <TransactionTable title="Despesas Gerais" data={exitsList} total={totalOut} type="OUT" />

                <div className="mt-auto space-y-4">
                    <div className="bg-red-100 p-4 rounded-lg flex justify-between items-center border border-red-200">
                        <span className="font-bold text-red-800">TOTAL SAÍDAS</span>
                        <span className="text-xl font-black text-red-700">R$ {totalOut.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>

                    <div className="bg-brand-black p-6 rounded-xl flex justify-between items-center shadow-lg text-white transform scale-105 origin-bottom">
                        <div className="flex items-center">
                            <DollarSign size={32} className="text-brand-yellow mr-3"/>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Saldo Final</p>
                                <p className="text-sm text-gray-300">Após todas as operações</p>
                            </div>
                        </div>
                        <span className={`text-3xl font-black ${finalBalance >= 0 ? 'text-brand-yellow' : 'text-red-400'}`}>
                            R$ {finalBalance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};