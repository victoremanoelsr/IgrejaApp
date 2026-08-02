import React, { useState, useEffect } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n';
import { BookOpen, Download, Loader, AlertCircle, History, ChevronLeft, Calendar } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementsToPDF, loadImageForPDF, addImageToPdf } from '../../utils/pdfImageLoader';
import { CarnetTemplate } from '../../types';

const MONTHS_PT = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO',
];

export const MemberCarnets: React.FC = () => {
  const { carnets, carnetHistory, session, isLoading, refreshCarnetHistory } = useMember();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // null = lista de carnês | CarnetTemplate = tela das 12 parcelas
  const [selectedTemplate, setSelectedTemplate] = useState<CarnetTemplate | null>(null);
  // "templateId-monthIndex" → true enquanto gerando
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshCarnetHistory();
  }, []);

  if (!session) return null;
  const member = session.member;
  const currentYear = new Date().getFullYear();

  const getMonthName = (monthIndex: number) =>
    new Date(0, monthIndex).toLocaleString(lang, { month: 'long' });

  /* ── Gera PDF de uma única parcela ── */
  const handleDownloadParcela = async (template: CarnetTemplate, monthIndex: number) => {
    const key = `${template.id}-${monthIndex}`;
    setGeneratingKey(key);
    setError('');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const EDITOR_WIDTH = 794;
      const PAGE_W_MM = 210;
      const scale = PAGE_W_MM / EDITOR_WIDTH;
      const imageCache: Record<string, string | null> = {};

      if (template.backgroundUrl) {
        const bgData = await loadImageForPDF(template.backgroundUrl);
        if (bgData) addImageToPdf(doc, bgData, 0, 0, PAGE_W_MM, 297);
      }

      const replacements: Record<string, string> = {
        '{{nome_membro}}':   member.name,
        '{{cpf}}':           member.cpf,
        '{{mes_extenso}}':   MONTHS_PT[monthIndex],
        '{{mes_numero}}':    String(monthIndex + 1).padStart(2, '0'),
        '{{ano}}':           String(currentYear),
        '{{n_parcela}}':     `${monthIndex + 1}/12`,
        '{{valor}}':         'R$ ___,___',
        '{{igreja}}':        session.church.name,
        '{{numero_membro}}': member.memberNumber || '',
      };

      await renderElementsToPDF(doc, template.layoutJson, scale, 0, replacements, imageCache);

      const monthName = MONTHS_PT[monthIndex];
      doc.save(`parcela_${String(monthIndex + 1).padStart(2,'0')}_${monthName}_${currentYear}_${member.name.split(' ')[0]}.pdf`);
    } catch {
      setError(t('memberPortal.carnets.pdfError'));
    } finally {
      setGeneratingKey(null);
    }
  };

  /* ══════════════════════════════════════
     TELA 2 — 12 parcelas do carnê selecionado
  ══════════════════════════════════════ */
  if (selectedTemplate) {
    return (
      <div className="space-y-5 max-w-2xl">
        {/* Cabeçalho com botão voltar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedTemplate(null); setError(''); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            {selectedTemplate.backgroundUrl ? (
              <img src={selectedTemplate.backgroundUrl} className="w-10 h-8 rounded object-cover border border-gray-200 shrink-0" />
            ) : (
              <div className="w-10 h-8 rounded bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <BookOpen size={14} className="text-orange-400" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-800 truncate">{selectedTemplate.name}</h1>
              <p className="text-gray-400 text-xs">{currentYear} · 12 parcelas</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-xs">{error}</p>
          </div>
        )}

        {/* Grade das 12 parcelas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MONTHS_PT.map((month, i) => {
            const key = `${selectedTemplate.id}-${i}`;
            const isGenerating = generatingKey === key;
            return (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <Calendar size={18} className="text-orange-500" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Parcela {String(i + 1).padStart(2, '0')}</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize mt-0.5">{getMonthName(i)}</p>
                </div>
                <button
                  onClick={() => handleDownloadParcela(selectedTemplate, i)}
                  disabled={!!generatingKey}
                  className="w-full flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95"
                >
                  {isGenerating ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  {isGenerating ? 'Gerando...' : 'Baixar PDF'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-400 text-xs pb-2">
          Cada parcela é baixada individualmente como um arquivo PDF separado.
        </p>
      </div>
    );
  }

  /* ══════════════════════════════════════
     TELA 1 — Lista de carnês disponíveis
  ══════════════════════════════════════ */
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('memberPortal.carnets.title')}</h1>
        <p className="text-gray-500 text-sm mt-1">Selecione um carnê para acessar as parcelas individuais.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24" />
          ))}
        </div>
      ) : carnets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('memberPortal.carnets.noCarnets')}</p>
          <p className="text-gray-400 text-xs mt-1">{t('memberPortal.carnets.contactAdmin')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carnets.map((template) => (
            <button
              key={template.id}
              onClick={() => { setSelectedTemplate(template); setError(''); }}
              className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4 hover:border-orange-300 hover:shadow-md transition-all text-left group"
            >
              {template.backgroundUrl ? (
                <img
                  src={template.backgroundUrl}
                  alt={template.name}
                  className="w-16 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                  <BookOpen size={20} className="text-orange-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 text-sm font-bold truncate group-hover:text-orange-600 transition-colors">
                  {template.name}
                </p>
                <p className="text-gray-400 text-xs capitalize mt-0.5">{template.category?.toLowerCase()} · {currentYear}</p>
                <p className="text-orange-500 text-xs font-semibold mt-1">12 parcelas disponíveis →</p>
              </div>
              {template.isDefault && (
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full shrink-0">
                  {t('memberPortal.carnets.default')}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Histórico de carnês emitidos ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 mt-2">
          <History size={16} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
            {t('memberPortal.carnets.issuanceHistory')}
          </h2>
        </div>

        {carnetHistory.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-xs">{t('memberPortal.carnets.noIssued')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carnetHistory.map((txn) => {
              const isJovens = txn.category === 'JOVENS';
              return (
                <div key={txn.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isJovens ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <BookOpen size={14} className={isJovens ? 'text-orange-500' : 'text-blue-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-xs font-semibold truncate">{txn.description}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      {t('memberPortal.carnets.issuedAt')} {formatDate(txn.date.split('T')[0], lang)}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${isJovens ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {txn.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
