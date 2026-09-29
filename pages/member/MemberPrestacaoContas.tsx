import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { supabase } from '../../services/supabaseClient';
import { getPublicFinancialData, PublicTransaction } from '../../services/memberService';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  ChevronDown,
  Download,
  Lock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Tag,
  Receipt,
  HelpCircle,
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

const defaultConfig: PrestacaoConfig = {
  enabled: true,
  showDetail: true,
  allowPDF: false,
  showMonthFilter: true,
};

export const getPrestacaoConfig = (churchId: string): PrestacaoConfig => {
  try {
    const raw = localStorage.getItem(PRESTACAO_CONFIG_KEY + churchId);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {}
  return defaultConfig;
};

// Categorias gerais visíveis para todos os membros
const GENERAL_CATEGORIES = new Set([
  'DIZIMO',
  'OFERTA',
  'MISSOES',
  'CONSTRUCAO',
  'DESPESA_FIXA',
  'DESPESA_VARIAVEL',
  'OUTROS',
  'ALUGUEL',
  'AGUA',
  'LUZ',
  'INTERNET',
  'SALARIO',
  'IMPOSTO',
]);

// Categorias de departamentos — visíveis se o membro pertencer ao departamento
const DEPT_CATEGORY_FLAGS: Record<string, keyof typeof DEPT_FLAG_KEYS> = {
  JOVENS: 'isYouth',
  CRIANCAS: 'isChild',
  ADOLESCENTES: 'isAdolescent',
  SENHORAS: 'isLady',
  SENHORES: 'isBrother',
};
const DEPT_FLAG_KEYS = {
  isYouth: true,
  isChild: true,
  isAdolescent: true,
  isLady: true,
  isBrother: true,
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
  CONSTRUCAO: 'Construção / Reformas',
  DESPESA_FIXA: 'Despesa Fixa',
  DESPESA_VARIAVEL: 'Despesa Variável',
  OUTROS: 'Outros',
  ALUGUEL: 'Aluguel do Templo',
  AGUA: 'Água e Saneamento',
  LUZ: 'Energia Elétrica',
  INTERNET: 'Internet / Telecom',
  SALARIO: 'Salários / Folha',
  IMPOSTO: 'Impostos e Tributos',
};

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) => {
  if (!d) return '-';
  try {
    const clean = d.split('T')[0];
    const [y, m, day] = clean.split('-');
    if (y && m && day) {
      return `${day}/${m}/${y}`;
    }
    return d;
  } catch {
    return d;
  }
};

type ViewFilter = 'TODOS' | 'ENTRADA' | 'SAIDA';

export const MemberPrestacaoContas: React.FC = () => {
  const { session } = useMember();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<PublicTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [config, setConfig] = useState<PrestacaoConfig>(defaultConfig);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Sincroniza configurações da prestação de contas
  useEffect(() => {
    if (session?.churchId) {
      setConfig(getPrestacaoConfig(session.churchId));

      const syncConfig = async () => {
        try {
          const { data } = await supabase
            .from('churches')
            .select('prestacao_config')
            .eq('id', session.churchId)
            .maybeSingle();

          if (data?.prestacao_config) {
            setConfig({ ...defaultConfig, ...data.prestacao_config });
            try {
              localStorage.setItem(
                PRESTACAO_CONFIG_KEY + session.churchId,
                JSON.stringify(data.prestacao_config)
              );
            } catch {}
          }
        } catch {}
      };

      syncConfig();
    }
  }, [session?.churchId]);

  // 2. Carrega as movimentações públicas
  const loadData = useCallback(async () => {
    if (!session?.churchId || !config.enabled) return;
    setIsLoading(true);
    setHasError(false);
    try {
      const raw = await getPublicFinancialData(session.churchId, month, year);
      const member = (session.member || {}) as any;

      // Filtro de privacidade: categorias gerais e departamentos autorizados
      const filtered = raw.filter((t) => {
        const descUpper = (t.description || '').toUpperCase();
        if (
          descUpper.includes('CARNÊ') ||
          descUpper.includes('CARNE') ||
          t.category === 'CARNE' ||
          t.category === 'CARNÊ'
        ) {
          return false;
        }
        if (GENERAL_CATEGORIES.has(t.category)) return true;
        const flag = DEPT_CATEGORY_FLAGS[t.category];
        if (!flag) return false;
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

  const entradas = useMemo(() => transactions.filter((t) => t.type === 'ENTRADA'), [transactions]);
  const saidas = useMemo(() => transactions.filter((t) => t.type === 'SAIDA'), [transactions]);

  const totalEntradas = useMemo(() => entradas.reduce((s, t) => s + t.amount, 0), [entradas]);
  const totalSaidas = useMemo(() => saidas.reduce((s, t) => s + t.amount, 0), [saidas]);
  const saldo = totalEntradas - totalSaidas;

  const groupByCategory = (list: PublicTransaction[]) => {
    const map: Record<string, number> = {};
    list.forEach((t) => {
      const label = CATEGORY_LABELS[t.category] || t.category;
      map[label] = (map[label] || 0) + t.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const entradasPorCat = useMemo(() => groupByCategory(entradas), [entradas]);
  const saidasPorCat = useMemo(() => groupByCategory(saidas), [saidas]);

  // Filtro de pesquisa e abas
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (viewFilter !== 'TODOS' && t.type !== viewFilter) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase().trim();
      const catLabel = (CATEGORY_LABELS[t.category] || t.category).toLowerCase();
      const dateText = fmtDate(t.date).toLowerCase();

      // Para despesa: busca também pelo "o que foi" (descrição)
      if (t.type === 'SAIDA') {
        const desc = (t.description || '').toLowerCase();
        return catLabel.includes(term) || desc.includes(term) || dateText.includes(term);
      }

      // Para entrada: busca por categoria ou data (nunca nome)
      return catLabel.includes(term) || dateText.includes(term);
    });
  }, [transactions, viewFilter, searchTerm]);

  // Exportação PDF profissional e alinhada ao sistema
  const handlePDF = () => {
    const doc = new jsPDF();
    const primaryOrange: [number, number, number] = [249, 115, 22];
    const church = session?.church?.name || 'Igreja';
    const periodTitle = `${MONTHS[month - 1]} de ${year}`;

    // Header institucional
    doc.setFillColor(primaryOrange[0], primaryOrange[1], primaryOrange[2]);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(church.toUpperCase(), 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Prestação de Contas Oficial — ${periodTitle}`, 14, 27);

    doc.setFontSize(9);
    doc.text(
      `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Relatório Ético e Transparente`,
      14,
      33
    );

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 37, 196, 37);

    let y = 43;

    // Resumo em caixas
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Resumo Financeiro do Período', 14, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor Registrado']],
      body: [
        ['Total de Entradas (Dízimos, Ofertas e Contribuições)', fmt(totalEntradas)],
        ['Total de Despesas / Saídas Pagas', fmt(totalSaidas)],
        ['Saldo Líquido do Mês', fmt(saldo)],
      ],
      styles: { fontSize: 9, cellPadding: 3.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Resumo por categorias lado a lado se couber
    if (entradasPorCat.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(22, 101, 52);
      doc.text('Entradas por Tipo / Categoria', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Tipo de Entrada', 'Valor']],
        body: entradasPorCat.map(([cat, val]) => [cat, fmt(val)]),
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: 'bold' },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    if (saidasPorCat.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(185, 28, 28);
      doc.text('Despesas por Categoria', 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Categoria da Despesa', 'Valor']],
        body: saidasPorCat.map(([cat, val]) => [cat, fmt(val)]),
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [185, 28, 28], textColor: 255, fontStyle: 'bold' },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Detalhamento das movimentações
    if (config.showDetail && transactions.length > 0) {
      if (y > 210) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Detalhamento das Movimentações', 14, y);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(
        '* Por ética e sigilo pastoral, entradas não exibem nomes de doadores. Despesas descrevem sua finalidade.',
        14,
        y + 4.5
      );
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Fluxo', 'Tipo / Categoria', 'Detalhamento (O que foi)', 'Valor']],
        body: transactions.map((t) => [
          fmtDate(t.date),
          t.type === 'ENTRADA' ? 'Entrada' : 'Despesa',
          CATEGORY_LABELS[t.category] || t.category,
          t.type === 'ENTRADA'
            ? 'Contribuição Ética (Identidade preservada)'
            : t.description || CATEGORY_LABELS[t.category] || 'Despesa eclesiástica',
          fmt(t.amount),
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: primaryOrange, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 247, 237] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 20 },
          2: { cellWidth: 38 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 30, halign: 'right' },
        },
      });
    }

    doc.save(`prestacao-contas-${month}-${year}.pdf`);
  };

  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].filter(
    (y) => y >= 2023
  );

  if (!session) return null;

  // Estado: Prestação desabilitada pela liderança
  if (!config.enabled) {
    return (
      <div className="w-full max-w-3xl mx-auto py-16 px-4 animate-fade-in">
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-orange-50 border border-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock size={36} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Prestação de Contas Indisponível</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed mb-6">
            A liderança desta igreja ainda não habilitou a visualização pública da prestação de contas no painel do membro.
          </p>
          <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-600">
            <ShieldCheck size={16} className="text-orange-500" />
            <span>Transparência sob gestão da administração local</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Cabeçalho Principal no estilo do sistema */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center shadow-xs">
                <BarChart3 size={24} className="text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Prestação de Contas</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Transparência financeira — valores e finalidades com total ética e sigilo pessoal
                </p>
              </div>
            </div>
          </div>

          {/* Controles de Mês / Ano / Atualizar / PDF */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {config.showMonthFilter && (
              <div className="flex items-center gap-2 bg-gray-50/90 border border-gray-200 rounded-xl p-1 shadow-2xs">
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="appearance-none bg-white border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-lg pl-3 pr-8 py-2 outline-none hover:border-orange-400 focus:border-orange-500 transition-all cursor-pointer"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>

                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="appearance-none bg-white border border-gray-200 text-gray-800 text-xs sm:text-sm font-semibold rounded-lg pl-3 pr-8 py-2 outline-none hover:border-orange-400 focus:border-orange-500 transition-all cursor-pointer"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            )}

            {config.allowPDF && (
              <button
                onClick={handlePDF}
                title="Exportar relatório em PDF"
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Download size={15} />
                <span>PDF</span>
              </button>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              title="Atualizar dados"
              className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-orange-600 hover:border-orange-300 active:scale-95 transition-all shadow-2xs disabled:opacity-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-orange-500' : ''} />
            </button>
          </div>
        </div>

          {/* Barra Informativa de Período e Garantia Ética */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-600 font-medium">
            <Calendar size={15} className="text-orange-500" />
            <span>
              Período selecionado: <strong className="text-gray-900 font-bold">{MONTHS[month - 1]} de {year}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl w-fit">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-[11px] sm:text-xs">
              Sigilo Pastoral Ativo: Entradas preservam anonimato • Despesas informam finalidade
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <RefreshCw size={32} className="animate-spin text-orange-500 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Carregando dados da prestação de contas...</p>
        </div>
      ) : hasError ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center shadow-sm">
          <AlertCircle size={36} className="text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-bold text-base">Não foi possível carregar os dados financeiros</p>
          <p className="text-red-600 text-xs mt-1">Verifique sua conexão ou tente novamente em instantes.</p>
          <button
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* Cards de Resumo Financeiro no padrão do sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card Entradas */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Total de Entradas
                </p>
                <p className="text-emerald-600 text-2xl font-extrabold">{fmt(totalEntradas)}</p>
                <p className="text-[11px] text-gray-500 mt-1 font-medium">
                  {entradas.length} contribuição(ões) no mês
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <TrendingUp size={22} className="text-emerald-600" />
              </div>
            </div>

            {/* Card Despesas / Saídas */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Total de Despesas
                </p>
                <p className="text-rose-600 text-2xl font-extrabold">{fmt(totalSaidas)}</p>
                <p className="text-[11px] text-gray-500 mt-1 font-medium">
                  {saidas.length} pagamento(s) realizado(s)
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <TrendingDown size={22} className="text-rose-600" />
              </div>
            </div>

            {/* Card Saldo */}
            <div
              className={`bg-white rounded-2xl shadow-sm border p-5 flex items-center justify-between hover:shadow-md transition-shadow ${
                saldo >= 0 ? 'border-blue-100' : 'border-amber-100'
              }`}
            >
              <div>
                <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Saldo do Período
                </p>
                <p
                  className={`text-2xl font-extrabold ${
                    saldo >= 0 ? 'text-blue-600' : 'text-amber-600'
                  }`}
                >
                  {fmt(saldo)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      saldo >= 0 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[11px] text-gray-500 font-medium">
                    {saldo >= 0 ? 'Superávit no período' : 'Déficit no período'}
                  </span>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  saldo >= 0
                    ? 'bg-blue-50 border-blue-100 text-blue-600'
                    : 'bg-amber-50 border-amber-100 text-amber-600'
                }`}
              >
                <Scale size={22} />
              </div>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-700">Nenhuma movimentação registrada</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Não constam entradas ou despesas lançadas no período de {MONTHS[month - 1]} de {year}.
              </p>
            </div>
          ) : (
            <>
              {/* Gráficos / Distribuição por Categoria em estilo card claro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Entradas por Categoria */}
                {entradasPorCat.length > 0 && (
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                          <TrendingUp size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Entradas por Tipo</h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        {fmt(totalEntradas)}
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {entradasPorCat.map(([cat, val]) => {
                        const pct = totalEntradas > 0 ? (val / totalEntradas) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-700">{cat}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-normal text-[11px]">
                                  {pct.toFixed(1)}%
                                </span>
                                <span className="text-emerald-700 font-bold">{fmt(val)}</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Saídas por Categoria */}
                {saidasPorCat.length > 0 && (
                  <div className="bg-white border border-gray-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                          <TrendingDown size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Despesas por Categoria</h3>
                      </div>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
                        {fmt(totalSaidas)}
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {saidasPorCat.map(([cat, val]) => {
                        const pct = totalSaidas > 0 ? (val / totalSaidas) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-gray-700">{cat}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-normal text-[11px]">
                                  {pct.toFixed(1)}%
                                </span>
                                <span className="text-rose-700 font-bold">{fmt(val)}</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full transition-all duration-500"
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

              {/* Tabela de Movimentações Detalhadas */}
              {config.showDetail && (
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
                  {/* Top Bar da Tabela com Filtros e Busca */}
                  <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <Receipt size={18} className="text-orange-500" />
                        Movimentações do Mês
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Transparência ética: Entradas mostram apenas tipo/valor/data sem nomes. Despesas mostram tipo, finalidade, valor e data.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      {/* Busca rápida */}
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar tipo ou despesa..."
                          className="w-full sm:w-56 bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 outline-none focus:bg-white focus:border-orange-500 transition-all placeholder:text-gray-400"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Filtros em Abas */}
                      <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
                        <button
                          onClick={() => setViewFilter('TODOS')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            viewFilter === 'TODOS'
                              ? 'bg-white text-gray-800 shadow-2xs'
                              : 'text-gray-500 hover:text-gray-800'
                          }`}
                        >
                          Todas ({transactions.length})
                        </button>
                        <button
                          onClick={() => setViewFilter('ENTRADA')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            viewFilter === 'ENTRADA'
                              ? 'bg-emerald-500 text-white shadow-2xs'
                              : 'text-gray-500 hover:text-emerald-600'
                          }`}
                        >
                          Entradas ({entradas.length})
                        </button>
                        <button
                          onClick={() => setViewFilter('SAIDA')}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                            viewFilter === 'SAIDA'
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'text-gray-500 hover:text-rose-600'
                          }`}
                        >
                          Despesas ({saidas.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {filteredTransactions.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-xs">
                      Nenhuma movimentação corresponde aos filtros selecionados.
                    </div>
                  ) : (
                    <>
                      {/* Versão Desktop (Tabela Elegante) */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                              <th className="px-5 py-3.5">Data</th>
                              <th className="px-5 py-3.5">Fluxo</th>
                              <th className="px-5 py-3.5">Tipo / Categoria</th>
                              <th className="px-5 py-3.5">Detalhamento / O que foi</th>
                              <th className="px-5 py-3.5 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map((t) => {
                              const isEntrada = t.type === 'ENTRADA';
                              const tipoNome = CATEGORY_LABELS[t.category] || t.category;

                              return (
                                <tr
                                  key={t.id}
                                  className="hover:bg-gray-50/60 transition-colors group"
                                >
                                  {/* Data */}
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span className="text-gray-600 font-mono text-xs font-semibold">
                                      {fmtDate(t.date)}
                                    </span>
                                  </td>

                                  {/* Badge de Fluxo */}
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                        isEntrada
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                      }`}
                                    >
                                      {isEntrada ? (
                                        <>
                                          <ArrowUpRight size={13} className="text-emerald-600" />
                                          Entrada
                                        </>
                                      ) : (
                                        <>
                                          <ArrowDownRight size={13} className="text-rose-600" />
                                          Despesa
                                        </>
                                      )}
                                    </span>
                                  </td>

                                  {/* Tipo / Categoria */}
                                  <td className="px-5 py-3.5 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <Tag size={13} className="text-gray-400" />
                                      <span className="font-semibold text-gray-800 text-xs sm:text-sm">
                                        {tipoNome}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Detalhamento: ENTRADA vs DESPESA */}
                                  <td className="px-5 py-3.5">
                                    {isEntrada ? (
                                      /* Para ENTRADAS: NUNCA mostra nome, apenas reforça a privacidade ética */
                                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200/70 px-2.5 py-1 rounded-lg">
                                        <ShieldCheck size={13} className="text-emerald-500" />
                                        <span>Contribuição registrada • Sigilo ético garantido</span>
                                      </div>
                                    ) : (
                                      /* Para DESPESAS: Mostra "O QUE FOI" detalhadamente */
                                      <div>
                                        <p className="text-gray-800 font-medium text-xs sm:text-sm leading-snug">
                                          {t.description || tipoNome}
                                        </p>
                                        {t.description && t.description !== tipoNome && (
                                          <span className="text-[11px] text-gray-400 font-normal">
                                            Classificação: {tipoNome}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Valor */}
                                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                    <span
                                      className={`text-sm font-extrabold ${
                                        isEntrada ? 'text-emerald-600' : 'text-rose-600'
                                      }`}
                                    >
                                      {isEntrada ? '+ ' : '- '}
                                      {fmt(t.amount)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Versão Mobile (Cards modernos e legíveis) */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredTransactions.map((t) => {
                          const isEntrada = t.type === 'ENTRADA';
                          const tipoNome = CATEGORY_LABELS[t.category] || t.category;

                          return (
                            <div key={t.id} className="p-4 space-y-2.5">
                              {/* Topo do card: Data, Badge e Valor */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                      isEntrada
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}
                                  >
                                    {isEntrada ? (
                                      <ArrowUpRight size={12} className="text-emerald-600" />
                                    ) : (
                                      <ArrowDownRight size={12} className="text-rose-600" />
                                    )}
                                    {isEntrada ? 'Entrada' : 'Despesa'}
                                  </span>
                                  <span className="text-gray-400 font-mono text-xs">
                                    {fmtDate(t.date)}
                                  </span>
                                </div>

                                <p
                                  className={`text-base font-extrabold ${
                                    isEntrada ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {isEntrada ? '+ ' : '- '}
                                  {fmt(t.amount)}
                                </p>
                              </div>

                              {/* Tipo / Classificação */}
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                                <Tag size={13} className="text-gray-400" />
                                <span>{tipoNome}</span>
                              </div>

                              {/* O que foi (se despesa) ou Sigilo Ético (se entrada) */}
                              {isEntrada ? (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                                  <span>Doador mantido em sigilo ético</span>
                                </div>
                              ) : (
                                <div className="bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                                  <p className="text-xs text-gray-700 font-medium">
                                    <span className="text-gray-400 font-normal mr-1">O que foi:</span>
                                    {t.description || tipoNome}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Rodapé da tabela */}
                      <div className="px-5 py-3.5 bg-gray-50/70 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 font-medium">
                        <span>
                          Exibindo {filteredTransactions.length} de {transactions.length} movimentação(ões)
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Lock size={12} className="text-orange-500" />
                          <span>Prestação de contas auditada e sem dados pessoais</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
