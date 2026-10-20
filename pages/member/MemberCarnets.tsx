import React, { useState, useEffect } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../i18n';
import { 
  BookOpen, 
  Download, 
  Loader, 
  AlertCircle, 
  History, 
  ChevronLeft, 
  Calendar, 
  Eye, 
  X, 
  ArrowRight,
  FileCheck2,
  Sparkles,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementsToPDF, loadImageForPDF, addImageToPdf } from '../../utils/pdfImageLoader';
import { CarnetTemplate } from '../../types';

const MONTHS_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

interface PreviewModalData {
  url: string;
  monthIndex: number;
  monthName: string;
  template: CarnetTemplate;
}

export const MemberCarnets: React.FC = () => {
  const { carnets, carnetHistory, session, isLoading, refreshCarnetHistory } = useMember();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // null = lista/card principal do carnê | CarnetTemplate = tela com as 12 parcelas
  const [selectedTemplate, setSelectedTemplate] = useState<CarnetTemplate | null>(null);
  
  // "templateId-monthIndex-action" (ex: "id-0-download" ou "id-0-preview")
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Modal de preview da parcela individual
  const [previewData, setPreviewData] = useState<PreviewModalData | null>(null);

  useEffect(() => {
    refreshCarnetHistory();
  }, []);

  // Limpeza segura da URL do Blob ao fechar o preview
  const closePreview = () => {
    if (previewData?.url) {
      URL.revokeObjectURL(previewData.url);
    }
    setPreviewData(null);
  };

  if (!session) return null;
  const member = session.member;
  const currentYear = new Date().getFullYear();

  // Controle de parcelas pagas pelo membro (persistente no localStorage)
  const [paidParcels, setPaidParcels] = useState<Record<number, { paid: boolean; paidAt?: string }>>({});

  const getStorageKey = (templateId: string) =>
    `member_carnet_paid_${member?.id || 'anon'}_${templateId}_${currentYear}`;

  useEffect(() => {
    if (!selectedTemplate) return;
    try {
      const raw = localStorage.getItem(getStorageKey(selectedTemplate.id));
      if (raw) {
        setPaidParcels(JSON.parse(raw));
      } else {
        setPaidParcels({});
      }
    } catch {
      setPaidParcels({});
    }
  }, [selectedTemplate, member?.id, currentYear]);

  const handleTogglePaid = (monthIndex: number) => {
    if (!selectedTemplate) return;
    const current = paidParcels[monthIndex]?.paid;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const updated = {
      ...paidParcels,
      [monthIndex]: current
        ? { paid: false }
        : { paid: true, paidAt: formattedDate }
    };

    setPaidParcels(updated);
    try {
      localStorage.setItem(getStorageKey(selectedTemplate.id), JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  };

  const getMonthName = (monthIndex: number) =>
    new Date(0, monthIndex).toLocaleString(lang, { month: 'long' });

  /* ── Cria o documento jsPDF para uma ÚNICA parcela individual com dimensões e limites de corte definidos ── */
  const createParcelaDoc = async (template: CarnetTemplate, monthIndex: number): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const TICKET_WIDTH_MM = 210;
    const TICKET_HEIGHT_MM = 70;
    const STUB_X_MM = 52.5; // 210 * 0.25 (canhoto a 25%)
    const EDITOR_WIDTH = 794;
    const scale = TICKET_WIDTH_MM / EDITOR_WIDTH;
    const imageCache: Record<string, string | null> = {};

    // Posicionamento no topo da folha A4 com margem superior de 10mm para corte seguro
    const startY = 10;
    const endY = startY + TICKET_HEIGHT_MM;

    // 1. Imagem de fundo proporcional aos limites exatos do carnê (210 x 70 mm) — sem esticar
    if (template.backgroundUrl) {
      const bgData = await loadImageForPDF(template.backgroundUrl);
      if (bgData) {
        addImageToPdf(doc, bgData, 0, startY, TICKET_WIDTH_MM, TICKET_HEIGHT_MM);
      }
    } else {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, startY, TICKET_WIDTH_MM, TICKET_HEIGHT_MM, 'F');
    }

    const replacements: Record<string, string> = {
      '{{nome_membro}}':   member.name,
      '{{cpf}}':           member.cpf || '',
      '{{mes_extenso}}':   MONTHS_PT[monthIndex],
      '{{mes_numero}}':    String(monthIndex + 1).padStart(2, '0'),
      '{{ano}}':           String(currentYear),
      '{{n_parcela}}':     `${monthIndex + 1}/12`,
      '{{valor}}':         'R$ ___,___',
      '{{igreja}}':        session.church.name || 'IgrejaApp',
      '{{numero_membro}}': member.memberNumber || '',
    };

    // 2. Renderização dos elementos de texto e imagens no interior dos 70mm da parcela
    if (template.layoutJson && Array.isArray(template.layoutJson) && template.layoutJson.length > 0) {
      await renderElementsToPDF(doc, template.layoutJson, scale, startY, replacements, imageCache);
    } else {
      // Fallback caso o modelo não possua layout customizado
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(session.church.name || 'IGREJA APP', 130, startY + 16, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`CARNÊ DE CONTRIBUIÇÃO - ${currentYear}`, 130, startY + 23, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Parcela: ${String(monthIndex + 1).padStart(2, '0')}/12 (${MONTHS_PT[monthIndex]})`, 60, startY + 36);
      doc.text(`Membro: ${member.name}`, 60, startY + 44);
      doc.text(`CPF: ${member.cpf || 'Não informado'}`, 60, startY + 52);
      doc.text(`Valor: R$ ___,___`, 60, startY + 60);

      // Canhoto fallback
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('CANHOTO', 26, startY + 16, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Parc: ${monthIndex + 1}/12`, 8, startY + 28);
      doc.text(`Mês: ${MONTHS_PT[monthIndex]}`, 8, startY + 36);
      doc.text(`Valor: R$ ____`, 8, startY + 44);
      doc.text(`Data: ___/___`, 8, startY + 52);
    }

    // 3. Linha pontilhada vertical do canhoto (destaque)
    doc.setDrawColor(130, 130, 130);
    doc.setLineWidth(0.35);
    (doc as any).setLineDash([1.5, 1.5], 0);
    doc.line(STUB_X_MM, startY, STUB_X_MM, endY);
    (doc as any).setLineDash([], 0);

    // 4. Limites de corte definidos (largura 210mm x comprimento 70mm)
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.3);
    doc.rect(0, startY, TICKET_WIDTH_MM, TICKET_HEIGHT_MM);

    // Linha pontilhada superior de corte
    if (startY > 0) {
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      (doc as any).setLineDash([2, 2], 0);
      doc.line(0, startY, TICKET_WIDTH_MM, startY);
      (doc as any).setLineDash([], 0);
    }

    // Linha pontilhada inferior de corte
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.4);
    (doc as any).setLineDash([2, 2], 0);
    doc.line(0, endY, TICKET_WIDTH_MM, endY);
    (doc as any).setLineDash([], 0);

    // Indicador visual de corte com tesoura
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.text('✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - Linha de Corte da Parcela (210 x 70 mm) - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂', 105, endY + 4, { align: 'center' });

    return doc;
  };

  /* ── Ação 1: Visualizar o PDF da parcela individual ── */
  const handlePreviewParcela = async (template: CarnetTemplate, monthIndex: number) => {
    const key = `${template.id}-${monthIndex}-preview`;
    setActionLoadingKey(key);
    setError('');

    try {
      const doc = await createParcelaDoc(template, monthIndex);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      setPreviewData({
        url: blobUrl,
        monthIndex,
        monthName: MONTHS_PT[monthIndex],
        template,
      });
    } catch (e) {
      console.error('[handlePreviewParcela] erro:', e);
      setError(t('memberPortal.carnets.pdfError') || 'Erro ao gerar visualização do PDF.');
    } finally {
      setActionLoadingKey(null);
    }
  };

  /* ── Ação 2: Baixar exclusivamente o PDF daquela parcela ── */
  const handleDownloadParcela = async (template: CarnetTemplate, monthIndex: number) => {
    const key = `${template.id}-${monthIndex}-download`;
    setActionLoadingKey(key);
    setError('');

    try {
      const doc = await createParcelaDoc(template, monthIndex);
      const monthName = MONTHS_PT[monthIndex];
      const safeFirstName = (member.name || 'Membro').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `parcela_${String(monthIndex + 1).padStart(2, '0')}_${monthName}_${currentYear}_${safeFirstName}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error('[handleDownloadParcela] erro:', e);
      setError(t('memberPortal.carnets.pdfError') || 'Erro ao baixar o PDF da parcela.');
    } finally {
      setActionLoadingKey(null);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     TELA 2 — Lista / Grade com as 12 Parcelas Individuais
  ═══════════════════════════════════════════════════════════ */
  if (selectedTemplate) {
    const paidCount = Object.values(paidParcels).filter(p => p?.paid).length;
    const progressPercent = Math.round((paidCount / 12) * 100);

    return (
      <div className="space-y-6 w-full animate-fade-in">
        {/* Cabeçalho de Navegação com botão Voltar */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { setSelectedTemplate(null); setError(''); }}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Voltar para a seleção de carnês"
            >
              <ChevronLeft size={18} />
              <span>Voltar</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold text-gray-900 truncate">
                {selectedTemplate.name || `Carnê de Contribuições ${currentYear}`}
              </h1>
              <p className="text-gray-500 text-xs">
                Ano {currentYear} · 12 parcelas individuais disponíveis
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Download Individual
          </span>
        </div>

        {/* Card de Controle e Progresso de Pagamentos do Membro */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-orange-50 border border-emerald-200/90 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                Seu Controle Pessoal de Mensalidades
              </span>
              <h3 className="text-sm md:text-base font-black text-gray-900">
                {paidCount} de 12 parcelas quitadas ({progressPercent}%)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Marque abaixo as parcelas que você já pagou para manter tudo organizado!
              </p>
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="w-full sm:w-56 flex flex-col gap-1.5 shrink-0">
            <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden p-0.5 border border-gray-200">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-700">{paidCount} pagas</span>
              <span className="text-gray-500">
                {12 - paidCount === 0 ? 'Tudo quitado! 🎉' : `Restam ${12 - paidCount} parcelas`}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Grade das 12 parcelas organizadas individualmente em até 4 colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MONTHS_PT.map((month, i) => {
            const previewKey = `${selectedTemplate.id}-${i}-preview`;
            const downloadKey = `${selectedTemplate.id}-${i}-download`;
            const isPreviewLoading = actionLoadingKey === previewKey;
            const isDownloadLoading = actionLoadingKey === downloadKey;
            const isDisabled = !!actionLoadingKey;
            const isPaid = !!paidParcels[i]?.paid;
            const paidAt = paidParcels[i]?.paidAt;

            return (
              <div
                key={i}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 group shadow-sm hover:shadow-md ${
                  isPaid
                    ? 'bg-gradient-to-b from-emerald-50/50 via-white to-white border-emerald-300 ring-2 ring-emerald-400/20'
                    : 'bg-white border-gray-200/90 hover:border-orange-200'
                }`}
              >
                {/* Cabeçalho da parcela */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    Parcela {String(i + 1).padStart(2, '0')}
                  </span>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Quitada
                    </span>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                      <Calendar size={14} />
                    </div>
                  )}
                </div>

                {/* Nome do Mês e Detalhe */}
                <div>
                  <h3 className="text-base font-bold text-gray-900 capitalize">
                    {getMonthName(i)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isPaid ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600 inline shrink-0" />
                        {paidAt ? `Paga em ${paidAt}` : 'Mensalidade Paga'}
                      </span>
                    ) : (
                      `Exercício de ${currentYear}`
                    )}
                  </p>
                </div>

                {/* BOTÃO PARA O MEMBRO SABER/CONTROLAR QUE PAGOU AQUELA MENSALIDADE */}
                <button
                  type="button"
                  onClick={() => handleTogglePaid(i)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-sm ${
                    isPaid
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                      : 'border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50/70 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700'
                  }`}
                  title={isPaid ? 'Clique para desmarcar se necessário' : 'Clique para marcar que você já pagou esta mensalidade'}
                >
                  {isPaid ? (
                    <>
                      <CheckCircle2 size={15} className="text-emerald-200 animate-pulse" />
                      <span>Mensalidade Paga ✓</span>
                    </>
                  ) : (
                    <>
                      <Circle size={15} className="text-gray-400 group-hover:text-emerald-600" />
                      <span>Marcar como Paga</span>
                    </>
                  )}
                </button>

                {/* Ações individuais da parcela */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  {/* Botão 1: Visualizar PDF */}
                  <button
                    onClick={() => handlePreviewParcela(selectedTemplate, i)}
                    disabled={isDisabled}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                    title={`Visualizar PDF da Parcela ${String(i + 1).padStart(2, '0')}`}
                  >
                    {isPreviewLoading ? (
                      <Loader size={13} className="animate-spin text-orange-600" />
                    ) : (
                      <Eye size={13} className="text-gray-600" />
                    )}
                    <span>{isPreviewLoading ? 'Abrindo...' : 'Visualizar'}</span>
                  </button>

                  {/* Botão 2: Baixar PDF */}
                  <button
                    onClick={() => handleDownloadParcela(selectedTemplate, i)}
                    disabled={isDisabled}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                    title={`Baixar PDF da Parcela ${String(i + 1).padStart(2, '0')}`}
                  >
                    {isDownloadLoading ? (
                      <Loader size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>{isDownloadLoading ? 'Baixando...' : 'Baixar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-3 text-center text-xs text-orange-800">
          <p>
            ℹ️ Cada arquivo gerado contém <strong>exclusivamente a parcela selecionada</strong>, ideal para impressão ou envio avulso.
          </p>
        </div>

        {/* MODAL DE VISUALIZAÇÃO DO PDF DA PARCELA */}
        {previewData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden border border-gray-200">
              {/* Header do Modal */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Eye size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">
                      Visualização — Parcela {String(previewData.monthIndex + 1).padStart(2, '0')} ({previewData.monthName} / {currentYear})
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {previewData.template.name || 'Carnê de Contribuições'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePreview}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo do Modal com Iframe do PDF */}
              <div className="flex-1 p-2 md:p-4 bg-gray-100 overflow-hidden flex flex-col">
                <iframe
                  src={previewData.url}
                  title={`Visualização da Parcela ${previewData.monthIndex + 1}`}
                  className="w-full h-[62vh] md:h-[68vh] rounded-xl border border-gray-300 bg-white shadow-inner"
                />
              </div>

              {/* Rodapé do Modal com Ação de Download */}
              <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <button
                  onClick={closePreview}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => handleDownloadParcela(previewData.template, previewData.monthIndex)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  <Download size={14} />
                  <span>Baixar Esta Parcela (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     TELA 1 — Card do Carnê no Topo + Histórico na Parte Inferior
  ═══════════════════════════════════════════════════════════ */
  // Modelo primário padrão ou virtual para garantir que o membro sempre tenha acesso
  const activeCarnetList: CarnetTemplate[] = carnets.length > 0 
    ? carnets 
    : [
        {
          id: 'default-carnet',
          churchId: session.church.id,
          name: `Carnê de Contribuições ${currentYear}`,
          category: 'MISSOES',
          layoutJson: [],
          isDefault: true
        }
      ];

  return (
    <div className="space-y-7 w-full animate-fade-in">
      {/* Título e Subtítulo */}
      <div>
        <h1 className="text-xl md:text-2xl font-black text-gray-900">
          {t('memberPortal.carnets.title') || 'Carnês'}
        </h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">
          Acesse o seu carnê anual para visualizar e baixar cada uma das 12 parcelas individualmente.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-700">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ── PARTE SUPERIOR: CARTÃO EM DESTAQUE REPRESENTANDO O CARNÊ ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-orange-500" />
          <h2 className="text-xs md:text-sm font-bold text-gray-600 uppercase tracking-wider">
            Carnê Disponível
          </h2>
        </div>

        {isLoading ? (
          <div className="animate-pulse bg-gray-200 rounded-2xl h-40" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCarnetList.map((template) => (
              <div
                key={template.id}
                onClick={() => { setSelectedTemplate(template); setError(''); }}
                className="relative overflow-hidden bg-gradient-to-br from-white via-white to-orange-50/50 rounded-2xl border-2 border-orange-200/80 shadow-sm hover:shadow-lg hover:border-orange-400 transition-all p-5 md:p-6 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Efeito sutil de fundo */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start gap-4 min-w-0">
                  {/* Ícone ou Capa do Carnê */}
                  {template.backgroundUrl ? (
                    <img
                      src={template.backgroundUrl}
                      alt={template.name}
                      className="w-16 h-16 rounded-xl object-cover border border-orange-200 shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                      <BookOpen size={28} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {template.category || 'CONTRIBUIÇÕES'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">
                        {currentYear}
                      </span>
                    </div>

                    <h3 className="text-base md:text-lg font-black text-gray-900 mt-1 truncate group-hover:text-orange-600 transition-colors">
                      {template.name || `Carnê de Contribuições ${currentYear}`}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-emerald-500" />
                      <span>12 parcelas mensais disponíveis para download avulso</span>
                    </p>
                  </div>
                </div>

                {/* Botão de Ação do Card */}
                <div className="shrink-0 flex items-center">
                  <button
                    type="button"
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/25 group-hover:shadow-lg transition-all active:scale-95"
                  >
                    <span>Acessar Carnê e Ver Parcelas</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PARTE INFERIOR: HISTÓRICO DE CARNÊS GERADOS ── */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-gray-500" />
          <h2 className="text-xs md:text-sm font-bold text-gray-600 uppercase tracking-wider">
            {t('memberPortal.carnets.issuanceHistory') || 'Histórico de Carnês Gerados'}
          </h2>
        </div>

        {carnetHistory.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
            <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600 text-xs font-medium">
              {t('memberPortal.carnets.noIssued') || 'Nenhum carnê ou parcela registrada no histórico ainda.'}
            </p>
            <p className="text-gray-400 text-[11px] mt-1">
              Assim que você acessar e emitir suas parcelas, elas constarão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {carnetHistory.map((txn) => {
              const isJovens = txn.category === 'JOVENS';
              return (
                <div
                  key={txn.id}
                  className="bg-white rounded-xl border border-gray-200 p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isJovens ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-800 text-xs font-bold truncate">{txn.description}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">
                        {t('memberPortal.carnets.issuedAt') || 'Emitido em'}{' '}
                        {txn.date ? formatDate(txn.date.split('T')[0], lang) : 'Data indisponível'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                      isJovens
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {txn.category || 'CARNÊ'}
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
