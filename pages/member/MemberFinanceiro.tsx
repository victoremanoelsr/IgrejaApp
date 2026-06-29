import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../i18n';
import { TrendingUp, Wallet, Filter, FileDown, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

type FilterType = 'TODOS' | 'DIZIMO' | 'OFERTA';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export const MemberFinanceiro: React.FC = () => {
  const { contributions, currentMonthTithes, isLoading } = useMember();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [filter, setFilter] = useState<FilterType>('TODOS');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const categoryLabel = (cat: string) =>
    t(`memberPortal.categoryLabel.${cat}`, { defaultValue: cat });

  const minYear = contributions.length > 0
    ? Math.min(...contributions.map(t => parseInt(t.date?.split('-')[0] || String(currentYear))))
    : currentYear - 5;

  const yearContribs = contributions.filter(
    (t) => t.date?.startsWith(String(selectedYear)) && (t.category === 'DIZIMO' || t.category === 'OFERTA')
  );

  const yearTithes = yearContribs.filter((t) => t.category === 'DIZIMO').reduce((s, t) => s + t.amount, 0);
  const yearOfferings = yearContribs.filter((t) => t.category === 'OFERTA').reduce((s, t) => s + t.amount, 0);

  const filtered = yearContribs.filter((t) =>
    filter === 'TODOS' ? true : t.category === filter
  );

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const handleExportYear = () => {
    const csvHeaders = t('memberPortal.financial.csvHeaders');
    const lines = [
      csvHeaders,
      ...yearContribs.map(
        (t) => `${formatDate(t.date, lang)},${categoryLabel(t.category)},${t.amount.toFixed(2)},${t.description || ''}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contribuicoes_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('memberPortal.financial.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('memberPortal.financial.subtitle')}</p>
      </div>

      {/* Dízimo do Mês */}
      {isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-orange-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              {t('memberPortal.financial.titheOfMonth')}
            </p>
            <p className="text-orange-600 text-2xl font-extrabold">{formatCurrency(currentMonthTithes, lang)}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-200 flex items-center justify-center">
            <TrendingUp size={22} className="text-orange-600" />
          </div>
        </div>
      )}

      {/* Year Selector */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <button
          onClick={() => setSelectedYear(y => Math.max(y - 1, minYear))}
          disabled={selectedYear <= minYear}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-orange-400" />
          <span className="text-gray-800 font-bold text-base">{selectedYear}</span>
          {selectedYear === currentYear && (
            <span className="text-[10px] bg-orange-100 text-orange-500 font-bold px-2 py-0.5 rounded-full">
              {t('memberPortal.financial.currentYear')}
            </span>
          )}
        </div>

        <button
          onClick={() => setSelectedYear(y => Math.min(y + 1, currentYear))}
          disabled={selectedYear >= currentYear}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Year Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4 text-center">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              {t('memberPortal.financial.totalTithes')} {selectedYear}
            </p>
            <p className="text-green-600 text-lg font-extrabold">{formatCurrency(yearTithes, lang)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 text-center">
            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-1">
              {t('memberPortal.financial.totalOfferings')} {selectedYear}
            </p>
            <p className="text-blue-600 text-lg font-extrabold">{formatCurrency(yearOfferings, lang)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
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
              {f === 'TODOS' ? t('memberPortal.financial.allCategories') : categoryLabel(f)}
            </button>
          ))}
        </div>
        {yearContribs.length > 0 && (
          <button onClick={handleExportYear} className="text-gray-400 hover:text-orange-500 transition-colors" title={`${t('memberPortal.financial.exportReport')} ${selectedYear}`}>
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
          <p className="text-gray-400 text-sm">
            {yearContribs.length === 0
              ? `${t('memberPortal.financial.noContributionsYear')} ${selectedYear}.`
              : t('memberPortal.financial.noContributions')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {filtered.map((txn) => (
            <div key={txn.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  txn.category === 'DIZIMO' ? 'bg-green-100 border border-green-200' : 'bg-blue-100 border border-blue-200'
                }`}>
                  <TrendingUp size={15} className={txn.category === 'DIZIMO' ? 'text-green-600' : 'text-blue-600'} />
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-semibold">
                    {categoryLabel(txn.category)}
                  </p>
                  <p className="text-gray-400 text-xs">{formatDate(txn.date, lang)}</p>
                  {txn.description && (
                    <p className="text-gray-300 text-[10px] truncate max-w-[160px]">{txn.description}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${txn.category === 'DIZIMO' ? 'text-green-600' : 'text-blue-600'}`}>
                  {formatCurrency(txn.amount, lang)}
                </p>
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
          <span className="text-gray-500 text-xs font-semibold">{t('common.total')} ({filtered.length})</span>
          <span className="text-gray-800 font-bold text-sm">{formatCurrency(total, lang)}</span>
        </div>
      )}

      {yearContribs.length > 0 && (
        <button
          onClick={handleExportYear}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl transition-all text-sm shadow-sm"
        >
          <FileDown size={16} />
          {t('memberPortal.financial.exportReport')} {selectedYear}
        </button>
      )}
    </div>
  );
};
