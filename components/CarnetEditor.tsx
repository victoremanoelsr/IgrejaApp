import React, { useState, useRef } from 'react';
import {
  Upload, Save, RefreshCw, Loader, Trash2, Edit2, CheckSquare,
  Image as ImageIcon, CheckCircle, X, LayoutTemplate, Printer,
  AlertTriangle, ArrowRight,
} from 'lucide-react';
import { useApp } from '../context';
import { LayoutElement, CarnetTemplate } from '../types';
import { loadImageForPDF } from '../utils/pdfImageLoader';
import jsPDF from 'jspdf';

// ─── Constants ───────────────────────────────────────────────────────────────
const EDITOR_WIDTH  = 794;
const TICKET_H_MM   = 70;
const TICKET_W_MM   = 210;
const EDITOR_HEIGHT = (EDITOR_WIDTH * TICKET_H_MM) / TICKET_W_MM;

// Fixed default field positions (editor coordinate space)
const DEFAULT_LAYOUT: LayoutElement[] = [
  { id: 'field_nome',    type: 'tag', content: '{{nome_membro}}', x: 28,  y: 38,  style: { fontSize: 13, color: '#000000', fontWeight: 'bold',   textAlign: 'left' } },
  { id: 'field_valor',   type: 'tag', content: '{{valor}}',       x: 540, y: 38,  style: { fontSize: 14, color: '#000000', fontWeight: 'bold',   textAlign: 'left' } },
  { id: 'field_mes',     type: 'tag', content: '{{mes_extenso}}', x: 28,  y: 175, style: { fontSize: 11, color: '#333333', fontWeight: 'normal', textAlign: 'left' } },
  { id: 'field_ano',     type: 'tag', content: '{{ano}}',         x: 210, y: 175, style: { fontSize: 11, color: '#333333', fontWeight: 'normal', textAlign: 'left' } },
  { id: 'field_parcela', type: 'tag', content: '{{n_parcela}}',   x: 540, y: 175, style: { fontSize: 11, color: '#333333', fontWeight: 'normal', textAlign: 'left' } },
];

// Dummy data shown in the live preview
const DUMMY: Record<string, string> = {
  '{{nome_membro}}': 'JOÃO DA SILVA',
  '{{valor}}':       'R$ 50,00',
  '{{mes_extenso}}': 'MARÇO',
  '{{ano}}':         String(new Date().getFullYear()),
  '{{n_parcela}}':   '3/12',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pct = (val: number, total: number) => `${((val / total) * 100).toFixed(3)}%`;

// ─── Props ───────────────────────────────────────────────────────────────────
export interface CarnetEditorProps {
  category: 'JOVENS' | 'MISSOES';
  templates: CarnetTemplate[];
  onTemplatesChanged: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
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

  const accent        = category === 'JOVENS' ? 'orange' : 'teal';
  const accentBtnCls  = accent === 'orange'
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-teal-600 hover:bg-teal-700 text-white';

  // ── State ──────────────────────────────────────────────────────────────────
  const [templateName,      setTemplateName]      = useState('');
  const [backgroundUrl,     setBackgroundUrl]     = useState<string | undefined>();
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isSaving,          setIsSaving]          = useState(false);
  const [isUploading,       setIsUploading]        = useState(false);
  const [confirmDelete,     setConfirmDelete]     = useState<string | null>(null);
  const [feedback,          setFeedback]          = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const showFeedback = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const url = await uploadBookletBackground(file);
    if (url) { setBackgroundUrl(url); showFeedback('Arte carregada com sucesso!'); }
    else       { showFeedback('Erro ao carregar a imagem.', 'error'); }
    setIsUploading(false);
    if (bgInputRef.current) bgInputRef.current.value = '';
  };

  // ── Template CRUD ─────────────────────────────────────────────────────────
  const handleNew = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setBackgroundUrl(undefined);
  };

  const handleEdit = (t: CarnetTemplate) => {
    setEditingTemplateId(t.id);
    setTemplateName(t.name);
    setBackgroundUrl(t.backgroundUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!currentChurch)         return;
    if (!templateName.trim())   { showFeedback('Digite um nome para o modelo.', 'error'); return; }
    if (!backgroundUrl)         { showFeedback('Carregue a arte do carnê antes de salvar.', 'error'); return; }

    setIsSaving(true);
    if (editingTemplateId) {
      await updateCarnetTemplate(editingTemplateId, {
        name: templateName, backgroundUrl,
        backgroundStyle: { mode: 'fill', opacity: 1.0 },
        layoutJson: DEFAULT_LAYOUT, category,
      });
      showFeedback('Modelo atualizado!');
    } else {
      await addCarnetTemplate({
        id: '', churchId: currentChurch.id, name: templateName,
        backgroundUrl,
        backgroundStyle: { mode: 'fill', opacity: 1.0 },
        layoutJson: DEFAULT_LAYOUT,
        isDefault: templates.length === 0, category,
      });
      showFeedback('Modelo salvo com sucesso!');
      handleNew();
    }
    setIsSaving(false);
    onTemplatesChanged();
  };

  const handleDelete = async (id: string) => {
    await deleteCarnetTemplate(id);
    if (editingTemplateId === id) handleNew();
    showFeedback('Modelo excluído.', 'info');
    setConfirmDelete(null);
    onTemplatesChanged();
  };

  const handleSetDefault = async (id: string) => {
    if (!currentChurch) return;
    await setDefaultTemplate(id, currentChurch.id, category);
    showFeedback('Definido como padrão!');
    onTemplatesChanged();
  };

  // ── Test print ────────────────────────────────────────────────────────────
  const handleTestPrint = async () => {
    if (!backgroundUrl) { showFeedback('Carregue uma arte antes de testar.', 'error'); return; }
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [TICKET_H_MM, TICKET_W_MM] });
    const scale = TICKET_W_MM / EDITOR_WIDTH;
    const bgData = await loadImageForPDF(backgroundUrl);
    if (bgData) doc.addImage(bgData, 'JPEG', 0, 0, TICKET_W_MM, TICKET_H_MM);
    DEFAULT_LAYOUT.forEach(el => {
      const text = DUMMY[el.content] || el.content;
      doc.setTextColor(el.style.color);
      doc.setFontSize(el.style.fontSize);
      doc.setFont('helvetica', el.style.fontWeight === 'bold' ? 'bold' : 'normal');
      doc.text(text, el.x * scale, el.y * scale + el.style.fontSize * 0.35);
    });
    doc.setDrawColor(200, 200, 200);
    doc.rect(0, 0, TICKET_W_MM, TICKET_H_MM);
    window.open(doc.output('bloburl'), '_blank');
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toast */}
      {feedback && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2.5 transition-all ${
          feedback.type === 'success' ? 'bg-green-600' : feedback.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <LayoutTemplate size={22} className={accent === 'orange' ? 'text-orange-500' : 'text-teal-600'}/>
            Modelo do Carnê
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Carregue sua arte e salve o modelo para emissão</p>
        </div>
        {editingTemplateId && (
          <button onClick={handleNew}
            className="text-xs font-bold text-gray-500 hover:text-gray-700 flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
            <RefreshCw size={12}/> Novo modelo
          </button>
        )}
      </div>

      {/* Main editor: two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* LEFT — controls */}
        <div className="xl:col-span-4 2xl:col-span-3 bg-gray-900 rounded-2xl p-6 text-white shadow-2xl flex flex-col gap-5">

          {/* Step 1: name */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${accent === 'orange' ? 'bg-orange-500' : 'bg-teal-500'}`}>1</span>
              Nome do Modelo
            </p>
            <input
              type="text"
              placeholder="Ex: Carnê Padrão 2026"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm font-bold border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Step 2: upload */}
          <div className="border-t border-gray-800 pt-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${accent === 'orange' ? 'bg-orange-500' : 'bg-teal-500'}`}>2</span>
              Arte do Carnê
            </p>

            {backgroundUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-700 group">
                <img src={backgroundUrl} alt="arte" className="w-full h-20 object-cover opacity-80"/>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={() => bgInputRef.current?.click()}
                    className="bg-white/90 text-gray-800 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-white transition-colors">
                    <Upload size={12}/> Trocar
                  </button>
                  <button onClick={() => setBackgroundUrl(undefined)}
                    className="bg-red-500/90 text-white rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 hover:bg-red-500 transition-colors">
                    <X size={12}/> Remover
                  </button>
                </div>
                <span className="absolute bottom-1.5 left-1.5 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={8}/> Carregada
                </span>
              </div>
            ) : (
              <button onClick={() => bgInputRef.current?.click()} disabled={isUploading}
                className="w-full border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl py-7 flex flex-col items-center gap-2 text-gray-500 hover:text-gray-300 transition-all disabled:opacity-50">
                {isUploading
                  ? <><Loader size={20} className="animate-spin text-orange-400"/><span className="text-xs font-bold">Carregando...</span></>
                  : <><Upload size={20}/><span className="text-xs font-bold">Clique para carregar</span><span className="text-[10px] text-gray-600">PNG, JPG, JPEG</span></>
                }
              </button>
            )}
            <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>
          </div>

          {/* Info box */}
          <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Os dados do membro <span className="text-gray-300 font-bold">(nome, valor, mês)</span> são posicionados automaticamente sobre a arte e substituídos na hora da impressão.
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-800 pt-4 space-y-2 mt-auto">
            <button onClick={handleTestPrint} disabled={!backgroundUrl}
              className="w-full py-2.5 rounded-xl text-xs font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Printer size={13}/> Testar Impressão
            </button>
            <button onClick={handleSave} disabled={isSaving || isUploading}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${accentBtnCls}`}>
              {isSaving ? <Loader size={15} className="animate-spin"/> : <Save size={15}/>}
              {editingTemplateId ? 'Salvar Alterações' : 'Salvar Modelo'}
            </button>
          </div>
        </div>

        {/* RIGHT — live preview */}
        <div className="xl:col-span-8 2xl:col-span-9 flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-5 shadow border border-gray-100 flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white ${accent === 'orange' ? 'bg-orange-500' : 'bg-teal-500'}`}>3</span>
                Prévia do Carnê
              </p>
              <span className="text-[10px] text-gray-400 bg-gray-50 border px-2 py-1 rounded-full font-medium">
                210 × 70 mm — dados de exemplo
              </span>
            </div>

            {/* Canvas */}
            <div
              className="relative w-full rounded-xl overflow-hidden shadow-lg border border-gray-200"
              style={{ aspectRatio: `${TICKET_W_MM}/${TICKET_H_MM}` }}
            >
              {/* Background */}
              {backgroundUrl ? (
                <img src={backgroundUrl} alt="prévia" className="absolute inset-0 w-full h-full object-fill"/>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 gap-2">
                  <ImageIcon size={32} className="text-gray-300"/>
                  <p className="text-xs font-bold text-gray-400">Carregue a arte do carnê para ver a prévia</p>
                  <button onClick={() => bgInputRef.current?.click()}
                    className={`mt-2 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${accentBtnCls}`}>
                    <Upload size={12}/> Carregar Arte
                    <ArrowRight size={12}/>
                  </button>
                </div>
              )}

              {/* Fixed field overlays (shown only when bg is loaded) */}
              {backgroundUrl && DEFAULT_LAYOUT.map(el => (
                <div
                  key={el.id}
                  className="absolute pointer-events-none"
                  style={{
                    left:       pct(el.x, EDITOR_WIDTH),
                    top:        pct(el.y, EDITOR_HEIGHT),
                    fontSize:   `${(el.style.fontSize / EDITOR_HEIGHT) * 100}cqh`,
                    color:      el.style.color,
                    fontWeight: el.style.fontWeight,
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 4px rgba(255,255,255,0.85)',
                    lineHeight: 1.2,
                  }}
                >
                  {DUMMY[el.content] || el.content}
                </div>
              ))}
            </div>

            {backgroundUrl && (
              <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
                Os dados reais do membro substituem os exemplos na hora da impressão
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Saved templates grid */}
      <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-700 flex items-center gap-2 text-base">
            <LayoutTemplate size={18} className={accent === 'orange' ? 'text-orange-500' : 'text-teal-600'}/>
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
            <p className="text-xs text-gray-300 mt-1">Carregue uma arte e salve seu primeiro modelo</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map(t => (
              <div key={t.id} className={`border rounded-2xl overflow-hidden hover:shadow-md transition-all ${
                editingTemplateId === t.id
                  ? `ring-2 ${accent === 'orange' ? 'ring-orange-400 border-orange-200' : 'ring-teal-400 border-teal-200'} shadow-md`
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                {/* Thumbnail */}
                <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: `${TICKET_W_MM}/${TICKET_H_MM}` }}>
                  {t.backgroundUrl
                    ? <img src={t.backgroundUrl} alt={t.name} className="w-full h-full object-fill"/>
                    : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={20}/></div>
                  }
                  {t.isDefault && (
                    <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      PADRÃO
                    </span>
                  )}
                  {editingTemplateId === t.id && (
                    <span className={`absolute top-1.5 right-1.5 text-white text-[8px] font-bold px-2 py-0.5 rounded-full shadow-sm ${accent === 'orange' ? 'bg-orange-500' : 'bg-teal-500'}`}>
                      EDITANDO
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-bold text-sm text-gray-800 truncate" title={t.name}>{t.name}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {t.layoutJson?.length || 0} campo{(t.layoutJson?.length || 0) !== 1 ? 's' : ''} automáticos
                  </p>
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-1.5">
                  <button onClick={() => handleEdit(t)}
                    className="flex-1 py-2 bg-gray-50 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border border-gray-200 hover:border-orange-200 transition-all">
                    <Edit2 size={11}/> Editar
                  </button>
                  {!t.isDefault && (
                    <button onClick={() => handleSetDefault(t.id)} title="Definir como padrão"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-gray-200 hover:border-green-200">
                      <CheckSquare size={13}/>
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(t.id)} title="Excluir"
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-gray-200 hover:border-red-200">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
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
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors">
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
