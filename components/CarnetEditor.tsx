import React, { useState, useRef } from 'react';
import Draggable, { DraggableData } from 'react-draggable';
import { GoogleGenAI, Type as GenAIType } from '@google/genai';
import {
  Upload, Save, Copy, RefreshCw, Loader, Trash2, Edit2, CheckSquare,
  Image as ImageIcon, Type, User as UserIcon, DollarSign, Hash, CalendarDays,
  Printer, CheckCircle, Sparkles, Settings, Eye, AlertTriangle, X,
  Grid, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useApp } from '../context';
import { LayoutElement, CarnetTemplate, CarnetBackgroundStyle } from '../types';
import jsPDF from 'jspdf';

// ─── Canvas constants (210mm × 70mm ticket at 96dpi) ───────────────────────
const EDITOR_WIDTH = 794;
const TICKET_H_MM = 70;
const TICKET_W_MM = 210;
const EDITOR_HEIGHT = (EDITOR_WIDTH * TICKET_H_MM) / TICKET_W_MM; // ≈ 264px

// Stub divider sits at 25 % of canvas width
const STUB_RATIO = 0.25;
const STUB_DIVIDER_X = EDITOR_WIDTH * STUB_RATIO; // ≈ 198 px

// ─── Smart‑tag definitions ──────────────────────────────────────────────────
interface TagDef {
  id: string;
  label: string;
  tag: string;      // the {{placeholder}} used by the PDF engine
  rowY: number;     // default vertical position (pixels)
}

const TAG_DEFS: TagDef[] = [
  { id: 'nome',    label: 'Nome do Membro',     tag: '{{nome_membro}}', rowY: 18  },
  { id: 'valor',   label: 'Valor',               tag: '{{valor}}',       rowY: 72  },
  { id: 'parcela', label: 'Parcela / Vencimento', tag: '{{n_parcela}}',   rowY: 126 },
  { id: 'mes',     label: 'Mês / Referência',    tag: '{{mes_extenso}}', rowY: 185 },
];

const makeStubId = (tagId: string) => `stub_${tagId}`;
const makeMainId = (tagId: string) => `main_${tagId}`;

// ─── fileToBase64 ───────────────────────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
  });

// ─── DraggableLabel ─────────────────────────────────────────────────────────
interface DraggableLabelProps {
  el: LayoutElement;
  isSelected: boolean;
  isStub: boolean;
  onSelect: (id: string) => void;
  onDragStop: (id: string, data: DraggableData) => void;
}

const DraggableLabel: React.FC<DraggableLabelProps> = ({
  el, isSelected, isStub, onSelect, onDragStop
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: el.x, y: el.y }}
      onStop={(_e, d) => onDragStop(el.id, d)}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className="absolute cursor-grab active:cursor-grabbing select-none"
        style={{ top: 0, left: 0 }}
        onClick={e => { e.stopPropagation(); onSelect(el.id); }}
      >
        <div
          className={`px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap transition-all border ${
            isSelected
              ? 'border-orange-500 bg-orange-500/30 ring-2 ring-orange-500 shadow-lg'
              : isStub
              ? 'border-blue-400 bg-blue-100/80'
              : 'border-gray-400 bg-white/80'
          }`}
          style={{
            fontSize:   `${el.style.fontSize}px`,
            color:      el.style.color,
            fontWeight: el.style.fontWeight,
            lineHeight: 1.15,
            textShadow: isSelected ? 'none' : '0 0 3px rgba(255,255,255,0.9)',
          }}
        >
          {el.content}
        </div>
      </div>
    </Draggable>
  );
};

// ─── CarnetEditor ────────────────────────────────────────────────────────────
export interface CarnetEditorProps {
  category: 'JOVENS' | 'MISSOES';
  templates: CarnetTemplate[];
  onTemplatesChanged: () => void;
}

export const CarnetEditor: React.FC<CarnetEditorProps> = ({
  category,
  templates,
  onTemplatesChanged,
}) => {
  const {
    currentChurch,
    uploadBookletBackground,
    addCarnetTemplate,
    updateCarnetTemplate,
    deleteCarnetTemplate,
    setDefaultTemplate,
  } = useApp();

  // ── Editor state ──────────────────────────────────────────────────────────
  const [templateName,      setTemplateName]      = useState('');
  const [backgroundUrl,     setBackgroundUrl]     = useState<string | undefined>();
  const [bgStyle,           setBgStyle]           = useState<CarnetBackgroundStyle>({ mode: 'fill', opacity: 1.0 });
  const [layoutElements,    setLayoutElements]    = useState<LayoutElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // ── Smart‑tag state ───────────────────────────────────────────────────────
  const [hasStub,     setHasStub]     = useState(true);
  const [checkedTags, setCheckedTags] = useState<Set<string>>(new Set());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isSaving,      setIsSaving]      = useState(false);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [feedback,      setFeedback]      = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);

  const accentBg  = category === 'JOVENS' ? 'bg-orange-500' : 'bg-teal-600';
  const accentRing = category === 'JOVENS' ? 'ring-orange-500' : 'ring-teal-500';

  // ── Feedback helper ───────────────────────────────────────────────────────
  const showFeedback = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3200);
  };

  // ── Tag toggle logic ──────────────────────────────────────────────────────
  const toggleTag = (tagId: string) => {
    const tagDef = TAG_DEFS.find(t => t.id === tagId)!;
    const isOn   = checkedTags.has(tagId);

    if (isOn) {
      setLayoutElements(prev =>
        prev.filter(el => el.id !== makeStubId(tagId) && el.id !== makeMainId(tagId))
      );
      setCheckedTags(prev => { const s = new Set(prev); s.delete(tagId); return s; });
      if (selectedElementId === makeStubId(tagId) || selectedElementId === makeMainId(tagId)) {
        setSelectedElementId(null);
      }
    } else {
      const stubX = 15;
      const mainX = Math.round(STUB_DIVIDER_X + 18);
      const soloX = 60;
      const newEls: LayoutElement[] = [];

      if (hasStub) {
        newEls.push({
          id:      makeStubId(tagId),
          type:    'tag',
          content: tagDef.tag,
          x:       stubX,
          y:       tagDef.rowY,
          style:   { fontSize: 9, color: '#000000', fontWeight: 'bold', textAlign: 'left' },
        });
      }

      newEls.push({
        id:      makeMainId(tagId),
        type:    'tag',
        content: tagDef.tag,
        x:       hasStub ? mainX : soloX,
        y:       tagDef.rowY,
        style:   { fontSize: 11, color: '#000000', fontWeight: 'bold', textAlign: 'left' },
      });

      setLayoutElements(prev => [...prev, ...newEls]);
      setCheckedTags(prev => new Set([...prev, tagId]));
    }
  };

  // ── Stub toggle ───────────────────────────────────────────────────────────
  const handleStubToggle = () => {
    const next = !hasStub;
    setHasStub(next);

    if (!next) {
      // Remove all stub elements
      setLayoutElements(prev => prev.filter(el => !el.id.startsWith('stub_')));
      if (selectedElementId?.startsWith('stub_')) setSelectedElementId(null);
    } else {
      // Add stub elements for already‑checked tags
      const stubs: LayoutElement[] = [];
      checkedTags.forEach(tagId => {
        if (!layoutElements.some(el => el.id === makeStubId(tagId))) {
          const tagDef = TAG_DEFS.find(t => t.id === tagId)!;
          stubs.push({
            id:      makeStubId(tagId),
            type:    'tag',
            content: tagDef.tag,
            x:       15,
            y:       tagDef.rowY,
            style:   { fontSize: 9, color: '#000000', fontWeight: 'bold', textAlign: 'left' },
          });
        }
      });
      if (stubs.length) setLayoutElements(prev => [...prev, ...stubs]);
    }
  };

  // ── Template CRUD helpers ─────────────────────────────────────────────────
  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setBackgroundUrl(undefined);
    setLayoutElements([]);
    setBgStyle({ mode: 'fill', opacity: 1.0 });
    setCheckedTags(new Set());
    setHasStub(true);
    setSelectedElementId(null);
  };

  const handleEditTemplate = (t: CarnetTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateName(t.name);
    setBackgroundUrl(t.backgroundUrl);
    setLayoutElements(t.layoutJson || []);
    setBgStyle(t.backgroundStyle || { mode: 'fill', opacity: 1.0 });

    // Re‑detect which smart tags are present
    const detected = new Set<string>();
    TAG_DEFS.forEach(td => {
      if ((t.layoutJson || []).some(el =>
        el.id === makeMainId(td.id) || el.id === makeStubId(td.id)
      )) {
        detected.add(td.id);
      }
    });
    setCheckedTags(detected);
    setHasStub(!!(t.layoutJson || []).some(el => el.id.startsWith('stub_')));
    setSelectedElementId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTemplate = async (asNew: boolean) => {
    if (!currentChurch) return;
    if (!templateName.trim()) { showFeedback('Digite um nome para o modelo.', 'error'); return; }
    if (!backgroundUrl)       { showFeedback('Carregue uma imagem de fundo.', 'error'); return; }

    setIsSaving(true);
    if (asNew || !editingTemplateId) {
      await addCarnetTemplate({
        id:              '',
        churchId:        currentChurch.id,
        name:            templateName,
        backgroundUrl,
        backgroundStyle: bgStyle,
        layoutJson:      layoutElements,
        isDefault:       templates.length === 0,
        category,
      });
      showFeedback('Modelo salvo com sucesso!');
    } else {
      await updateCarnetTemplate(editingTemplateId, {
        name:            templateName,
        backgroundUrl,
        backgroundStyle: bgStyle,
        layoutJson:      layoutElements,
        category,
      });
      showFeedback('Modelo atualizado!');
    }
    setIsSaving(false);
    onTemplatesChanged();
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteCarnetTemplate(id);
    if (editingTemplateId === id) handleNewTemplate();
    showFeedback('Modelo excluído.');
    setConfirmDelete(null);
    onTemplatesChanged();
  };

  const handleSetDefault = async (id: string) => {
    if (!currentChurch) return;
    await setDefaultTemplate(id, currentChurch.id, category);
    showFeedback('Definido como padrão.');
    onTemplatesChanged();
  };

  // ── Canvas handlers ───────────────────────────────────────────────────────
  const handleDragStop = (id: string, data: DraggableData) => {
    setLayoutElements(prev =>
      prev.map(el => el.id === id ? { ...el, x: data.x, y: data.y } : el)
    );
  };

  const updateSelectedStyle = (key: keyof LayoutElement['style'], value: string | number) => {
    if (!selectedElementId) return;
    setLayoutElements(prev =>
      prev.map(el =>
        el.id === selectedElementId
          ? { ...el, style: { ...el.style, [key]: value } }
          : el
      )
    );
  };

  const handleDeleteElement = (id: string) => {
    setLayoutElements(prev => prev.filter(el => el.id !== id));
    setSelectedElementId(null);
    // Un‑check tag if both stub and main are gone
    TAG_DEFS.forEach(td => {
      if (id === makeStubId(td.id) || id === makeMainId(td.id)) {
        const remaining = layoutElements.filter(el => el.id !== id);
        if (!remaining.some(el => el.id === makeStubId(td.id) || el.id === makeMainId(td.id))) {
          setCheckedTags(prev => { const s = new Set(prev); s.delete(td.id); return s; });
        }
      }
    });
  };

  // ── Background upload + AI ────────────────────────────────────────────────
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    const url = await uploadBookletBackground(file);
    if (url) {
      setBackgroundUrl(url);
      showFeedback('Imagem carregada!');
      analyzeWithGemini(file);
    } else {
      showFeedback('Erro no upload.', 'error');
    }
    setIsSaving(false);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  const analyzeWithGemini = async (file: File) => {
    const apiKey = (import.meta as any).env?.VITE_API_KEY || (globalThis as any).process?.env?.API_KEY;
    if (!apiKey) {
      showFeedback('IA não configurada. Posicione os campos manualmente.', 'info');
      return;
    }
    try {
      setIsAnalyzing(true);
      const base64 = await fileToBase64(file);
      const ai     = new GoogleGenAI({ apiKey });
      const prompt = `Você é especialista em UI/UX. Analise este carnê e encontre as coordenadas dos espaços VAZIOS de preenchimento para cada campo. Campos: nome_membro, valor, mes_extenso, ano, n_parcela. Retorne JSON com coordenadas normalizadas 0‑1000: { "fields": [{ "tag": "{{nome_membro}}", "x": 100, "y": 200, "estimated_font_size": 12 }] }`;
      const res = await ai.models.generateContent({
        model:    'gemini-2.0-flash',
        contents: { parts: [{ inlineData: { mimeType: file.type, data: base64 } }, { text: prompt }] },
        config:   {
          responseMimeType: 'application/json',
          responseSchema: {
            type:       GenAIType.OBJECT,
            properties: {
              fields: {
                type:  GenAIType.ARRAY,
                items: {
                  type:       GenAIType.OBJECT,
                  properties: {
                    tag:                { type: GenAIType.STRING },
                    x:                  { type: GenAIType.NUMBER },
                    y:                  { type: GenAIType.NUMBER },
                    estimated_font_size:{ type: GenAIType.NUMBER },
                  },
                },
              },
            },
          },
        },
      });
      if (res.text) {
        const data = JSON.parse(res.text);
        if (Array.isArray(data.fields) && data.fields.length) {
          const els: LayoutElement[] = data.fields.map((f: any, i: number) => ({
            id:      `ai_${Date.now()}_${i}`,
            type:    'tag' as const,
            content: f.tag,
            x:       (f.x / 1000) * EDITOR_WIDTH,
            y:       (f.y / 1000) * EDITOR_HEIGHT,
            style:   {
              fontSize:   Math.max(8, Math.min(16, f.estimated_font_size || 11)),
              color:      '#000000',
              fontWeight: 'bold',
              textAlign:  'left' as const,
            },
          }));
          setLayoutElements(els);
          setCheckedTags(new Set());
          showFeedback(`IA posicionou ${els.length} campos!`, 'success');
        }
      }
    } catch (err) {
      console.error('Gemini error:', err);
      showFeedback('IA não conseguiu analisar. Edição manual ativa.', 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Test print ────────────────────────────────────────────────────────────
  const handleTestPrint = () => {
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [TICKET_H_MM, TICKET_W_MM] });
    const scale = TICKET_W_MM / EDITOR_WIDTH;
    const dummy: Record<string, string> = {
      '{{nome_membro}}': 'JOÃO DA SILVA',
      '{{valor}}':       'R$ 50,00',
      '{{mes_extenso}}': 'JANEIRO',
      '{{ano}}':         '2026',
      '{{n_parcela}}':   '1/12',
    };
    layoutElements.forEach(el => {
      const text = Object.entries(dummy).reduce(
        (t, [k, v]) => t.replace(k, v), el.content
      );
      doc.setTextColor(el.style.color);
      doc.setFontSize(el.style.fontSize);
      doc.setFont('helvetica', el.style.fontWeight === 'bold' ? 'bold' : 'normal');
      doc.text(text, el.x * scale, el.y * scale + el.style.fontSize * 0.35);
    });
    doc.setDrawColor(200, 200, 200);
    doc.rect(0, 0, TICKET_W_MM, TICKET_H_MM);
    window.open(doc.output('bloburl'), '_blank');
  };

  const selectedEl = layoutElements.find(e => e.id === selectedElementId);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Feedback toast ─────────────────────────────────────────────── */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2 transition-all ${
          feedback.type === 'success' ? 'bg-green-600'
          : feedback.type === 'error' ? 'bg-red-600'
          : 'bg-blue-600'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
          {feedback.msg}
        </div>
      )}

      {/* ── Two‑column main editor ──────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-5">

        {/* LEFT: Dark control panel */}
        <div className="xl:w-64 shrink-0 bg-gray-900 rounded-2xl p-5 space-y-5 text-white shadow-2xl">

          {/* Section: Model name */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Settings size={12}/> Configurações
            </p>
            <input
              type="text"
              placeholder="Nome do modelo..."
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-lg px-3 py-2 text-sm font-bold border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Section: Background upload */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ImageIcon size={12}/> Arte do Carnê
            </p>
            <button
              onClick={() => bgInputRef.current?.click()}
              disabled={isSaving || isAnalyzing}
              className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 ${
                backgroundUrl
                  ? 'bg-green-700 hover:bg-green-600 text-white'
                  : `${accentBg} hover:opacity-90 text-white`
              }`}
            >
              {isAnalyzing ? <><Loader size={13} className="animate-spin"/> IA Analisando...</>
               : isSaving    ? <><Loader size={13} className="animate-spin"/> Carregando...</>
               : backgroundUrl ? <><CheckCircle size={13}/> Imagem carregada</>
               : <><Upload size={13}/> 1. Carregar Arte</>}
            </button>
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundUpload}
            />
            {backgroundUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 relative">
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

          {/* Section: Stub toggle */}
          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={handleStubToggle}
              className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-xl hover:bg-gray-750 border border-gray-700 transition-colors"
            >
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                {hasStub
                  ? <ToggleRight size={18} className="text-orange-400"/>
                  : <ToggleLeft  size={18} className="text-gray-600"/>}
                Possui canhoto?
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                hasStub ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-500'
              }`}>
                {hasStub ? 'SIM' : 'NÃO'}
              </span>
            </button>
            {hasStub && (
              <p className="text-[9px] text-gray-600 mt-1 text-center">
                Linha de picote traçada a 25 % da largura
              </p>
            )}
          </div>

          {/* Section: Smart tag selector */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-orange-400"/> 2. Selecionar Campos
            </p>
            <div className="space-y-1.5">
              {TAG_DEFS.map(tag => {
                const isOn = checkedTags.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border ${
                      isOn
                        ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isOn ? 'bg-orange-500 border-orange-500' : 'border-gray-600'
                    }`}>
                      {isOn && <CheckCircle size={10} className="text-white"/>}
                    </div>
                    <span className="flex-1">{tag.label}</span>
                    {isOn && hasStub && (
                      <span className="text-[9px] bg-blue-900/40 text-blue-400 border border-blue-700/40 px-1 rounded font-bold">
                        ×2
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {checkedTags.size > 0 && (
              <p className="text-[9px] text-gray-600 mt-2 text-center">
                Arraste os campos para posicionar
              </p>
            )}
          </div>

          {/* Section: BG style (only when BG is loaded) */}
          {backgroundUrl && (
            <div className="border-t border-gray-800 pt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Eye size={12}/> Exibição da Arte
              </p>
              <div className="grid grid-cols-3 gap-1 mb-2.5">
                {(['fill', 'cover', 'contain'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setBgStyle(prev => ({ ...prev, mode }))}
                    className={`py-1.5 rounded-lg text-[9px] font-bold capitalize transition-all ${
                      bgStyle.mode === mode
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-600 shrink-0">Opacidade</span>
                <input
                  type="range" min="0.1" max="1" step="0.05"
                  value={bgStyle.opacity}
                  onChange={e => setBgStyle(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                  className="flex-1 h-1 rounded cursor-pointer accent-orange-500"
                />
                <span className="text-[9px] font-mono text-gray-400 w-7">
                  {Math.round(bgStyle.opacity * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Section: Actions */}
          <div className="border-t border-gray-800 pt-4 space-y-2">
            <button
              onClick={handleTestPrint}
              className="w-full py-2 rounded-xl text-[11px] font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
            >
              <Printer size={13}/> Prévia de Impressão
            </button>
            <button
              onClick={() => handleSaveTemplate(false)}
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-500 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {isSaving ? <Loader size={14} className="animate-spin"/> : null}
              {editingTemplateId ? 'Atualizar Modelo' : 'Salvar Modelo'}
            </button>
            {editingTemplateId && (
              <button
                onClick={() => handleSaveTemplate(true)}
                disabled={isSaving}
                className="w-full py-2 rounded-xl text-[11px] font-bold border border-green-800 text-green-500 hover:bg-green-900/20 flex items-center justify-center gap-2 transition-colors"
              >
                <Copy size={11}/> Salvar como Novo
              </button>
            )}
            {editingTemplateId && (
              <button
                onClick={handleNewTemplate}
                className="w-full py-2 rounded-xl text-[11px] font-bold border border-gray-700 text-gray-500 hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw size={11}/> Limpar / Novo
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Canvas preview */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Canvas toolbar (visible when element is selected) */}
          {selectedEl && (
            <div className="bg-gray-900 text-white px-4 py-2.5 rounded-xl flex flex-wrap items-center gap-4 shadow-lg">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                Campo Selecionado:
              </span>

              {/* Font size */}
              <div className="flex items-center gap-2">
                <Type size={13} className="text-gray-400"/>
                <input
                  type="range" min="6" max="36"
                  value={selectedEl.style.fontSize}
                  onChange={e => updateSelectedStyle('fontSize', parseInt(e.target.value))}
                  className="w-20 h-1 accent-orange-500 cursor-pointer"
                />
                <span className="text-[10px] font-mono text-gray-300 w-7">
                  {selectedEl.style.fontSize}px
                </span>
              </div>

              {/* Color */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded-full border border-gray-500"
                  style={{ backgroundColor: selectedEl.style.color }}
                />
                <input
                  type="color"
                  value={selectedEl.style.color}
                  onChange={e => updateSelectedStyle('color', e.target.value)}
                  className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer rounded"
                />
              </div>

              {/* Bold/Normal */}
              <div className="flex gap-1">
                {(['bold', 'normal'] as const).map(fw => (
                  <button
                    key={fw}
                    onClick={() => updateSelectedStyle('fontWeight', fw)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      selectedEl.style.fontWeight === fw
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    style={{ fontWeight: fw }}
                  >
                    {fw === 'bold' ? 'N' : 'R'}
                  </button>
                ))}
              </div>

              {/* Delete element */}
              <button
                onClick={() => handleDeleteElement(selectedEl.id)}
                className="text-red-400 hover:text-red-300 transition-colors ml-auto"
                title="Remover campo"
              >
                <Trash2 size={15}/>
              </button>
              <button
                onClick={() => setSelectedElementId(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={15}/>
              </button>
            </div>
          )}

          {/* Canvas */}
          <div
            className="relative overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100 rounded-xl mx-auto shadow-inner select-none"
            style={{ width: '100%', maxWidth: `${EDITOR_WIDTH}px`, aspectRatio: `${TICKET_W_MM}/${TICKET_H_MM}` }}
            onClick={() => setSelectedElementId(null)}
          >
            {/* Background image */}
            {backgroundUrl ? (
              <img
                src={backgroundUrl}
                alt="canvas-bg"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: bgStyle.mode === 'fill' ? 'fill' : bgStyle.mode === 'cover' ? 'cover' : 'contain',
                  opacity:   bgStyle.opacity,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                <ImageIcon size={28} className="opacity-30"/>
                <span className="text-xs font-bold opacity-50">Carregue a arte do carnê</span>
              </div>
            )}

            {/* Stub divider line */}
            {hasStub && (
              <>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none z-10"
                  style={{
                    left:       `${STUB_RATIO * 100}%`,
                    borderLeft: '2px dashed rgba(100,120,220,0.65)',
                  }}
                />
                <div className="absolute top-1 left-1 text-[7px] font-bold text-blue-600/60 pointer-events-none z-10 tracking-wider uppercase">
                  Canhoto
                </div>
                <div className="absolute top-1 text-[7px] font-bold text-gray-500/60 pointer-events-none z-10 tracking-wider uppercase"
                  style={{ left: `calc(${STUB_RATIO * 100}% + 4px)` }}>
                  Principal
                </div>
              </>
            )}

            {/* Draggable elements */}
            {layoutElements.map(el => (
              <DraggableLabel
                key={el.id}
                el={el}
                isSelected={selectedElementId === el.id}
                isStub={el.id.startsWith('stub_')}
                onSelect={setSelectedElementId}
                onDragStop={handleDragStop}
              />
            ))}
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            Clique em um campo para selecionar · Arraste para reposicionar com precisão
          </p>
        </div>
      </div>

      {/* ── Saved templates grid ────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-700 flex items-center gap-2 text-base">
            <Grid size={18} className="text-orange-500"/> Modelos Salvos
          </h3>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {templates.length} modelo{templates.length !== 1 ? 's' : ''}
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="py-10 text-center text-gray-400 border-2 border-dashed rounded-xl">
            <ImageIcon size={28} className="mx-auto mb-2 opacity-30"/>
            <p className="text-sm">Nenhum modelo salvo. Crie o primeiro acima!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <div
                key={t.id}
                className={`border rounded-xl overflow-hidden hover:shadow-md transition-all ${
                  editingTemplateId === t.id
                    ? 'ring-2 ring-orange-500 border-orange-200 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                {/* Thumbnail */}
                <div className="h-20 bg-gray-100 relative overflow-hidden">
                  {t.backgroundUrl ? (
                    <img src={t.backgroundUrl} alt={t.name} className="w-full h-full object-cover opacity-80"/>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={22}/>
                    </div>
                  )}
                  {t.isDefault && (
                    <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      PADRÃO
                    </span>
                  )}
                  {editingTemplateId === t.id && (
                    <span className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      EDITANDO
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="px-3 pt-2.5 pb-1">
                  <p className="font-bold text-sm text-gray-800 truncate" title={t.name}>{t.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {t.layoutJson?.length || 0} campo{(t.layoutJson?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-1.5">
                  <button
                    onClick={() => handleEditTemplate(t)}
                    className="flex-1 py-1.5 bg-gray-100 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Edit2 size={11}/> Editar
                  </button>
                  {!t.isDefault && (
                    <button
                      onClick={() => handleSetDefault(t.id)}
                      title="Definir como padrão"
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <CheckSquare size={13}/>
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(t.id)}
                    title="Excluir"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600"/>
              </div>
              <div>
                <p className="font-bold text-gray-800">Excluir modelo?</p>
                <p className="text-xs text-gray-500 mt-0.5">Esta ação não pode ser desfeita.</p>
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
                onClick={() => handleDeleteTemplate(confirmDelete)}
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
