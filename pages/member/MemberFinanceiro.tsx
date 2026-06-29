import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDate } from '../../i18n';
import { TrendingUp, Wallet, Filter, FileDown, ChevronLeft, ChevronRight, Calendar, Megaphone } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterType = 'TODOS' | 'DIZIMO' | 'OFERTA';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export const MemberFinanceiro: React.FC = () => {
  const { contributions, campaignContributions, currentMonthTithes, isLoading, session } = useMember();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [filter, setFilter] = useState<FilterType>('TODOS');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const categoryLabel = (cat: string) =>
    t(`memberPortal.categoryLabel.${cat}`, { defaultValue: cat });

  // All years from both regular contributions and campaign contributions
  const allContribs = [...contributions, ...campaignContributions];
  const minYear = allContribs.length > 0
    ? Math.min(...allContribs.map(t => parseInt(t.date?.split('-')[0] || String(currentYear))))
    : currentYear - 5;

  // Regular contributions for selected year (DIZIMO + OFERTA)
  const yearContribs = contributions.filter(
    (t) => t.date?.startsWith(String(selectedYear)) && (t.category === 'DIZIMO' || t.category === 'OFERTA')
  );

  // Campaign contributions for selected year
  const yearCampaignContribs = campaignContributions.filter(
    (t) => t.date?.startsWith(String(selectedYear))
  );

  const yearTithes = yearContribs.filter((t) => t.category === 'DIZIMO').reduce((s, t) => s + t.amount, 0);
  // Total ofertas = regular OFERTA + all campaign donations
  const yearOfferings =
    yearContribs.filter((t) => t.category === 'OFERTA').reduce((s, t) => s + t.amount, 0) +
    yearCampaignContribs.reduce((s, t) => s + t.amount, 0);

  // Filtered list for display
  const filteredRegular = yearContribs.filter((t) =>
    filter === 'TODOS' ? true : t.category === filter
  );
  const filteredCampaign = filter === 'TODOS' || filter === 'OFERTA' ? yearCampaignContribs : [];

  // Merge and sort by date desc
  const filtered = [...filteredRegular, ...filteredCampaign].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const orange: [number, number, number] = [249, 115, 22];
    const memberName = session?.member?.name || '';
    const churchName = session?.church?.name || '';

    // Header
    doc.setFontSize(16);
    doc.setTextColor(orange[0], orange[1], orange[2]);
    doc.text(churchName.toUpperCase(), 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Relatório Financeiro do Membro — ${selectedYear}`, 14, 25);

    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Membro: ${memberName}`, 14, 32);

    doc.setDrawColor(220);
    doc.line(14, 36, 196, 36);

    // Summary boxes
    const summaryY = 42;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220);
    doc.roundedRect(14, summaryY, 182, 22, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('DÍZIMO MÊS ATUAL', 20, summaryY + 7);
    doc.text('TOTAL DÍZIMOS', 80, summaryY + 7);
    doc.text('TOTAL OFERTAS', 150, summaryY + 7);

    doc.setFontSize(11);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(249, 115, 22);
    doc.text(`R$ ${currentMonthTithes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, summaryY + 16);

    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${yearTithes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 80, summaryY + 16);

    doc.setTextColor(37, 99, 235);
    doc.text(`R$ ${yearOfferings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 150, summaryY + 16);
    doc.setFont(undefined as any, 'normal');

    // All entries for the year merged and sorted
    const allYear = [
      ...yearContribs.map(t => ({ ...t, isCampaign: false })),
      ...yearCampaignContribs.map(t => ({ ...t, isCampaign: true })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const tableRows = allYear.map(t => [
      new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      t.isCampaign ? `Oferta Campanha` : categoryLabel(t.category),
      t.description || '—',
      `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      t.status || 'PAGO',
    ]);

    autoTable(doc, {
      startY: summaryY + 30,
      head: [['Data', 'Tipo', 'Descrição', 'Valor', 'Status']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: orange, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || summaryY + 30;
    doc.setFontSize(10);
    doc.setFont(undefined as any, 'bold');
    doc.setTextColor(0);
    doc.text(`Total Geral: R$ ${(yearTithes + yearOfferings).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 196, finalY + 8, { align: 'right' });

    doc.save(`relatorio_${memberName.replace(/\s+/g, '_')}_${selectedYear}.pdf`);
  };

  const hasData = yearContribs.length > 0 || yearCampaignContribs.length > 0;

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
            {yearCampaignContribs.length > 0 && (
              <p className="text-[9px] text-blue-400 mt-0.5">
                inclui {yearCampaignContribs.length} oferta(s) de campanha
              </p>
            )}
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
        {hasData && (
          <button
            onClick={handleExportPDF}
            className="text-gray-400 hover:text-orange-500 transition-colors"
            title={`Exportar PDF ${selectedYear}`}
          >
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
            {!hasData
              ? `${t('memberPortal.financial.noContributionsYear')} ${selectedYear}.`
              : t('memberPortal.financial.noContributions')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {filtered.map((txn) => {
            const isCampaign = !!txn.campaignId;
            const isOferta = txn.category === 'OFERTA' || isCampaign;
            return (
              <div key={txn.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    txn.category === 'DIZIMO'
                      ? 'bg-green-100 border border-green-200'
                      : isCampaign
                        ? 'bg-purple-100 border border-purple-200'
                        : 'bg-blue-100 border border-blue-200'
                  }`}>
                    {isCampaign
                      ? <Megaphone size={14} className="text-purple-600" />
                      : <TrendingUp size={15} className={txn.category === 'DIZIMO' ? 'text-green-600' : 'text-blue-600'} />
                    }
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">
                      {isCampaign ? 'Oferta de Campanha' : categoryLabel(txn.category)}
                    </p>
                    <p className="text-gray-400 text-xs">{new Date(txn.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                    {txn.description && (
                      <p className="text-gray-300 text-[10px] truncate max-w-[160px]">{txn.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${
                    txn.category === 'DIZIMO'
                      ? 'text-green-600'
                      : isCampaign
                        ? 'text-purple-600'
                        : 'text-blue-600'
                  }`}>
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
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-between items-center">
          <span className="text-gray-500 text-xs font-semibold">{t('common.total')} ({filtered.length} {filtered.length === 1 ? 'registro' : 'registros'})</span>
          <span className="text-gray-800 font-bold text-sm">{formatCurrency(total, lang)}</span>
        </div>
      )}

      {hasData && (
        <button
          onClick={handleExportPDF}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl transition-all text-sm shadow-sm"
        >
          <FileDown size={16} />
          {t('memberPortal.financial.exportReport')} {selectedYear} (PDF)
        </button>
      )}
    </div>
  );
};
