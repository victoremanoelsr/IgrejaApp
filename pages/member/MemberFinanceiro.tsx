import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { TrendingUp, Wallet, Filter, FileDown } from 'lucide-react';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const categoryLabel: Record<string, string> = {
  DIZIMO: 'Dízimo',
  OFERTA: 'Oferta',
};

type FilterType = 'TODOS' | 'DIZIMO' | 'OFERTA';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export const MemberFinanceiro: React.FC = () => {
  const { contributions, currentMonthTithes, isLoading } = useMember();
  const [filter, setFilter] = useState<FilterType>('TODOS');

  const filtered = contributions.filter((t) =>
    filter === 'TODOS' ? true : t.category === filter
  );

  const totalTithes = contributions.filter((t) => t.category === 'DIZIMO').reduce((s, t) => s + t.amount, 0);
  const totalOfferings = contributions.filter((t) => t.category === 'OFERTA').reduce((s, t) => s + t.amount, 0);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const handleExportYear = () => {
    const year = new Date().getFullYear();
    const yearContribs = contributions.filter((t) => t.date?.startsWith(String(year)));
    const lines = [
      'Data,Tipo,Valor,Descrição',
      ...yearContribs.map(
        (t) => `${formatDate(t.date)},${categoryLabel[t.category] || t.category},${t.amount.toFixed(2)},${t.description || ''}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contribuicoes_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Histórico Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Suas contribuições registradas</p>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Dízimo Mês</p>
            <p className="text-orange-500 text-sm font-bold">{formatCurrency(currentMonthTithes)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Total Dízimos</p>
            <p className="text-green-600 text-sm font-bold">{formatCurrency(totalTithes)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">Total Ofertas</p>
            <p className="text-blue-600 text-sm font-bold">{formatCurrency(totalOfferings)}</p>
          </div>
        </div>
      )}

      {/* Filter + Export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          {(['TODOS', 'DIZIMO', 'OFERTA'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : categoryLabel[f]}
            </button>
          ))}
        </div>
        {contributions.length > 0 && (
          <button onClick={handleExportYear} className="text-gray-400 hover:text-orange-500 transition-colors" title="Exportar">
            <FileDown size={16} />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <Wallet size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma contribuição encontrada.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {filtered.map((txn) => (
            <div key={txn.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center shrink-0">
                  <TrendingUp size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-semibold">
                    {categoryLabel[txn.category] || txn.category}
                  </p>
                  <p className="text-gray-400 text-xs">{formatDate(txn.date)}</p>
                  {txn.description && (
                    <p className="text-gray-300 text-[10px] truncate max-w-[160px]">{txn.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-bold text-sm">{formatCurrency(txn.amount)}</p>
                {txn.status && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    txn.status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {txn.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center">
          <span className="text-gray-500 text-xs font-semibold">Total ({filtered.length} registros)</span>
          <span className="text-gray-800 font-bold text-sm">{formatCurrency(total)}</span>
        </div>
      )}

      {contributions.length > 0 && (
        <button
          onClick={handleExportYear}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl transition-all text-sm shadow-sm"
        >
          <FileDown size={16} />
          Exportar Relatório {new Date().getFullYear()}
        </button>
      )}
    </div>
  );
};
