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
  <div className={`animate-pulse bg-slate-800 rounded-xl ${className}`} />
);

export const MemberFinanceiro: React.FC = () => {
  const { contributions, currentMonthTithes, isLoading } = useMember();
  const [filter, setFilter] = useState<FilterType>('TODOS');

  const filtered = contributions.filter((t) =>
    filter === 'TODOS' ? true : t.category === filter
  );

  const totalTithes = contributions
    .filter((t) => t.category === 'DIZIMO')
    .reduce((s, t) => s + t.amount, 0);
  const totalOfferings = contributions
    .filter((t) => t.category === 'OFERTA')
    .reduce((s, t) => s + t.amount, 0);
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const handleExportYear = () => {
    const year = new Date().getFullYear();
    const yearContribs = contributions.filter((t) => t.date?.startsWith(String(year)));
    const lines = [
      'Data,Tipo,Valor,Descrição',
      ...yearContribs.map(
        (t) =>
          `${formatDate(t.date)},${categoryLabel[t.category] || t.category},${t.amount.toFixed(2)},${t.description || ''}`
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
    <div className="space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Histórico Financeiro</h1>
        <p className="text-slate-400 text-sm mt-1">Suas contribuições registradas</p>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              Dízimo Mês
            </p>
            <p className="text-orange-400 text-sm font-bold">{formatCurrency(currentMonthTithes)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              Total Dízimos
            </p>
            <p className="text-emerald-400 text-sm font-bold">{formatCurrency(totalTithes)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 text-center">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              Total Ofertas
            </p>
            <p className="text-blue-400 text-sm font-bold">{formatCurrency(totalOfferings)}</p>
          </div>
        </div>
      )}

      {/* Filter + Export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500 shrink-0" />
          {(['TODOS', 'DIZIMO', 'OFERTA'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:text-slate-200'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : categoryLabel[f]}
            </button>
          ))}
        </div>
        {contributions.length > 0 && (
          <button
            onClick={handleExportYear}
            className="flex items-center gap-1 text-slate-400 hover:text-orange-400 transition-colors text-xs"
            title="Exportar relatório anual"
          >
            <FileDown size={15} />
          </button>
        )}
      </div>

      {/* Transactions */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-10 text-center">
          <Wallet size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma contribuição encontrada.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
          {filtered.map((txn) => (
            <div key={txn.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    txn.category === 'DIZIMO'
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-blue-500/10 border border-blue-500/20'
                  }`}
                >
                  <TrendingUp
                    size={16}
                    className={
                      txn.category === 'DIZIMO' ? 'text-emerald-400' : 'text-blue-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-semibold">
                    {categoryLabel[txn.category] || txn.category}
                  </p>
                  <p className="text-slate-500 text-[11px]">{formatDate(txn.date)}</p>
                  {txn.description && (
                    <p className="text-slate-600 text-[10px] truncate max-w-[140px]">
                      {txn.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold text-sm ${
                    txn.category === 'DIZIMO' ? 'text-emerald-400' : 'text-blue-400'
                  }`}
                >
                  {formatCurrency(txn.amount)}
                </p>
                {txn.status && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      txn.status === 'PAGO'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {txn.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {filtered.length > 0 && (
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 flex justify-between items-center">
          <span className="text-slate-400 text-sm font-semibold">
            Total ({filtered.length} registros)
          </span>
          <span className="text-white font-bold text-base">{formatCurrency(total)}</span>
        </div>
      )}

      {/* Export button */}
      {contributions.length > 0 && (
        <button
          onClick={handleExportYear}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 active:scale-[0.98] text-slate-300 font-semibold py-3.5 rounded-2xl transition-all text-sm"
        >
          <FileDown size={16} />
          Exportar Relatório {new Date().getFullYear()}
        </button>
      )}

      <div className="h-2" />
    </div>
  );
};
