import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { TrendingUp, Wallet, Filter } from 'lucide-react';

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

export const MemberFinanceiro: React.FC = () => {
  const { contributions, currentMonthTithes } = useMember();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Histórico Financeiro</h1>
        <p className="text-gray-400 text-sm mt-1">Suas contribuições registradas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Dízimo Mês
          </p>
          <p className="text-orange-400 text-sm font-bold">
            {formatCurrency(currentMonthTithes)}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Total Dízimos
          </p>
          <p className="text-green-400 text-sm font-bold">
            {formatCurrency(totalTithes)}
          </p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Total Ofertas
          </p>
          <p className="text-blue-400 text-sm font-bold">
            {formatCurrency(totalOfferings)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-gray-500" />
        {(['TODOS', 'DIZIMO', 'OFERTA'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {f === 'TODOS' ? 'Todos' : categoryLabel[f]}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-10 text-center">
          <Wallet size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma contribuição encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => (
            <div
              key={txn.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                  <TrendingUp size={15} className="text-green-400" />
                </div>
                <div>
                  <p className="text-gray-100 text-sm font-semibold">
                    {categoryLabel[txn.category] || txn.category}
                  </p>
                  <p className="text-gray-500 text-xs">{formatDate(txn.date)}</p>
                  {txn.description && (
                    <p className="text-gray-600 text-[10px] truncate max-w-[160px]">
                      {txn.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold text-sm">
                  {formatCurrency(txn.amount)}
                </p>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    txn.status === 'PAGO'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}
                >
                  {txn.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex justify-between items-center">
          <span className="text-gray-400 text-xs font-semibold">
            Total ({filtered.length} registros)
          </span>
          <span className="text-gray-100 font-bold text-sm">
            {formatCurrency(filtered.reduce((s, t) => s + t.amount, 0))}
          </span>
        </div>
      )}
    </div>
  );
};
