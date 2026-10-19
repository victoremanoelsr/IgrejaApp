import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { 
  BookOpen, Settings, Download, Trash2, CheckCircle, Search, 
  X, Loader, AlertTriangle, Calendar, RefreshCw, User as UserIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import { CarnetTemplate, CarnetHistoryRecord, Member, LayoutElement } from '../types';
import { CarnetEditor } from './CarnetEditor';
import { loadImageForPDF, renderElementsToPDF, addImageToPdf } from '../utils/pdfImageLoader';

const EDITOR_WIDTH = 794;
const TICKET_HEIGHT_MM = 70;
const TICKET_WIDTH_MM = 210;

const REQUIRED_FIELDS: LayoutElement[] = [
  { id: 'stub_membro', label: 'Nome (Canhoto)', content: '{{nome_membro}}', x: 5, y: 15, style: { fontSize: 10, color: '#000000', bold: true } },
  { id: 'stub_valor', label: 'Valor (Canhoto)', content: '{{valor}}', x: 5, y: 30, style: { fontSize: 12, color: '#000000', bold: true } },
  { id: 'stub_mes', label: 'Mês (Canhoto)', content: '{{mes_extenso}}', x: 5, y: 45, style: { fontSize: 10, color: '#000000', bold: false } },
  { id: 'main_membro', label: 'Nome (Principal)', content: '{{nome_membro}}', x: 65, y: 20, style: { fontSize: 12, color: '#000000', bold: true } },
  { id: 'main_valor', label: 'Valor (Principal)', content: '{{valor}}', x: 160, y: 20, style: { fontSize: 14, color: '#000000', bold: true } },
  { id: 'main_mes', label: 'Mês (Principal)', content: '{{mes_extenso}}', x: 65, y: 40, style: { fontSize: 11, color: '#000000', bold: false } },
  { id: 'main_ano', label: 'Ano (Principal)', content: '{{ano}}', x: 120, y: 40, style: { fontSize: 11, color: '#000000', bold: false } },
  { id: 'main_parcela', label: 'Parcela (Principal)', content: '{{n_parcela}}', x: 160, y: 40, style: { fontSize: 11, color: '#000000', bold: false } },
];

export interface DepartmentCarnetManagerProps {
  category: 'JOVENS' | 'MISSOES' | 'CRIANCAS' | 'ADOLESCENTES' | 'SENHORAS' | 'SENHORES' | string;
  departmentName: string;
  activeSubTab?: 'CARNES' | 'CONFIG_MODELO';
  onSubTabChange?: (tab: 'CARNES' | 'CONFIG_MODELO') => void;
  filterMemberPredicate?: (m: Member) => boolean;
}

export const DepartmentCarnetManager: React.FC<DepartmentCarnetManagerProps> = ({
  category,
  departmentName,
  activeSubTab = 'CARNES',
  onSubTabChange,
  filterMemberPredicate,
}) => {
  const { 
    currentChurch, members, user, 
    getCarnetTemplates, getCarnetHistory, 
    addCarnetHistory, deleteCarnetHistory 
  } = useApp();

  const [currentTab, setCurrentTab] = useState<'CARNES' | 'CONFIG_MODELO'>(activeSubTab);
  const [templates, setTemplates] = useState<CarnetTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Emissão de carnê
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [carnetAmount, setCarnetAmount] = useState('');
  const [carnetYear, setCarnetYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [reissuingId, setReissuingId] = useState<string | null>(null);

  // Histórico
  const [historyRecords, setHistoryRecords] = useState<CarnetHistoryRecord[]>([]);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historySearch, setHistorySearch] = useState('');

  // Notificação local
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (activeSubTab) setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  const handleTabChange = (tab: 'CARNES' | 'CONFIG_MODELO') => {
    setCurrentTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const loadTemplates = async () => {
    if (!currentChurch) return;
    try {
      const all = await getCarnetTemplates(currentChurch.id);
      const catTemplates = all.filter(t => t.category === category);
      setTemplates(catTemplates);
      if (catTemplates.length > 0) {
        const def = catTemplates.find(t => t.isDefault) || catTemplates[0];
        setSelectedTemplateId(def.id);
      } else {
        setSelectedTemplateId('');
      }
    } catch (e) {
      console.error('[DepartmentCarnetManager] Erro ao carregar templates:', e);
    }
  };

  const loadCarnetHistory = async () => {
    if (!currentChurch) return;
    try {
      const list = await getCarnetHistory(currentChurch.id, category);
      setHistoryRecords(list);
    } catch (e) {
      console.error('[DepartmentCarnetManager] Erro ao carregar histórico:', e);
    }
  };

  useEffect(() => {
    if (currentChurch) {
      loadTemplates();
      loadCarnetHistory();
    }
  }, [currentChurch?.id, category]);

  // Lista de membros disponíveis para seleção
  const filteredMemberList = members.filter(m => {
    if (m.churchId !== currentChurch?.id) return false;
    if (filterMemberPredicate && !filterMemberPredicate(m)) return false;
    if (!memberSearchTerm) return true;
    const term = memberSearchTerm.toLowerCase();
    return (m.name || '').toLowerCase().includes(term) || (m.cpf || '').includes(term);
  });

  // Emissão de novo carnê
  const handleGenerateCarnet = async () => {
    if (!currentChurch || !selectedMemberId || !carnetAmount) {
      showToast('Selecione um membro e informe o valor mensal.', 'error');
      return;
    }
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const templateToUse = templates.find(t => t.id === selectedTemplateId) || templates[0];
    if (!templateToUse) {
      showToast('Nenhum modelo selecionado ou cadastrado.', 'error');
      return;
    }

    setIsGenerating(true);
    showToast('Gerando PDF do carnê...', 'info');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const scale = 210 / EDITOR_WIDTH;
      const bgData = templateToUse.backgroundUrl ? await loadImageForPDF(templateToUse.backgroundUrl) : null;
      const imageCache: Record<string, string | null> = {};
      const elements = templateToUse.layoutJson || REQUIRED_FIELDS;

      const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const ticketsPerPage = 4;
      const pageHeightMM = 297;
      const totalTicketsHeight = ticketsPerPage * TICKET_HEIGHT_MM;
      const marginY = (pageHeightMM - totalTicketsHeight) / 2;
      const STUB_X_MM = TICKET_WIDTH_MM * 0.25;
      const hasStubLine = elements.some(el => el.id.startsWith('stub_'));

      for (let i = 0; i < 12; i++) {
        if (i > 0 && i % ticketsPerPage === 0) doc.addPage();
        const currentY = marginY + ((i % ticketsPerPage) * TICKET_HEIGHT_MM);

        if (bgData) {
          addImageToPdf(doc, bgData, 0, currentY, 210, TICKET_HEIGHT_MM);
        } else {
          doc.setDrawColor(210);
          doc.rect(0, currentY, 210, TICKET_HEIGHT_MM);
        }

        const replacements: Record<string, string> = {
          '{{nome_membro}}': member.name,
          '{{cpf}}': member.cpf || '',
          '{{valor}}': `R$ ${parseFloat(carnetAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          '{{mes_extenso}}': months[i],
          '{{ano}}': carnetYear.toString(),
          '{{n_parcela}}': `${i + 1}/12`,
        };
        await renderElementsToPDF(doc, elements, scale, currentY, replacements, imageCache);

        // Linha pontilhada vertical do canhoto
        if (hasStubLine) {
          doc.setDrawColor(140, 140, 140);
          doc.setLineWidth(0.3);
          (doc as any).setLineDash([1.5, 1.5], 0);
          doc.line(STUB_X_MM, currentY, STUB_X_MM, currentY + TICKET_HEIGHT_MM);
          (doc as any).setLineDash([], 0);
        }
      }

      // Linhas horizontais de corte
      const totalPdfPages = Math.ceil(12 / ticketsPerPage);
      for (let pg = 1; pg <= totalPdfPages; pg++) {
        doc.setPage(pg);
        const carnetsOnPage = Math.min(ticketsPerPage, 12 - (pg - 1) * ticketsPerPage);
        for (let j = 0; j < carnetsOnPage - 1; j++) {
          const lineY = marginY + (j + 1) * TICKET_HEIGHT_MM;
          doc.setDrawColor(120, 120, 120);
          doc.setLineWidth(0.35);
          (doc as any).setLineDash([2, 2], 0);
          doc.line(0, lineY, 210, lineY);
          (doc as any).setLineDash([], 0);
        }
      }

      doc.save(`Carne_${departmentName}_${member.name.replace(/\s+/g, '_')}.pdf`);

      await addCarnetHistory({
        churchId: currentChurch.id,
        memberId: member.id,
        memberName: member.name,
        amount: parseFloat(carnetAmount),
        year: carnetYear,
        category,
        templateName: templateToUse.name,
        generatedBy: user?.name || user?.username || '',
      });

      await loadCarnetHistory();
      showToast('Carnê gerado com sucesso e registrado no histórico!');
    } catch (err: any) {
      console.error('[DepartmentCarnetManager] Erro ao emitir:', err);
      showToast('Erro ao gerar PDF do carnê: ' + (err?.message || ''), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reemissão a partir do histórico
  const handleReemitir = async (r: CarnetHistoryRecord) => {
    const member = members.find(m => m.id === r.memberId) || {
      id: r.memberId || '',
      name: r.memberName,
      churchId: currentChurch?.id || '',
      cpf: '',
    };

    const templateToUse = templates.find(t => t.name === r.templateName) ||
                          templates.find(t => t.isDefault) ||
                          templates[0];

    if (!templateToUse) {
      showToast('Nenhum modelo cadastrado para reemissão.', 'error');
      return;
    }

    setReissuingId(r.id);
    showToast('Reemitindo carnê...', 'info');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const scale = 210 / EDITOR_WIDTH;
      const bgData = templateToUse.backgroundUrl ? await loadImageForPDF(templateToUse.backgroundUrl) : null;
      const imageCache: Record<string, string | null> = {};
      const elements = templateToUse.layoutJson || REQUIRED_FIELDS;

      const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const ticketsPerPage = 4;
      const pageHeightMM = 297;
      const totalTicketsHeight = ticketsPerPage * TICKET_HEIGHT_MM;
      const marginY = (pageHeightMM - totalTicketsHeight) / 2;
      const STUB_X_MM = TICKET_WIDTH_MM * 0.25;
      const hasStubLine = elements.some(el => el.id.startsWith('stub_'));

      for (let i = 0; i < 12; i++) {
        if (i > 0 && i % ticketsPerPage === 0) doc.addPage();
        const currentY = marginY + ((i % ticketsPerPage) * TICKET_HEIGHT_MM);

        if (bgData) {
          addImageToPdf(doc, bgData, 0, currentY, 210, TICKET_HEIGHT_MM);
        } else {
          doc.setDrawColor(210);
          doc.rect(0, currentY, 210, TICKET_HEIGHT_MM);
        }

        const replacements: Record<string, string> = {
          '{{nome_membro}}': member.name,
          '{{cpf}}': member.cpf || '',
          '{{valor}}': `R$ ${parseFloat(r.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          '{{mes_extenso}}': months[i],
          '{{ano}}': r.year.toString(),
          '{{n_parcela}}': `${i + 1}/12`,
        };
        await renderElementsToPDF(doc, elements, scale, currentY, replacements, imageCache);

        if (hasStubLine) {
          doc.setDrawColor(140, 140, 140);
          doc.setLineWidth(0.3);
          (doc as any).setLineDash([1.5, 1.5], 0);
          doc.line(STUB_X_MM, currentY, STUB_X_MM, currentY + TICKET_HEIGHT_MM);
          (doc as any).setLineDash([], 0);
        }
      }

      const totalPdfPages = Math.ceil(12 / ticketsPerPage);
      for (let pg = 1; pg <= totalPdfPages; pg++) {
        doc.setPage(pg);
        const carnetsOnPage = Math.min(ticketsPerPage, 12 - (pg - 1) * ticketsPerPage);
        for (let j = 0; j < carnetsOnPage - 1; j++) {
          const lineY = marginY + (j + 1) * TICKET_HEIGHT_MM;
          doc.setDrawColor(120, 120, 120);
          doc.setLineWidth(0.35);
          (doc as any).setLineDash([2, 2], 0);
          doc.line(0, lineY, 210, lineY);
          (doc as any).setLineDash([], 0);
        }
      }

      doc.save(`Reemissao_Carne_${departmentName}_${r.memberName.replace(/\s+/g, '_')}.pdf`);
      showToast('Carnê reemitido e baixado com sucesso!');
    } catch (err: any) {
      console.error('[DepartmentCarnetManager] Erro na reemissão:', err);
      showToast('Erro ao reemitir: ' + (err?.message || ''), 'error');
    } finally {
      setReissuingId(null);
    }
  };

  const colorThemes: Record<string, {
    headerGradient: string;
    badgeBg: string;
    badgeText: string;
    btnColor: string;
    borderActive: string;
  }> = {
    JOVENS: {
      headerGradient: 'from-orange-500 to-amber-600',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700',
      btnColor: 'bg-orange-600 hover:bg-orange-700 text-white',
      borderActive: 'border-orange-500',
    },
    MISSOES: {
      headerGradient: 'from-teal-600 to-emerald-700',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700',
      btnColor: 'bg-teal-600 hover:bg-teal-700 text-white',
      borderActive: 'border-teal-500',
    },
    CRIANCAS: {
      headerGradient: 'from-amber-500 to-yellow-600',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
      borderActive: 'border-amber-500',
    },
    ADOLESCENTES: {
      headerGradient: 'from-purple-600 to-indigo-700',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700',
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white',
      borderActive: 'border-purple-500',
    },
    SENHORAS: {
      headerGradient: 'from-pink-600 to-rose-700',
      badgeBg: 'bg-pink-100',
      badgeText: 'text-pink-700',
      btnColor: 'bg-pink-600 hover:bg-pink-700 text-white',
      borderActive: 'border-pink-500',
    },
    SENHORES: {
      headerGradient: 'from-blue-600 to-slate-800',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white',
      borderActive: 'border-blue-500',
    },
  };

  const theme = colorThemes[category] || colorThemes.JOVENS;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-bold text-xs flex items-center gap-2 animate-fade-in-down ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Navegação entre Emitir e Configurar */}
      <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
        <button
          type="button"
          onClick={() => handleTabChange('CARNES')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            currentTab === 'CARNES'
              ? `${theme.btnColor} shadow`
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <BookOpen size={16} /> Emitir Carnê
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('CONFIG_MODELO')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            currentTab === 'CONFIG_MODELO'
              ? `${theme.btnColor} shadow`
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Settings size={16} /> Configurar Modelo
        </button>
      </div>

      {currentTab === 'CARNES' ? (
        <div className="space-y-6">
          {/* Card de Emissão */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className={`bg-gradient-to-r ${theme.headerGradient} px-6 py-5 text-white flex items-center justify-between`}>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <BookOpen size={20} /> Emissão de Carnê — {departmentName}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  Gere o carnê anual (12 parcelas) personalizado para membros deste departamento
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('CONFIG_MODELO')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition"
              >
                <Settings size={14} /> Personalizar Arte
              </button>
            </div>

            <div className="p-6 space-y-6">
              {templates.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-6">
                  <BookOpen size={36} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Nenhum modelo de carnê configurado</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Crie um modelo com a arte oficial e os campos necessários na aba <b>"Configurar Modelo"</b> para liberar a emissão.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTabChange('CONFIG_MODELO')}
                    className={`mt-4 px-4 py-2 ${theme.btnColor} rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow transition`}
                  >
                    <Settings size={14} /> Criar Primeiro Modelo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Formulário de emissão */}
                  <div className="md:col-span-7 space-y-4">
                    {/* Modelo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Modelo de Carnê
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.isDefault ? '★ (Padrão)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Membro */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                        Buscar Membro
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Digite o nome ou CPF do membro..."
                          value={memberSearchTerm}
                          onChange={(e) => {
                            setMemberSearchTerm(e.target.value);
                            setSelectedMemberId('');
                          }}
                          className="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                        {memberSearchTerm && (
                          <button
                            type="button"
                            onClick={() => { setMemberSearchTerm(''); setSelectedMemberId(''); }}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de sugestão */}
                      {memberSearchTerm && !selectedMemberId && (
                        <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-xl max-h-48 overflow-y-auto bg-white dark:bg-gray-800 shadow-lg divide-y divide-gray-100 dark:divide-gray-700 z-20 relative">
                          {filteredMemberList.slice(0, 10).map(m => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMemberId(m.id);
                                setMemberSearchTerm(m.name);
                              }}
                              className="p-2.5 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <div>
                                <p className="font-bold text-gray-800 dark:text-white">{m.name}</p>
                                <p className="text-[10px] text-gray-400">{m.cpf ? `CPF: ${m.cpf}` : 'Sem CPF'}</p>
                              </div>
                              <span className="text-[10px] font-bold text-orange-600">Selecionar</span>
                            </div>
                          ))}
                          {filteredMemberList.length === 0 && (
                            <div className="p-3 text-xs text-gray-400 text-center">Nenhum membro encontrado.</div>
                          )}
                        </div>
                      )}

                      {selectedMemberId && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                          <CheckCircle size={14} /> Membro selecionado: {memberSearchTerm}
                        </div>
                      )}
                    </div>

                    {/* Valor e Ano */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Valor Mensal (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={carnetAmount}
                            onChange={(e) => setCarnetAmount(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                          Ano de Referência
                        </label>
                        <select
                          value={carnetYear}
                          onChange={(e) => setCarnetYear(parseInt(e.target.value))}
                          className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                          {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Botão de Emitir */}
                    <button
                      type="button"
                      onClick={handleGenerateCarnet}
                      disabled={isGenerating || !selectedMemberId || !carnetAmount}
                      className={`w-full py-3.5 ${theme.btnColor} rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader size={18} className="animate-spin" /> Gerando Carnê em PDF...
                        </>
                      ) : (
                        <>
                          <Download size={18} /> Emitir e Baixar Carnê (12 Meses)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pré-visualização do modelo selecionado */}
                  <div className="md:col-span-5 bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Modelo Ativo
                      </p>
                      {templates.find(t => t.id === selectedTemplateId) ? (
                        (() => {
                          const t = templates.find(temp => temp.id === selectedTemplateId)!;
                          return (
                            <div className="space-y-3">
                              <div className="w-full aspect-[210/70] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden relative border border-gray-300 dark:border-gray-600 shadow-sm flex items-center justify-center">
                                {t.backgroundUrl ? (
                                  <img
                                    src={t.backgroundUrl}
                                    alt={t.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-400 font-bold">Arte Padrão (Sem Fundo)</span>
                                )}
                                <span className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${theme.badgeBg} ${theme.badgeText}`}>
                                  {t.name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                <p>• <b>Formato:</b> A4 (4 parcelas por página)</p>
                                <p>• <b>Total:</b> 12 parcelas (Janeiro a Dezembro de {carnetYear})</p>
                                <p>• <b>Canhoto:</b> Destacável com linha pontilhada</p>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-xs text-gray-400">Selecione um modelo ao lado.</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-400">
                      Os carnês emitidos ficam salvos no histórico abaixo para reemissão a qualquer momento.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de Carnês */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Calendar size={18} className="text-gray-500" /> Histórico de Carnês Emitidos ({departmentName})
                </h4>
                <p className="text-xs text-gray-400">Reemita ou consulte carnês gerados</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
                  />
                  <Search size={14} className="absolute left-2.5 top-2 text-gray-400" />
                </div>

                <select
                  value={historyYear}
                  onChange={(e) => setHistoryYear(parseInt(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white outline-none"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={loadCarnetHistory}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 dark:hover:text-white"
                  title="Atualizar histórico"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-4 py-3">Valor Mensal</th>
                    <th className="px-4 py-3">Ano</th>
                    <th className="px-4 py-3">Modelo</th>
                    <th className="px-4 py-3">Emitido Por</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {historyRecords
                    .filter(r => r.year === historyYear && (!historySearch || r.memberName.toLowerCase().includes(historySearch.toLowerCase())))
                    .map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3 font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold ${theme.badgeBg} ${theme.badgeText}`}>
                            <UserIcon size={14} />
                          </div>
                          <span>{r.memberName}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-600">
                          R$ {parseFloat(r.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-500">{r.year}</td>
                        <td className="px-4 py-3 text-gray-500">{r.templateName || 'Padrão'}</td>
                        <td className="px-4 py-3 text-gray-400">{r.generatedBy || '—'}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleReemitir(r)}
                            disabled={reissuingId === r.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                              reissuingId === r.id ? 'opacity-50' : ''
                            } bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-white hover:border-orange-400`}
                            title="Reemitir e Baixar PDF"
                          >
                            {reissuingId === r.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                            Reemitir
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Excluir registro de carnê de "${r.memberName}" do histórico?`)) {
                                await deleteCarnetHistory(r.id);
                                await loadCarnetHistory();
                                showToast('Registro excluído do histórico.');
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                            title="Excluir do Histórico"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {historyRecords.filter(r => r.year === historyYear && (!historySearch || r.memberName.toLowerCase().includes(historySearch.toLowerCase()))).length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        Nenhum carnê emitido em {historyYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Configuração do Modelo Visual */
        <div className="space-y-4">
          <CarnetEditor
            category={category}
            templates={templates}
            onTemplatesChanged={loadTemplates}
          />
        </div>
      )}
    </div>
  );
};

export default DepartmentCarnetManager;
