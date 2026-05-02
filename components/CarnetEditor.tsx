import React, { useState, useRef } from 'react';
import {
  Upload, Save, Copy, RefreshCw, Loader, Trash2, Edit2, CheckSquare,
  Image as ImageIcon, CheckCircle, X, LayoutTemplate, Printer,
  AlertTriangle, Settings, Sparkles, ToggleLeft, ToggleRight, QrCode, Eye,
} from 'lucide-react';
import { useApp } from '../context';
import { LayoutElement, CarnetTemplate, CarnetBackgroundStyle } from '../types';
import { loadImageForPDF, addImageToPdf } from '../utils/pdfImageLoader';
import jsPDF from 'jspdf';

// ─── Editor constants ─────────────────────────────────────────────────────────
const EDITOR_WIDTH  = 794;
const TICKET_H_MM   = 70;
const TICKET_W_MM   = 210;
const EDITOR_HEIGHT = Math.round((EDITOR_WIDTH * TICKET_H_MM) / TICKET_W_MM); // ≈ 264
const STUB_RATIO    = 0.25;
const STUB_X_PX     = EDITOR_WIDTH * STUB_RATIO; // 198.5 px

// ─── Dynamic vertical centering ───────────────────────────────────────────────
const LINE_SPACING = 36; // px between rows
const CENTER_Y     = Math.round(EDITOR_HEIGHT / 2); // 132 px

// ─── Field definitions ────────────────────────────────────────────────────────
const TAG_DEFS = [
  { id: 'nome',    label: 'Nome do Membro',       tag: '{{nome_membro}}', prefix: 'NOME: ',    dummy: 'JOÃO DA SILVA',     fontSize: 10, fontSizeStub: 8  },
  { id: 'valor',   label: 'Valor',                 tag: '{{valor}}',       prefix: 'VALOR: ',   dummy: 'R$ 50,00',          fontSize: 11, fontSizeStub: 9  },
  { id: 'mes',     label: 'Mês / Referência',      tag: '{{mes_extenso}}', prefix: 'MÊS: ',     dummy: 'MARÇO',             fontSize: 10, fontSizeStub: 8  },
  { id: 'data',    label: 'Data (preench. manual)', tag: '',               prefix: 'DATA: ___/___/____', dummy: '',         fontSize: 10, fontSizeStub: 8  },
] as const;

type TagId = typeof TAG_DEFS[number]['id'];

// ─── Build layout from checked tags + stub mode ───────────────────────────────
const buildLayout = (checkedIds: TagId[], hasStub: boolean): LayoutElement[] => {
  const els: LayoutElement[] = [];
  const n       = checkedIds.length;
  const startY  = CENTER_Y - Math.round(((n - 1) * LINE_SPACING) / 2);
  checkedIds.forEach((tagId, idx) => {
    const def  = TAG_DEFS.find(t => t.id === tagId)!;
    const y    = startY + idx * LINE_SPACING;
    const content = `${def.prefix}${def.tag}`;
    const base = { type: 'tag' as const, content, style: { color: '#000000', fontWeight: 'bold' as const, textAlign: 'left' as const } };

    if (hasStub) {
      els.push({ ...base, id: `stub_${tagId}`, x: 12, y, style: { ...base.style, fontSize: def.fontSizeStub } });
      els.push({ ...base, id: `main_${tagId}`, x: Math.round(STUB_X_PX + 14), y, style: { ...base.style, fontSize: def.fontSize } });
    } else {
      els.push({ ...base, id: `main_${tagId}`, x: 28, y, style: { ...base.style, fontSize: def.fontSize } });
    }
  });
  return els;
};

// ─── Percentage helper for CSS positioning ───────────────────────────────────
const pct = (val: number, total: number) => `${((val / total) * 100).toFixed(3)}%`;

// ─── Props ────────────────────────────────────────────────────────────────────
export interface CarnetEditorProps {
  category: 'JOVENS' | 'MISSOES';
  templates: CarnetTemplate[];
  onTemplatesChanged: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const CarnetEditor: React.FC<CarnetEditorProps> = ({
  category, templates, onTemplatesChanged,
}) => {
  const {
    currentChurch,
    uploadBookletBackground,
    addCarnetTemplate,
    updateCarnetTemplate,
    deleteCarnetTemplate,
    setDefaultTemplate,
  } = useApp();

  const isOrange = category === 'JOVENS';
  const accentCls = isOrange
    ? 'bg-orange-500 hover:bg-orange-600'
    : 'bg-teal-600 hover:bg-teal-700';
  const accentRing = isOrange ? 'focus:border-orange-500' : 'focus:border-teal-500';
  const accentCheck = isOrange ? 'bg-orange-500 border-orange-500' : 'bg-teal-500 border-teal-500';
  const accentTag   = isOrange ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-teal-500/20 border-teal-500/40 text-teal-300';

  // ── State ──────────────────────────────────────────────────────────────────
  const [templateName,      setTemplateName]      = useState('');
  const [backgroundUrl,     setBackgroundUrl]     = useState<string | undefined>();
  const [bgStyle,           setBgStyle]           = useState<CarnetBackgroundStyle>({ mode: 'fill', opacity: 1.0 });
  const [hasStub,           setHasStub]           = useState(true);
  const [checkedIds,        setCheckedIds]        = useState<TagId[]>([]);
  const [qrUrl,             setQrUrl]             = useState<string | undefined>();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSaving,          setIsSaving]          = useState(false);
  const [isUploading,       setIsUploading]       = useState(false);
  const [isUploadingQr,     setIsUploadingQr]     = useState(false);
  const [confirmDelete,     setConfirmDelete]     = useState<string | null>(null);
  const [feedback,          setFeedback]          = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showFeedback = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const currentLayout = (() => {
    const layout = buildLayout(checkedIds, hasStub);
    if (qrUrl) {
      const QR_SIZE = 65;
      const QR_X = EDITOR_WIDTH - QR_SIZE - 86;
      const QR_Y = Math.round((EDITOR_HEIGHT - QR_SIZE) / 2);
      layout.push({
        id: 'qr_pix', type: 'image', content: qrUrl,
        x: QR_X, y: QR_Y, width: QR_SIZE, height: QR_SIZE,
        style: { fontSize: 10, color: '#000000', fontWeight: 'normal', textAlign: 'left' },
      });
    }
    return layout;
  })();

  // ── Uploads ────────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploading(true);
    const url = await uploadBookletBackground(file);
    if (url) { setBackgroundUrl(url); showFeedback('Arte carregada!'); }
    else      { showFeedback('Erro ao carregar a imagem.', 'error'); }
    setIsUploading(false);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsUploadingQr(true);
    const url = await uploadBookletBackground(file);
    if (url) { setQrUrl(url); showFeedback('QR PIX carregado!'); }
    else      { showFeedback('Erro ao carregar QR.', 'error'); }
    setIsUploadingQr(false);
    if (qrInputRef.current) qrInputRef.current.value = '';
  };

  // ── Tag toggle ─────────────────────────────────────────────────────────────
  const toggleTag = (id: TagId) => {
    setCheckedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Stub toggle ────────────────────────────────────────────────────────────
  const handleStubToggle = () => setHasStub(prev => !prev);

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const handleNew = () => {
    setEditingTemplateId(null); setTemplateName(''); setBackgroundUrl(undefined);
    setBgStyle({ mode: 'fill', opacity: 1.0 }); setHasStub(true);
    setCheckedIds([]); setQrUrl(undefined);
  };

  const handleEdit = (t: CarnetTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateName(t.name);
    setBackgroundUrl(t.backgroundUrl);
    setBgStyle(t.backgroundStyle || { mode: 'fill', opacity: 1.0 });

    // Detect stub from saved layout
    const layout = t.layoutJson || [];
    const stub = layout.some(el => el.id.startsWith('stub_'));
    setHasStub(stub);

    // Detect which tags were checked
    const ids: TagId[] = [];
    TAG_DEFS.forEach(td => {
      if (layout.some(el => el.id === `main_${td.id}` || el.id === `stub_${td.id}`)) {
        ids.push(td.id);
      }
    });
    setCheckedIds(ids);

    // Detect QR
    const qrEl = layout.find(el => el.id === 'qr_pix');
    setQrUrl(qrEl?.content);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildFinalLayout = (): LayoutElement[] => {
    const layout = buildLayout(checkedIds, hasStub);
    if (qrUrl) {
      const QR_SIZE = 65;
      const QR_X = EDITOR_WIDTH - QR_SIZE - 86;
      const QR_Y = Math.round((EDITOR_HEIGHT - QR_SIZE) / 2);
      layout.push({
        id: 'qr_pix', type: 'image', content: qrUrl,
        x: QR_X, y: QR_Y, width: QR_SIZE, height: QR_SIZE,
        style: { fontSize: 10, color: '#000000', fontWeight: 'normal', textAlign: 'left' },
      });
    }
    return layout;
  };

  const handleSave = async (asNew = false) => {
    if (!currentChurch)       return;
    if (!templateName.trim()) { showFeedback('Digite um nome para o modelo.', 'error'); return; }
    if (!backgroundUrl)       { showFeedback('Carregue a arte do carnê.', 'error'); return; }

    setIsSaving(true);
    const layout = buildFinalLayout();

    if (!asNew && editingTemplateId) {
      await updateCarnetTemplate(editingTemplateId, {
        name: templateName, backgroundUrl, backgroundStyle: bgStyle, layoutJson: layout, category,
      });
      showFeedback('Modelo atualizado!');
    } else {
      await addCarnetTemplate({
        id: '', churchId: currentChurch.id, name: templateName,
        backgroundUrl, backgroundStyle: bgStyle, layoutJson: layout,
        isDefault: templates.length === 0, category,
      });
      showFeedback('Modelo salvo!');
      if (!asNew) handleNew();
    }
    setIsSaving(false);
    onTemplatesChanged();
  };

  const handleDelete = async (id: string) => {
    await deleteCarnetTemplate(id);
    if (editingTemplateId === id) handleNew();
    showFeedback('Excluído.', 'info');
    setConfirmDelete(null);
    onTemplatesChanged();
  };

  const handleSetDefault = async (id: string) => {
    if (!currentChurch) return;
    await setDefaultTemplate(id, currentChurch.id, category);
    showFeedback('Definido como padrão!');
    onTemplatesChanged();
  };

  // ── Test print ─────────────────────────────────────────────────────────────
  const handleTestPrint = async () => {
    if (!backgroundUrl) { showFeedback('Carregue a arte primeiro.', 'error'); return; }
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [TICKET_H_MM, TICKET_W_MM] });
    const scale = TICKET_W_MM / EDITOR_WIDTH;

    const bgData = await loadImageForPDF(backgroundUrl);
    if (bgData) addImageToPdf(doc, bgData, 0, 0, TICKET_W_MM, TICKET_H_MM);

    const dummy: Record<string, string> = {
      '{{nome_membro}}': 'JOÃO DA SILVA',
      '{{valor}}': 'R$ 50,00',
      '{{n_parcela}}': '3/12',
      '{{mes_extenso}}': 'MARÇO',
    };

    const layout = buildFinalLayout();
    for (const el of layout) {
      if (el.type === 'image') {
        const img = await loadImageForPDF(el.content);
        if (img) {
          const wMM = (el.width  || 50) * scale;
          const hMM = (el.height || 50) * scale;
          doc.addImage(img, 'JPEG', el.x * scale, el.y * scale, wMM, hMM);
        }
      } else {
        let text = Object.entries(dummy).reduce((t, [k, v]) => t.replace(k, v), el.content);
        doc.setTextColor(el.style.color);
        doc.setFontSize(el.style.fontSize);
        doc.setFont('helvetica', el.style.fontWeight === 'bold' ? 'bold' : 'normal');
        doc.text(text, el.x * scale, el.y * scale + el.style.fontSize * 0.35);
      }
    }
    if (hasStub) {
      doc.setDrawColor(160, 160, 160);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(TICKET_W_MM * STUB_RATIO, 0, TICKET_W_MM * STUB_RATIO, TICKET_H_MM);
    }
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([], 0);
    doc.rect(0, 0, TICKET_W_MM, TICKET_H_MM);
    window.open(doc.output('bloburl'), '_blank');
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toast */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2.5 ${
          feedback.type === 'success' ? 'bg-green-600' : feedback.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
          {feedback.msg}
        </div>
      )}

      {/* Editor layout */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* ── LEFT: Dark control panel ─────────────────────────────────────── */}
        <div className="xl:w-64 shrink-0 bg-gray-900 rounded-2xl p-5 space-y-5 text-white shadow-2xl">

          {/* Model name */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Settings size={12}/> Configurações
            </p>
            <input
              type="text"
              placeholder="Nome do modelo..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className={`w-full bg-gray-800 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm font-bold border border-gray-700 outline-none focus:ring-1 ${accentRing}`}
            />
          </div>

          {/* Background upload */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ImageIcon size={12}/> Arte do Carnê
            </p>
            <button
              onClick={() => bgInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60 text-white transition-all ${
                backgroundUrl ? 'bg-green-700 hover:bg-green-600' : `${accentCls}`
              }`}
            >
              {isUploading
                ? <><Loader size={13} className="animate-spin"/> Carregando...</>
                : backgroundUrl
                  ? <><CheckCircle size={13}/> Imagem carregada</>
                  : <><Upload size={13}/> Carregar Arte</>
              }
            </button>
            <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>

            {backgroundUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 relative group">
                <img src={backgroundUrl} alt="bg" className="w-full h-12 object-cover opacity-70"/>
                <button
                  onClick={() => setBackgroundUrl(undefined)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                >
                  <X size={10}/>
                </button>
              </div>
            )}
          </div>

          {/* Canhoto toggle */}
          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={handleStubToggle}
              className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700 hover:bg-gray-750 transition-colors"
            >
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                {hasStub
                  ? <ToggleRight size={18} className={isOrange ? 'text-orange-400' : 'text-teal-400'}/>
                  : <ToggleLeft size={18} className="text-gray-600"/>
                }
                Possui canhoto?
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                hasStub
                  ? isOrange ? 'bg-orange-500/20 text-orange-400' : 'bg-teal-500/20 text-teal-400'
                  : 'bg-gray-700 text-gray-500'
              }`}>
                {hasStub ? 'SIM' : 'NÃO'}
              </span>
            </button>
            {hasStub && (
              <p className="text-[9px] text-gray-600 mt-1.5 text-center">
                Linha de picote a 25% da largura
              </p>
            )}
          </div>

          {/* Smart tags */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className={isOrange ? 'text-orange-400' : 'text-teal-400'}/> Campos de Texto
            </p>
            <div className="space-y-1.5">
              {TAG_DEFS.map(tag => {
                const isOn = checkedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border ${
                      isOn ? accentTag : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isOn ? accentCheck : 'border-gray-600'
                    }`}>
                      {isOn && <CheckCircle size={10} className="text-white"/>}
                    </div>
                    <span className="flex-1">{tag.label}</span>
                    {isOn && hasStub && (
                      <span className="text-[9px] bg-blue-900/40 text-blue-400 border border-blue-700/40 px-1 rounded font-bold">×2</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* QR PIX */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <QrCode size={12} className="text-purple-400"/> QR Code PIX
            </p>
            <button
              onClick={() => qrInputRef.current?.click()}
              disabled={isUploadingQr}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                qrUrl ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {isUploadingQr
                ? <><Loader size={13} className="animate-spin"/> Carregando...</>
                : qrUrl
                  ? <><CheckCircle size={13}/> QR carregado</>
                  : <><Upload size={13}/> Carregar QR PIX</>
              }
            </button>
            <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload}/>
            {qrUrl && (
              <button
                onClick={() => setQrUrl(undefined)}
                className="mt-1.5 w-full text-[9px] text-red-400 hover:text-red-300 text-center transition-colors"
              >
                Remover QR
              </button>
            )}
          </div>

          {/* BG opacity — shown only when bg loaded */}
          {backgroundUrl && (
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Eye size={12}/> Opacidade da Arte
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0.1" max="1" step="0.05"
                  value={bgStyle.opacity}
                  onChange={e => setBgStyle(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className={`flex-1 h-1 cursor-pointer ${isOrange ? 'accent-orange-500' : 'accent-teal-500'}`}
                />
                <span className="text-[9px] font-mono text-gray-400 w-7">{Math.round(bgStyle.opacity * 100)}%</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-800 pt-4 space-y-2">
            <button
              onClick={handleTestPrint}
              disabled={!backgroundUrl}
              className="w-full py-2 rounded-xl text-[11px] font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer size={13}/> Prévia de Impressão
            </button>

            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 text-white shadow-lg transition-all ${accentCls}`}
            >
              {isSaving ? <Loader size={14} className="animate-spin"/> : <Save size={14}/>}
              {editingTemplateId ? 'Atualizar Modelo' : 'Salvar Modelo'}
            </button>

            {editingTemplateId && (
              <>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="w-full py-2 rounded-xl text-[11px] font-bold border border-green-800 text-green-500 hover:bg-green-900/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Copy size={11}/> Salvar como Novo
                </button>
                <button
                  onClick={handleNew}
                  className="w-full py-2 rounded-xl text-[11px] font-bold border border-gray-700 text-gray-500 hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw size={11}/> Limpar / Novo
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Preview canvas ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Canvas — container-type enables cqw font scaling */}
          <div
            className="relative border-2 border-dashed border-gray-300 bg-gray-100 rounded-xl mx-auto shadow-inner select-none overflow-hidden"
            style={{
              width: '100%',
              maxWidth: `${EDITOR_WIDTH}px`,
              aspectRatio: `${TICKET_W_MM}/${TICKET_H_MM}`,
              containerType: 'inline-size',
            }}
          >
            {/* Background */}
            {backgroundUrl ? (
              <img
                src={backgroundUrl}
                alt="bg"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ objectFit: 'fill', opacity: bgStyle.opacity }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                <ImageIcon size={28} className="opacity-30"/>
                <span className="text-xs font-bold opacity-50">Carregue a arte do carnê</span>
              </div>
            )}

            {hasStub ? (
              <>
                {/* ── STUB ZONE (0–25%) — clips overflow at boundary ── */}
                <div
                  className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none z-20"
                  style={{ width: `${STUB_RATIO * 100}%` }}
                >
                  <span className="absolute top-[3%] left-[4%] text-[1.8cqw] font-black text-blue-700/60 uppercase tracking-widest select-none leading-none">
                    Canhoto
                  </span>
                  {currentLayout
                    .filter(el => el.id.startsWith('stub_'))
                    .map(el => {
                      const dummy: Record<string, string> = { '{{nome_membro}}': 'JOÃO DA SILVA', '{{valor}}': 'R$ 50,00', '{{n_parcela}}': '3/12', '{{mes_extenso}}': 'MARÇO' };
                      const text = Object.entries(dummy).reduce((t, [k, v]) => t.replace(k, v), el.content);
                      return (
                        <div
                          key={el.id}
                          className="absolute"
                          style={{
                            left:       pct(el.x, STUB_X_PX),
                            top:        pct(el.y, EDITOR_HEIGHT),
                            fontSize:   `${(el.style.fontSize / EDITOR_WIDTH) * 100}cqw`,
                            color:      el.style.color,
                            fontWeight: el.style.fontWeight,
                            fontFamily: 'Helvetica, Arial, sans-serif',
                            whiteSpace: 'nowrap',
                            textShadow: '0 0 2px rgba(255,255,255,1)',
                            lineHeight: 1.2,
                          }}
                        >
                          {text}
                        </div>
                      );
                    })
                  }
                </div>

                {/* ── Dashed divider line ── */}
                <div
                  className="absolute top-0 bottom-0 z-30 pointer-events-none"
                  style={{ left: `${STUB_RATIO * 100}%`, borderLeft: '2px dashed rgba(80,100,220,0.7)' }}
                />

                {/* ── MAIN ZONE (25%–100%) — clips overflow at right edge ── */}
                <div
                  className="absolute top-0 h-full overflow-hidden pointer-events-none z-20"
                  style={{ left: `${STUB_RATIO * 100}%`, right: 0 }}
                >
                  <span className="absolute top-[3%] left-[1.5%] text-[1.6cqw] font-black text-gray-500/60 uppercase tracking-widest select-none leading-none">
                    Principal
                  </span>
                  {currentLayout
                    .filter(el => el.id.startsWith('main_') || el.id === 'qr_pix')
                    .map(el => {
                      if (el.type === 'image') {
                        const zoneW = EDITOR_WIDTH - STUB_X_PX;
                        return (
                          <div
                            key={el.id}
                            className="absolute border border-purple-400 rounded bg-white/70 flex items-center justify-center overflow-hidden"
                            style={{
                              left:   pct(el.x - STUB_X_PX, zoneW),
                              top:    pct(el.y, EDITOR_HEIGHT),
                              width:  pct(el.width  || 50, zoneW),
                              height: pct(el.height || 50, EDITOR_HEIGHT),
                            }}
                          >
                            <img src={el.content} alt="QR" className="w-full h-full object-contain"/>
                          </div>
                        );
                      }
                      const dummy: Record<string, string> = { '{{nome_membro}}': 'JOÃO DA SILVA', '{{valor}}': 'R$ 50,00', '{{n_parcela}}': '3/12', '{{mes_extenso}}': 'MARÇO' };
                      const text = Object.entries(dummy).reduce((t, [k, v]) => t.replace(k, v), el.content);
                      const zoneW = EDITOR_WIDTH - STUB_X_PX;
                      return (
                        <div
                          key={el.id}
                          className="absolute"
                          style={{
                            left:       pct(el.x - STUB_X_PX, zoneW),
                            top:        pct(el.y, EDITOR_HEIGHT),
                            fontSize:   `${(el.style.fontSize / EDITOR_WIDTH) * 100}cqw`,
                            color:      el.style.color,
                            fontWeight: el.style.fontWeight,
                            fontFamily: 'Helvetica, Arial, sans-serif',
                            whiteSpace: 'nowrap',
                            textShadow: '0 0 2px rgba(255,255,255,1)',
                            lineHeight: 1.2,
                          }}
                        >
                          {text}
                        </div>
                      );
                    })
                  }
                </div>
              </>
            ) : (
              /* ── NO STUB — full width zone ── */
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                {currentLayout.map(el => {
                  if (el.type === 'image') {
                    return (
                      <div
                        key={el.id}
                        className="absolute border border-purple-400 rounded bg-white/70 flex items-center justify-center overflow-hidden"
                        style={{
                          left:   pct(el.x, EDITOR_WIDTH),
                          top:    pct(el.y, EDITOR_HEIGHT),
                          width:  pct(el.width  || 50, EDITOR_WIDTH),
                          height: pct(el.height || 50, EDITOR_HEIGHT),
                        }}
                      >
                        <img src={el.content} alt="QR" className="w-full h-full object-contain"/>
                      </div>
                    );
                  }
                  const dummy: Record<string, string> = { '{{nome_membro}}': 'JOÃO DA SILVA', '{{valor}}': 'R$ 50,00', '{{n_parcela}}': '3/12', '{{mes_extenso}}': 'MARÇO' };
                  const text = Object.entries(dummy).reduce((t, [k, v]) => t.replace(k, v), el.content);
                  return (
                    <div
                      key={el.id}
                      className="absolute"
                      style={{
                        left:       pct(el.x, EDITOR_WIDTH),
                        top:        pct(el.y, EDITOR_HEIGHT),
                        fontSize:   `${(el.style.fontSize / EDITOR_WIDTH) * 100}cqw`,
                        color:      el.style.color,
                        fontWeight: el.style.fontWeight,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        whiteSpace: 'nowrap',
                        textShadow: '0 0 2px rgba(255,255,255,1)',
                        lineHeight: 1.2,
                      }}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            {checkedIds.length === 0
              ? 'Marque os campos no painel esquerdo para vê-los na prévia'
              : hasStub
                ? 'Campos aparecem nas duas zonas com clipe automático na linha de picote'
                : 'Campos aparecem em posições fixas na folha'
            }
          </p>
        </div>
      </div>

      {/* ── Saved templates grid ──────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-700 flex items-center gap-2 text-base">
            <LayoutTemplate size={18} className={isOrange ? 'text-orange-500' : 'text-teal-600'}/>
            Modelos Salvos
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {templates.length} modelo{templates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <LayoutTemplate size={30} className="mx-auto text-gray-200 mb-3"/>
            <p className="text-sm font-bold text-gray-400">Nenhum modelo salvo ainda</p>
            <p className="text-xs text-gray-300 mt-1">Configure e salve seu primeiro modelo acima</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <div
                key={t.id}
                className={`border rounded-2xl overflow-hidden hover:shadow-md transition-all ${
                  editingTemplateId === t.id
                    ? `ring-2 ${isOrange ? 'ring-orange-400 border-orange-200' : 'ring-teal-400 border-teal-200'} shadow-md`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Thumbnail — aspect ratio matches the carnê */}
                <div
                  className="relative overflow-hidden bg-gray-100"
                  style={{ aspectRatio: `${TICKET_W_MM}/${TICKET_H_MM}` }}
                >
                  {t.backgroundUrl
                    ? <img src={t.backgroundUrl} alt={t.name} className="w-full h-full object-fill"/>
                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={20}/></div>
                  }
                  {t.isDefault && (
                    <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm">PADRÃO</span>
                  )}
                  {editingTemplateId === t.id && (
                    <span className={`absolute top-1.5 right-1.5 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm ${isOrange ? 'bg-orange-500' : 'bg-teal-500'}`}>EDITANDO</span>
                  )}
                </div>

                <div className="p-3">
                  <p className="font-bold text-sm text-gray-800 truncate" title={t.name}>{t.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {t.layoutJson?.length || 0} elemento{(t.layoutJson?.length || 0) !== 1 ? 's' : ''}
                    {t.layoutJson?.some(el => el.id.startsWith('stub_')) ? ' · com canhoto' : ''}
                  </p>
                </div>

                <div className="px-3 pb-3 flex gap-1.5">
                  <button
                    onClick={() => handleEdit(t)}
                    className="flex-1 py-2 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-gray-200 hover:border-orange-200 transition-all"
                  >
                    <Edit2 size={11}/> Editar
                  </button>
                  {!t.isDefault && (
                    <button
                      onClick={() => handleSetDefault(t.id)}
                      title="Definir como padrão"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-gray-200 hover:border-green-200"
                    >
                      <CheckSquare size={13}/>
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(t.id)}
                    title="Excluir"
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-gray-200 hover:border-red-200"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600"/>
              </div>
              <div>
                <p className="font-bold text-gray-800">Excluir este modelo?</p>
                <p className="text-xs text-gray-500 mt-1">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarnetEditor;
