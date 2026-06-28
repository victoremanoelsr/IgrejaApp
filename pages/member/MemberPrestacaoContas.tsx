import React, { useState, useEffect, useCallback } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { getPublicFinancialData, PublicTransaction } from '../../services/memberService';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  ChevronDown,
  Download,
  Lock,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PrestacaoConfig {
  enabled: boolean;
  showDetail: boolean;
  allowPDF: boolean;
  showMonthFilter: boolean;
}

export const PRESTACAO_CONFIG_KEY = 'prestacao_config_';

export const getPrestacaoConfig = (churchId: string): PrestacaoConfig => {
  try {
    const raw = localStorage.getItem(PRESTACAO_CONFIG_KEY + churchId);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {}
  return defaultConfig;
};

const defaultConfig: PrestacaoConfig = {
  enabled: true,
  showDetail: true,
  allowPDF: false,
  showMonthFilter: true,
};

// Categories always visible (general church operations)
const GENERAL_CATEGORIES = new Set([
  'DIZIMO', 'OFERTA', 'MISSOES',
  'CONSTRUCAO', 'DESPESA_FIXA', 'DESPESA_VARIAVEL', 'OUTROS',
  'ALUGUEL', 'AGUA', 'LUZ', 'INTERNET', 'SALARIO', 'IMPOSTO',
]);

// Department categories — only visible when member has the matching flag
const DEPT_CATEGORY_FLAGS: Record<string, keyof typeof DEPT_FLAG_KEYS> = {
  JOVENS:       'isYouth',
  CRIANCAS:     'isChild',
  ADOLESCENTES: 'isAdolescent',
  SENHORAS:     'isLady',
  SENHORES:     'isBrother',
};
const DEPT_FLAG_KEYS = {
  isYouth: true, isChild: true, isAdolescent: true, isLady: true, isBrother: true,
};

const CATEGORY_LABELS: Record<string, string> = {
  DIZIMO: 'Dízimo',
  OFERTA: 'Oferta',
  MISSOES: 'Missões',
  JOVENS: 'Jovens',
  CRIANCAS: 'Crianças',
  ADOLESCENTES: 'Adolescentes',
  SENHORAS: 'Senhoras',
  SENHORES: 'Senhores',
  CONSTRUCAO: 'Construção / Obra',
  DESPESA_FIXA: 'Despesa Fixa',
  DESPESA_VARIAVEL: 'Despesa Variável',
  OUTROS: 'Outros',
  ALUGUEL: 'Aluguel',
  AGUA: 'Água',
  LUZ: 'Energia Elétrica',
  INTERNET: 'Internet',
  SALARIO: 'Salários / Folha de Pagamento',
  IMPOSTO: 'Impostos / Obrigações Tributárias',
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) => {
  try {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  } catch {
    return d;
  }
};

export const MemberPrestacaoContas: React.FC = () => {
  const { session } = useMember();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [config, setConfig] = useState<PrestacaoConfig>(defaultConfig);

  useEffect(() => {
    if (session?.churchId) {
      setConfig(getPrestacaoConfig(session.churchId));
    }
  }, [session?.churchId]);

  const loadData = useCallback(async () => {
    if (!session?.churchId || !config.enabled) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const raw = await getPublicFinancialData(session.churchId, month, year);
      const member = session.member as any;

      // Filter: always show general categories; department categories only if member has the flag
      const filtered = raw.filter((t) => {
        if (GENERAL_CATEGORIES.has(t.category)) return true;
        const flag = DEPT_CATEGORY_FLAGS[t.category];
        if (!flag) return false; // unknown category — hide
        return member[flag] === true;
      });

      setTransactions(filtered);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [session?.churchId, session?.member, month, year, config.enabled]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!session) return null;

  if (!config.enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-lg">
          <Lock size={36} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Prestação de Contas Indisponível</h2>
        <p className="text-gray-400 max-w-sm text-sm leading-relaxed">
          A liderança desta igreja ainda não habilitou a visualização pública dos relatórios financeiros.
        </p>
      </div>
    );
  }

  const entradas = transactions.filter((t) => t.type === 'ENTRADA');
  const saidas = transactions.filter((t) => t.type === 'SAIDA');

  const totalEntradas = entradas.reduce((s, t) => s + t.amount, 0);
  const totalSaidas = saidas.reduce((s, t) => s + t.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const groupByCategory = (list: PublicTransaction[]) => {
    const map: Record<string, number> = {};
    list.forEach((t) => {
      const label = CATEGORY_LABELS[t.category] || t.category;
      map[label] = (map[label] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const entradasPorCat = groupByCategory(entradas);
  const saidasPorCat = groupByCategory(saidas);

  const handlePDF = () => {
    const doc = new jsPDF();
    const title = `Prestação de Contas — ${MONTHS[month - 1]}/${year}`;
    const church = session.church.name;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(church, 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 14, 28);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

    let y = 44;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo do Mês', 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['', 'Valor']],
      body: [
        ['Total de Entradas', fmt(totalEntradas)],
        ['Total de Saídas', fmt(totalSaidas)],
        ['Saldo do Mês', fmt(saldo)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    if (entradasPorCat.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Entradas por Categoria', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Categoria', 'Valor']],
        body: entradasPorCat.map(([cat, val]) => [cat, fmt(val)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [21, 128, 61] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (saidasPorCat.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Saídas por Categoria', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Categoria', 'Valor']],
        body: saidasPorCat.map(([cat, val]) => [cat, fmt(val)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [185, 28, 28] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    if (config.showDetail && transactions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Movimentações do Mês', 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Data', 'Categoria', 'Tipo', 'Valor']],
        body: transactions.map((t) => [
          fmtDate(t.date),
          CATEGORY_LABELS[t.category] || t.category,
          t.type === 'ENTRADA' ? 'Entrada' : 'Saída',
          fmt(t.amount),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 30, 30] },
      });
    }

    doc.save(`prestacao-contas-${month}-${year}.pdf`);
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].filter(
    (y) => y >= 2023
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header card */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <BarChart2 size={22} className="text-orange-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Prestação de Contas
              </h1>
            </div>
            <p className="text-gray-400 text-sm ml-[52px]">
              Transparência financeira — dados sem identificação pessoal
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-[52px] sm:ml-0">
            {config.showMonthFilter && (
              <>
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="appearance-none bg-gray-700/80 border border-gray-600 text-white text-sm font-medium rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="appearance-none bg-gray-700/80 border border-gray-600 text-white text-sm font-medium rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 transition-all"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </>
            )}

            {config.allowPDF && (
              <button
                onClick={handlePDF}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow"
              >
                <Download size={15} /> PDF
              </button>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              title="Atualizar dados"
              className="p-2.5 bg-gray-700/80 border border-gray-600 rounded-xl text-gray-300 hover:text-white hover:border-orange-500 transition-all"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Período + badge privacidade */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-1.5 text-sm text-gray-300">
            <Calendar size={14} className="text-orange-400" />
            <span>Período: <strong className="text-white font-bold">{MONTHS[month - 1]} / {year}</strong></span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-green-900/30 border border-green-700/40 rounded-lg px-3 py-1">
            <Info size={12} className="text-green-400 shrink-0" />
            <span className="text-[11px] text-green-300 font-medium">Sem dados pessoais</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={28} className="animate-spin text-orange-400" />
        </div>
      ) : hasError ? (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium">Não foi possível carregar os dados financeiros.</p>
          <button onClick={loadData} className="mt-3 text-sm text-orange-400 underline">Tentar novamente</button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-900/40 rounded-lg">
                  <TrendingUp size={18} className="text-green-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entradas</span>
              </div>
              <p className="text-2xl font-black text-green-400">{fmt(totalEntradas)}</p>
            </div>

            <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-900/40 rounded-lg">
                  <TrendingDown size={18} className="text-red-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saídas</span>
              </div>
              <p className="text-2xl font-black text-red-400">{fmt(totalSaidas)}</p>
            </div>

            <div className={`bg-gray-800/80 border rounded-xl p-5 ${saldo >= 0 ? 'border-green-700/50' : 'border-red-700/50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${saldo >= 0 ? 'bg-green-900/40' : 'bg-red-900/40'}`}>
                  <Scale size={18} className={saldo >= 0 ? 'text-green-400' : 'text-red-400'} />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo</span>
              </div>
              <p className={`text-2xl font-black ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(saldo)}</p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl p-10 text-center">
              <BarChart2 size={36} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Nenhuma movimentação encontrada neste mês.</p>
            </div>
          ) : (
            <>
              {/* Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entradas por categoria */}
                {entradasPorCat.length > 0 && (
                  <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingUp size={15} /> Entradas por Categoria
                    </h3>
                    <div className="space-y-3">
                      {entradasPorCat.map(([cat, val]) => {
                        const pct = totalEntradas > 0 ? (val / totalEntradas) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300">{cat}</span>
                              <span className="text-green-400 font-bold">{fmt(val)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Saídas por categoria */}
                {saidasPorCat.length > 0 && (
                  <div className="bg-gray-800/80 border border-gray-700 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <TrendingDown size={15} /> Saídas por Categoria
                    </h3>
                    <div className="space-y-3">
                      {saidasPorCat.map(([cat, val]) => {
                        const pct = totalSaidas > 0 ? (val / totalSaidas) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300">{cat}</span>
                              <span className="text-red-400 font-bold">{fmt(val)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Movimentações detalhadas */}
              {config.showDetail && (
                <div className="bg-gray-800/80 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-700">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                      Movimentações do Mês
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sem identificação de contribuinte — apenas data, categoria, tipo e valor
                    </p>
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                          <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="text-right px-5 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-5 py-3 text-gray-300 font-mono text-xs">{fmtDate(t.date)}</td>
                            <td className="px-5 py-3 text-gray-200">{CATEGORY_LABELS[t.category] || t.category}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                t.type === 'ENTRADA'
                                  ? 'bg-green-900/40 text-green-400 border border-green-700/40'
                                  : 'bg-red-900/40 text-red-400 border border-red-700/40'
                              }`}>
                                {t.type === 'ENTRADA' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {t.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className={`px-5 py-3 text-right font-bold ${t.type === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                              {fmt(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-gray-700/50">
                    {transactions.map((t) => (
                      <div key={t.id} className="px-4 py-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {CATEGORY_LABELS[t.category] || t.category}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-500 text-xs font-mono">{fmtDate(t.date)}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              t.type === 'ENTRADA'
                                ? 'bg-green-900/40 text-green-400'
                                : 'bg-red-900/40 text-red-400'
                            }`}>
                              {t.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                        </div>
                        <p className={`text-base font-black shrink-0 ${t.type === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
                          {fmt(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="px-5 py-3 bg-gray-900/40 border-t border-gray-700 flex justify-between items-center text-xs text-gray-500">
                    <span>{transactions.length} movimentação(ões)</span>
                    <span className="flex items-center gap-1"><Lock size={10} /> Sem dados pessoais</span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
