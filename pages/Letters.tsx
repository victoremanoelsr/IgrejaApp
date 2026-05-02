
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { Member, LetterHistory, LetterTemplate, LayoutElement } from '../types';
import { Mail, Search, X, Download, User, Check, History, Eye, FileSignature, AlertTriangle, CheckCircle, Info, Settings, Move, Image as ImageIcon, Save, Trash2, PlusCircle, Type, User as UserIcon, Calendar, Briefcase, MapPin, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import jsPDF from 'jspdf';
import Draggable, { DraggableData } from 'react-draggable';

// --- CONSTANTES EDITOR ---
const EDITOR_WIDTH          = 595;
const A4_WIDTH_MM           = 210;
const A4_HEIGHT_MM          = 297;
const EDITOR_HEIGHT         = Math.round((EDITOR_WIDTH * A4_HEIGHT_MM) / A4_WIDTH_MM); // 842px — retrato
const EDITOR_HEIGHT_LAND    = Math.round((EDITOR_WIDTH * A4_WIDTH_MM)  / A4_HEIGHT_MM); // 421px — paisagem
const CERT_TYPES            = ['BATISMO', 'APRESENTACAO'] as const;
type CertType = typeof CERT_TYPES[number];
const isCertType = (t: string): t is CertType => CERT_TYPES.includes(t as CertType);

const DEFAULT_TAGS: LayoutElement[] = [
    { id: 'tag_nome', type: 'tag', content: '{{nome_membro}}', x: 50, y: 100, width: 150, style: { fontSize: 12, color: '#000000', fontWeight: 'bold', textAlign: 'left' } },
    { id: 'tag_cargo', type: 'tag', content: '{{cargo}}', x: 50, y: 120, width: 150, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'left' } },
    { id: 'tag_data', type: 'tag', content: '{{data_atual}}', x: 100, y: 200, width: 300, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'center' } },
];

interface DraggableLabelProps {
  el: LayoutElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStop: (id: string, data: DraggableData) => void;
}

const DraggableLabel: React.FC<DraggableLabelProps> = ({ el, isSelected, onSelect, onDragStop }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const friendlyName: Record<string, string> = {
      '{{nome_membro}}': 'Nome Completo',
      '{{cpf}}': 'CPF',
      '{{cargo}}': 'Cargo/Função',
      '{{data_batismo}}': 'Data Batismo',
      '{{data_nascimento}}': 'Data Nasc.',
      '{{data_atual}}': 'Data de Hoje',
      '{{cidade_igreja}}': 'Cidade/Data',
      '{{estado_civil}}': 'Est. Civil',
      '{{texto_cadastrado}}': 'Texto da Carta'
  };

  const getIcon = (content: string) => {
      if (content === '{{texto_cadastrado}}') return <FileSignature size={12} className="mr-1"/>;
      if (content.includes('nome') || content.includes('cpf')) return <UserIcon size={12} className="mr-1"/>;
      if (content.includes('data')) return <Calendar size={12} className="mr-1"/>;
      if (content.includes('cargo')) return <Briefcase size={12} className="mr-1"/>;
      if (content.includes('cidade')) return <MapPin size={12} className="mr-1"/>;
      return <Type size={12} className="mr-1"/>;
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: el.x, y: el.y }}
      onStop={(e, data) => onDragStop(el.id, data)}
      bounds="parent"
    >
      <div
          ref={nodeRef}
          onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}
          className={`absolute cursor-move flex items-center px-2 py-1 rounded shadow-sm border transition-all select-none z-20
            ${isSelected
                ? 'bg-blue-600 text-white border-blue-700 shadow-xl scale-105'
                : 'bg-white/90 text-gray-800 border-gray-300 hover:bg-blue-50'
            }`}
      >
          {getIcon(el.content)}
          <div style={{ fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              {friendlyName[el.content] || el.content}
          </div>
      </div>
    </Draggable>
  );
};

export const Letters: React.FC = () => {
    const { user, currentChurch, members, lettersHistory, addLetterHistory, deleteLetterHistory, updateMember, getLetterTemplates, addLetterTemplate, updateLetterTemplate, deleteLetterTemplate, uploadBookletBackground } = useApp();

    const [activeTab, setActiveTab] = useState<'EMISSAO' | 'MODELOS'>('EMISSAO');

    // EMISSAO STATE
    const [letterType, setLetterType] = useState<'RECOMENDACAO' | 'MUDANCA' | 'BATISMO' | 'APRESENTACAO'>('RECOMENDACAO');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [roleOrFunction, setRoleOrFunction] = useState('MEMBRO');
    const [disableMember, setDisableMember] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // EDITOR STATE
    const [templates, setTemplates] = useState<LetterTemplate[]>([]);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'RECOMENDACAO' | 'MUDANCA' | 'BATISMO' | 'APRESENTACAO' | 'GENERICO'>('RECOMENDACAO');
    const [templateRecommendationText, setTemplateRecommendationText] = useState('');
    const [templateChangeText, setTemplateChangeText] = useState('');
    const [layoutElements, setLayoutElements] = useState<LayoutElement[]>(DEFAULT_TAGS);
    const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const bgInputRef = useRef<HTMLInputElement>(null);

    const [modalState, setModalState] = useState<{
        isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'success' | 'info'; showCancel: boolean; onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '', variant: 'info', showCancel: false, onConfirm: undefined });

    const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
        setModalState({ isOpen: true, title, message, variant, showCancel: false, onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
        setModalState({ isOpen: true, title, message, variant, showCancel: true, onConfirm: () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } });
    };

    useEffect(() => {
        if (currentChurch) loadTemplates();
    }, [currentChurch]);

    useEffect(() => {
        if (templates.length > 0) {
            const match = templates.find(t => t.type === letterType || t.type === 'GENERICO');
            if (match) setSelectedTemplateId(match.id);
        }
    }, [letterType, templates]);

    const loadTemplates = async () => {
        if (!currentChurch) return;
        const data = await getLetterTemplates(currentChurch.id);
        setTemplates(data);
        if (data.length > 0) {
            const match = data.find(t => t.type === letterType || t.type === 'GENERICO');
            if (match) setSelectedTemplateId(match.id);
        }
    };

    // --- HELPER: JUSTIFICAÇÃO INTELIGENTE ---
    const renderJustifiedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight?: number) => {
        const lh = lineHeight || doc.getLineHeight() / doc.internal.scaleFactor;
        const paragraphs = text.split('\n');
        let cursorY = y;
        paragraphs.forEach((para) => {
            if (para.trim() === '') { cursorY += lh; return; }
            const lines: string[] = doc.splitTextToSize(para, maxWidth);
            lines.forEach((line, lIdx) => {
                const isLastLine = lIdx === lines.length - 1;
                const isTooShort = doc.getTextWidth(line) < maxWidth * 0.85;
                if (isLastLine || isTooShort) {
                    doc.text(line, x, cursorY);
                } else {
                    doc.text(line, x, cursorY, { align: 'justify', maxWidth });
                }
                cursorY += lh;
            });
        });
        return cursorY;
    };

    // --- GERAÇÃO PDF ---
    const generatePDF = async () => {
        if (!currentChurch || !selectedMember) return;
        const isCert = isCertType(letterType);
        const orientation = isCert ? 'l' : 'p';
        const pdfW_mm = isCert ? A4_HEIGHT_MM : A4_WIDTH_MM;   // landscape: 297, portrait: 210
        const pdfH_mm = isCert ? A4_WIDTH_MM  : A4_HEIGHT_MM;  // landscape: 210, portrait: 297
        const doc = new jsPDF(orientation as any, 'mm', 'a4');
        const currentFiltered = templates.filter(t => t.churchId === currentChurch.id && (t.type === letterType || t.type === 'GENERICO'));
        const template = templates.find(t => t.id === selectedTemplateId) || (currentFiltered.length > 0 ? currentFiltered[0] : undefined);

        if (template) {
            if (template.backgroundUrl) {
                try {
                    const imgProps = await new Promise<{ data: string; w: number; h: number }>((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.src = template.backgroundUrl!;
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            canvas.getContext('2d')?.drawImage(img, 0, 0);
                            resolve({ data: canvas.toDataURL('image/jpeg'), w: img.naturalWidth, h: img.naturalHeight });
                        };
                        img.onerror = reject;
                    });
                    doc.addImage(imgProps.data, 'JPEG', 0, 0, pdfW_mm, pdfH_mm);
                } catch (e) {
                    showAlert("Aviso", "Não foi possível carregar o papel timbrado. Gerando apenas texto.", "warning");
                }
            }

            const scale = pdfW_mm / EDITOR_WIDTH;
            const today = new Date();
            const fullDate = `${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;

            const elementsToRender = template.layoutJson || DEFAULT_TAGS;
            elementsToRender.forEach(el => {
                if (el.content === '{{texto_cadastrado}}') {
                    const textContent = letterType === 'MUDANCA' ? (template.changeText || '') : (template.recommendationText || '');
                    if (textContent.trim()) {
                        doc.setTextColor(el.style.color);
                        doc.setFontSize(el.style.fontSize);
                        doc.setFont("helvetica", el.style.fontWeight === 'bold' ? 'bold' : 'normal');
                        let processedText = textContent
                            .replace(/{{nome_membro}}/g, selectedMember.name)
                            .replace(/{{cpf}}/g, selectedMember.cpf)
                            .replace(/{{cargo}}/g, roleOrFunction)
                            .replace(/{{data_batismo}}/g, selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : '-')
                            .replace(/{{data_nascimento}}/g, new Date(selectedMember.birthDate).toLocaleDateString('pt-BR'))
                            .replace(/{{data_atual}}/g, today.toLocaleDateString('pt-BR'))
                            .replace(/{{cidade_igreja}}/g, fullDate)
                            .replace(/{{estado_civil}}/g, selectedMember.maritalStatus || '');
                        renderJustifiedText(doc, processedText, 20, (el.y * scale) + (el.style.fontSize * 0.35), 170);
                    }
                } else {
                    let text = el.content
                        .replace('{{nome_membro}}', selectedMember.name)
                        .replace('{{cpf}}', selectedMember.cpf)
                        .replace('{{cargo}}', roleOrFunction)
                        .replace('{{data_batismo}}', selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : '-')
                        .replace('{{data_nascimento}}', new Date(selectedMember.birthDate).toLocaleDateString('pt-BR'))
                        .replace('{{data_atual}}', today.toLocaleDateString('pt-BR'))
                        .replace('{{cidade_igreja}}', fullDate)
                        .replace('{{estado_civil}}', selectedMember.maritalStatus || '');
                    doc.setTextColor(el.style.color);
                    doc.setFontSize(el.style.fontSize);
                    doc.setFont("helvetica", el.style.fontWeight === 'bold' ? 'bold' : 'normal');
                    const x = el.x * scale;
                    const y = el.y * scale;
                    if (el.style.textAlign === 'center') {
                        doc.text(text, x, y + (el.style.fontSize * 0.35), { align: 'center' });
                    } else if (el.style.textAlign === 'right') {
                        doc.text(text, x, y + (el.style.fontSize * 0.35), { align: 'right' });
                    } else {
                        doc.text(text, x, y + (el.style.fontSize * 0.35));
                    }
                }
            });
        } else {
            const today = new Date();
            const formattedDate = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            const recommendationTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, vem por meio desta, recomendar à comunhão dos santos, o(a) irmão(a) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${new Date(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) é ${roleOrFunction} em nossa igreja, encontrando-se em plena comunhão e paz conosco. Portanto, o(a) recomendamos para participar de todas as atividades e sacramentos, como membro do corpo de Cristo.\n\nSem mais para o momento, subscrevemo-nos.`;
            const transferTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, concede a presente CARTA DE MUDANÇA ao(à) irmão(ã) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${new Date(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) esteve em comunhão conosco na função de ${roleOrFunction} e, por motivo de mudança, solicitou seu desligamento de nosso rol de membros.\n\nNada temos que desabone sua conduta moral e espiritual. Portanto, o(a) recomendamos à vossa filiação.\n\nSem mais para o momento, subscrevemo-nos.`;
            const content = letterType === 'MUDANCA' ? transferTemplate : recommendationTemplate;
            const title = DOC_TITLES[letterType] || 'CARTA';
            if (currentChurch.logoUrl) doc.addImage(currentChurch.logoUrl, 'PNG', 15, 15, 30, 30);
            doc.setFontSize(14); doc.setFont(undefined, 'bold');
            doc.text(currentChurch.name.toUpperCase(), 105, 25, { align: 'center' });
            doc.setFontSize(10); doc.setFont(undefined, 'normal');
            doc.text(currentChurch.address, 105, 32, { align: 'center' });
            doc.text(`Pastor Presidente: ${currentChurch.pastorName}`, 105, 39, { align: 'center' });
            doc.setLineWidth(0.5); doc.line(15, 50, 195, 50);
            doc.setFontSize(16); doc.setFont(undefined, 'bold');
            doc.text(title, 105, 70, { align: 'center' });
            doc.setFontSize(12); doc.setFont(undefined, 'normal');
            renderJustifiedText(doc, content, 20, 90, 170);
            doc.text(`${currentChurch.address.split(',')[1]?.trim() || 'Local'}, ${formattedDate}.`, 105, 180, { align: 'center' });
            doc.line(65, 220, 145, 220);
            doc.text('Assinatura do Pastor', 105, 225, { align: 'center' });
            doc.setFontSize(8);
            doc.text(currentChurch.pastorName.toUpperCase(), 105, 230, { align: 'center' });
        }

        const filePrefix = (letterType === 'BATISMO' || letterType === 'APRESENTACAO') ? 'Certificado' : 'Carta';
        doc.save(`${filePrefix}_${letterType}_${selectedMember.name.replace(/\s/g, '_')}.pdf`);

        if (user) {
            await addLetterHistory({
                churchId: selectedMember.churchId,
                memberId: selectedMember.id,
                memberName: selectedMember.name,
                templateName: template ? template.name : 'Padrão (Texto)',
                letterType,
                issuedAt: new Date().toISOString(),
                generatedAt: new Date().toISOString(),
                issuedByUserId: user.id,
                memberDataSnapshot: {
                    name: selectedMember.name,
                    baptismDate: selectedMember.baptismDate,
                    birthDate: selectedMember.birthDate,
                    roleOrFunction,
                    cpf: selectedMember.cpf
                }
            } as LetterHistory);
            if (letterType === 'MUDANCA' && disableMember) {
                await updateMember(selectedMember.id, { ...selectedMember, status: 'TRANSFERIDO' });
            }
        }

        showAlert("Sucesso", "Carta gerada e registrada!", "success");
        setSelectedMember(null);
        setSearchTerm('');
    };

    // --- EDITOR LOGIC ---
    const handleNewTemplate = () => {
        setEditingTemplateId(null);
        setTemplateName('');
        setTemplateType('RECOMENDACAO' as const);
        setBackgroundUrl(undefined);
        setLayoutElements(DEFAULT_TAGS);
        setTemplateRecommendationText('');
        setTemplateChangeText('');
        setSelectedElementId(null);
    };

    const handleEditTemplate = (t: LetterTemplate) => {
        setEditingTemplateId(t.id);
        setTemplateName(t.name);
        setTemplateType(t.type);
        setTemplateRecommendationText(t.recommendationText || '');
        setTemplateChangeText(t.changeText || '');
        setBackgroundUrl(t.backgroundUrl);
        setLayoutElements(t.layoutJson || DEFAULT_TAGS);
        setSelectedElementId(null);
    };

    const handleSaveTemplate = async () => {
        if (!currentChurch || !templateName.trim()) {
            showAlert("Erro", "Defina um nome para o modelo.", "warning");
            return;
        }
        setIsSavingTemplate(true);
        const payload: LetterTemplate = {
            id: editingTemplateId || '',
            churchId: currentChurch.id,
            name: templateName,
            type: templateType,
            backgroundUrl,
            layoutJson: layoutElements,
            recommendationText: templateRecommendationText,
            changeText: templateChangeText
        };
        if (editingTemplateId) {
            await updateLetterTemplate(editingTemplateId, payload);
        } else {
            await addLetterTemplate(payload);
        }
        await loadTemplates();
        setIsSavingTemplate(false);
        showAlert("Sucesso", "Modelo salvo!", "success");
    };

    const handleDeleteTemplateHandler = (id: string) => {
        showConfirm("Excluir Modelo", "Tem certeza?", async () => {
            await deleteLetterTemplate(id);
            await loadTemplates();
            if (editingTemplateId === id) handleNewTemplate();
        }, "danger");
    };

    const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsSavingTemplate(true);
            const url = await uploadBookletBackground(e.target.files[0]);
            if (url) setBackgroundUrl(url);
            else showAlert("Erro", "Falha no upload.", "danger");
            setIsSavingTemplate(false);
            if (bgInputRef.current) bgInputRef.current.value = '';
        }
    };

    const handleAddField = (tag: string) => {
        const marginPx = 2 * (EDITOR_WIDTH / A4_WIDTH_MM);
        const contentWidth = EDITOR_WIDTH - (2 * marginPx);
        const newEl: LayoutElement = {
            id: `tag_${Date.now()}`,
            type: tag === '{{texto_cadastrado}}' ? 'text' : 'tag',
            content: tag,
            x: tag === '{{texto_cadastrado}}' ? marginPx : 50,
            y: tag === '{{texto_cadastrado}}' ? Math.round(EDITOR_HEIGHT / 2) - 50 : 50,
            width: tag === '{{texto_cadastrado}}' ? contentWidth : 150,
            style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: tag === '{{texto_cadastrado}}' ? 'center' : 'left' }
        };
        setLayoutElements(prev => [...prev, newEl]);
        setSelectedElementId(newEl.id);
    };

    const handleDragStop = (id: string, data: DraggableData) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, x: data.x, y: data.y } : el));
    };

    const updateElementStyle = (id: string, style: Partial<LayoutElement['style']>) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...style } } : el));
    };

    const updateElementWidth = (id: string, width: number) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, width } : el));
    };

    const wrapperRef = useRef<HTMLDivElement>(null);
    const activeMembers = members.filter(m => m.churchId === currentChurch?.id && (m.status || 'ATIVO') === 'ATIVO');
    const memberSuggestions = searchTerm.length < 2 ? [] : activeMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cpf.includes(searchTerm));
    const filteredTemplates = templates.filter(t => t.churchId === currentChurch?.id && (t.type === letterType || t.type === 'GENERICO'));

    const DOC_LABELS: Record<string, string> = {
        RECOMENDACAO: 'Recomendação',
        MUDANCA: 'Mudança',
        BATISMO: 'Cert. Batismo',
        APRESENTACAO: 'Cert. Apresentação',
        GENERICO: 'Genérico',
    };
    const DOC_TITLES: Record<string, string> = {
        RECOMENDACAO: 'CARTA DE RECOMENDAÇÃO',
        MUDANCA: 'CARTA DE MUDANÇA',
        BATISMO: 'CERTIFICADO DE BATISMO',
        APRESENTACAO: 'CERTIFICADO DE APRESENTAÇÃO',
    };
    const selectedElement = layoutElements.find(el => el.id === selectedElementId);

    // --- RENDERERS ---
    const renderEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow border">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700 flex items-center"><FileSignature className="mr-2"/> Editor de Modelos (Papel Timbrado)</h3>
                    <div className="flex gap-2">
                        <button onClick={handleNewTemplate} className="px-3 py-2 border rounded hover:bg-gray-50 text-sm font-bold">Novo</button>
                        <button onClick={handleSaveTemplate} disabled={isSavingTemplate} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center">
                            {isSavingTemplate ? <Settings className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16}/>} Salvar
                        </button>
                    </div>
                </div>

                {/* CONFIGURAÇÕES DO MODELO */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nome do Modelo</label>
                        <input className="w-full p-2 border rounded" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Timbrado Oficial 2024"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Carta</label>
                        <select className="w-full p-2 border rounded" value={templateType} onChange={e => setTemplateType(e.target.value as any)}>
                            <option value="RECOMENDACAO">Recomendação</option>
                            <option value="MUDANCA">Mudança</option>
                            <option value="BATISMO">Cert. Batismo</option>
                            <option value="APRESENTACAO">Cert. Apresentação</option>
                            <option value="GENERICO">Genérico</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={() => bgInputRef.current?.click()} className="w-full py-2 border border-dashed border-gray-400 text-gray-600 rounded hover:bg-gray-50 flex items-center justify-center text-sm font-bold">
                            <ImageIcon size={16} className="mr-2"/> Alterar Fundo (A4)
                        </button>
                        <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} />
                    </div>
                </div>

                {/* TOOLBAR: ADICIONAR CAMPOS */}
                <div className="flex flex-wrap gap-2 mb-2 bg-gray-50 p-2 rounded border items-center">
                    <span className="text-xs font-bold text-gray-400 mr-2">Adicionar Campos:</span>
                    {['{{nome_membro}}', '{{cpf}}', '{{cargo}}', '{{data_batismo}}', '{{data_nascimento}}', '{{data_atual}}', '{{cidade_igreja}}', '{{estado_civil}}', '{{texto_cadastrado}}'].map(tag => (
                        <button key={tag} onClick={() => handleAddField(tag)} className={`bg-white border px-2 py-1 rounded text-xs font-bold shadow-sm ${tag === '{{texto_cadastrado}}' ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'hover:bg-blue-50 text-blue-700'}`}>
                            {tag.replace(/{{|}}/g, '')}
                        </button>
                    ))}
                    {selectedElementId && (
                        <button onClick={() => { setLayoutElements(prev => prev.filter(e => e.id !== selectedElementId)); setSelectedElementId(null); }} className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded" title="Remover campo selecionado">
                            <Trash2 size={16}/>
                        </button>
                    )}
                </div>

                {/* TOOLBAR: FORMATAÇÃO DO CAMPO SELECIONADO */}
                {selectedElement && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 bg-blue-50 p-2 rounded border border-blue-100">
                        <span className="text-[10px] font-bold text-blue-500 uppercase mr-1">Formatar:</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Largura:</span>
                            <input
                                type="number"
                                className="text-xs p-1 border rounded w-16"
                                value={selectedElement.width || 0}
                                onChange={e => updateElementWidth(selectedElement.id, parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <select
                            className="text-xs p-1 border rounded"
                            value={selectedElement.style.fontSize}
                            onChange={e => updateElementStyle(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map(s => <option key={s} value={s}>{s}px</option>)}
                        </select>
                        <button
                            onClick={() => updateElementStyle(selectedElement.id, { fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                            className={`p-1 border rounded text-xs font-bold w-7 h-7 flex items-center justify-center ${selectedElement.style.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                            title="Negrito"
                        >B</button>
                        <div className="flex border rounded overflow-hidden">
                            {([
                                { value: 'left', icon: <AlignLeft size={14}/>, title: 'Esquerda' },
                                { value: 'center', icon: <AlignCenter size={14}/>, title: 'Centralizado' },
                                { value: 'right', icon: <AlignRight size={14}/>, title: 'Direita' },
                                { value: 'justify', icon: <AlignJustify size={14}/>, title: 'Justificado' },
                            ] as const).map(({ value, icon, title }) => (
                                <button
                                    key={value}
                                    onClick={() => updateElementStyle(selectedElement.id, { textAlign: value })}
                                    className={`p-1 w-7 h-7 flex items-center justify-center border-r last:border-0 ${selectedElement.style.textAlign === value ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
                                    title={title}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                        <input
                            type="color"
                            className="w-7 h-7 p-0 border-0 rounded cursor-pointer"
                            value={selectedElement.style.color}
                            onChange={e => updateElementStyle(selectedElement.id, { color: e.target.value })}
                            title="Cor do texto"
                        />
                    </div>
                )}

                {/* CANVAS A4 */}
                {(() => {
                    const isLand = isCertType(templateType);
                    const canvasH = isLand ? EDITOR_HEIGHT_LAND : EDITOR_HEIGHT;
                    return (
                        <div
                            className="relative border-2 border-gray-300 bg-white overflow-hidden mx-auto shadow-2xl"
                            style={{ width: `${EDITOR_WIDTH}px`, height: `${canvasH}px` }}
                            onClick={() => setSelectedElementId(null)}
                        >
                            {backgroundUrl && (
                                <img src={backgroundUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none" style={{ opacity: 0.85 }} />
                            )}
                            {layoutElements.map(el => (
                                <DraggableLabel key={el.id} el={el} isSelected={selectedElementId === el.id} onSelect={setSelectedElementId} onDragStop={handleDragStop} />
                            ))}
                            <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 px-1 rounded pointer-events-none select-none">
                                {isLand ? 'A4 Paisagem' : 'A4 Retrato'}
                            </div>
                        </div>
                    );
                })()}

                {/* TEXTOS DO MODELO */}
                <div className="mt-6 bg-gray-50 p-4 border rounded-lg space-y-4">
                    <div>
                        <h4 className="font-bold text-gray-700 flex items-center mb-1"><Type size={16} className="mr-2"/> Texto do Modelo</h4>
                        <p className="text-xs text-gray-500">Este texto aparece onde a tag <b>{'{{texto_cadastrado}}'}</b> for posicionada. Use as tags como <b>{'{{nome_membro}}'}</b>, <b>{'{{data_batismo}}'}</b> etc. dentro do texto.</p>
                    </div>
                    {/* Texto principal — para todos os tipos exceto MUDANCA puro */}
                    {(templateType !== 'MUDANCA') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">
                                {templateType === 'BATISMO' ? 'Texto do Certificado de Batismo' :
                                 templateType === 'APRESENTACAO' ? 'Texto do Certificado de Apresentação' :
                                 templateType === 'GENERICO' ? 'Texto Principal (Recomendação / Batismo / Apresentação)' :
                                 'Texto da Carta de Recomendação'}
                            </label>
                            <textarea
                                className="w-full h-40 p-3 border rounded text-sm resize-y"
                                placeholder={
                                    templateType === 'BATISMO' ? 'Certificamos que {{nome_membro}}, nascido(a) em {{data_nascimento}}, foi batizado(a) nas águas...' :
                                    templateType === 'APRESENTACAO' ? 'Apresentamos o(a) irmão(a) {{nome_membro}}, portador(a) do CPF {{cpf}}...' :
                                    'A Igreja Evangélica Assembleia de Deus...'
                                }
                                value={templateRecommendationText}
                                onChange={e => setTemplateRecommendationText(e.target.value)}
                            />
                        </div>
                    )}
                    {/* Texto de Mudança — só aparece quando tipo é MUDANCA ou GENERICO */}
                    {(templateType === 'MUDANCA' || templateType === 'GENERICO') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-2">Texto da Carta de Mudança</label>
                            <textarea
                                className="w-full h-40 p-3 border rounded text-sm resize-y"
                                placeholder="A Igreja Evangélica Assembleia de Deus concede a presente carta de mudança..."
                                value={templateChangeText}
                                onChange={e => setTemplateChangeText(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* LISTA DE MODELOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.filter(t => t.churchId === currentChurch?.id).map(t => (
                    <div key={t.id} className={`p-4 border rounded-lg bg-white shadow-sm flex flex-col hover:border-blue-300 transition-colors ${editingTemplateId === t.id ? 'ring-2 ring-blue-500' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-800 truncate pr-2">{t.name}</h4>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">{t.type}</span>
                        </div>
                        <div className="mt-auto flex gap-2 pt-2">
                            <button onClick={() => handleEditTemplate(t)} className="flex-1 py-1.5 bg-gray-50 border rounded text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors">Editar Modelo</button>
                            <button onClick={() => handleDeleteTemplateHandler(t.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
                {templates.filter(t => t.churchId === currentChurch?.id).length === 0 && (
                    <div className="col-span-full py-8 text-center text-gray-400 border-2 border-dashed rounded-lg">
                        Nenhum modelo personalizado encontrado para esta igreja.
                    </div>
                )}
            </div>
        </div>
    );

    const renderEmission = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { key: 'RECOMENDACAO', label: 'Recomendação' },
                                    { key: 'MUDANCA',      label: 'Mudança' },
                                    { key: 'BATISMO',      label: 'Cert. Batismo' },
                                    { key: 'APRESENTACAO', label: 'Cert. Apresentação' },
                                ] as const).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setLetterType(key)}
                                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${letterType === key ? 'bg-brand-black text-white border-brand-black' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div ref={wrapperRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Membro</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Nome ou CPF..."
                                    className="w-full pl-10 p-2.5 border rounded-lg"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setSelectedMember(null); }}
                                    onFocus={() => wrapperRef.current && (wrapperRef.current.style.zIndex = '20')}
                                />
                                {searchTerm && <button onClick={() => { setSelectedMember(null); setSearchTerm(''); }} className="absolute right-3 top-3 text-gray-400 hover:text-red-500"><X size={18}/></button>}
                            </div>
                            {searchTerm && !selectedMember && memberSuggestions.length > 0 && (
                                <div className="absolute w-full md:w-80 bg-white shadow-lg border rounded-lg mt-1 max-h-60 overflow-y-auto z-20">
                                    {memberSuggestions.map(m => (
                                        <div key={m.id} onClick={() => { setSelectedMember(m); setSearchTerm(m.name); }} className="p-3 hover:bg-gray-50 cursor-pointer border-b">
                                            <p className="font-bold text-sm">{m.name}</p>
                                            <p className="text-xs text-gray-500">{m.cpf}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col justify-between min-h-[200px]">
                        {selectedMember ? (
                            <div className="animate-fade-in">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 flex items-center"><User className="mr-2"/> {selectedMember.name}</h3>
                                        <p className="text-xs text-gray-500">Nasc: {new Date(selectedMember.birthDate).toLocaleDateString('pt-BR')} | Batismo: {selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                    </div>
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full"><Check className="inline-block mr-1" size={12}/> Selecionado</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo/Função</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg uppercase"
                                            value={roleOrFunction}
                                            onChange={e => setRoleOrFunction(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modelo de Impressão</label>
                                        <select
                                            className="w-full p-2 border rounded-lg bg-white"
                                            value={selectedTemplateId}
                                            onChange={e => setSelectedTemplateId(e.target.value)}
                                        >
                                            {filteredTemplates.length === 0 && (
                                                <option value="">Nenhum modelo cadastrado</option>
                                            )}
                                            {filteredTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        {filteredTemplates.length === 0 && (
                                            <p className="text-[10px] text-orange-600 mt-1 font-medium italic">Cadastre um modelo em "Modelos / Timbrado".</p>
                                        )}
                                    </div>
                                    {letterType === 'MUDANCA' && (
                                        <div className="md:col-span-2 flex items-center p-2 border rounded-lg bg-white cursor-pointer hover:bg-yellow-50">
                                            <input type="checkbox" checked={disableMember} onChange={e => setDisableMember(e.target.checked)} className="h-4 w-4 text-brand-orange"/>
                                            <span className="ml-2 text-xs font-bold text-gray-700">Desativar membro do sistema após emissão</span>
                                        </div>
                                    )}
                                </div>
                                <button onClick={generatePDF} className="w-full bg-brand-orange text-white py-3 rounded-lg font-bold flex items-center justify-center hover:bg-brand-red shadow-lg transition-transform hover:scale-105">
                                    <Download className="mr-2"/> Gerar Carta PDF
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 m-auto flex flex-col items-center">
                                <Search size={48} className="mb-2 opacity-20"/>
                                <p>Selecione um membro para habilitar a geração</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* HISTÓRICO */}
            <div className="bg-white p-6 rounded-xl shadow-lg border">
                <h3 className="font-bold text-lg mb-4 flex items-center"><History className="mr-2"/> Histórico de Cartas Emitidas</h3>
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left">Membro</th>
                                <th className="px-4 py-2 text-left">Tipo de Carta</th>
                                <th className="px-4 py-2 text-left">Data de Geração</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {lettersHistory
                                .filter(h => h.churchId === currentChurch?.id)
                                .sort((a, b) => new Date(b.generatedAt || b.issuedAt).getTime() - new Date(a.generatedAt || a.issuedAt).getTime())
                                .map(h => (
                                <tr key={h.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium">
                                        {h.memberName || h.memberDataSnapshot?.name || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                        <span className={`px-2 py-1 rounded text-xs border font-bold ${
                                            h.letterType === 'RECOMENDACAO' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            h.letterType === 'MUDANCA'      ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                            h.letterType === 'BATISMO'      ? 'bg-green-50 text-green-700 border-green-200' :
                                                                              'bg-purple-50 text-purple-700 border-purple-200'
                                        }`}>
                                            {DOC_LABELS[h.letterType] || h.letterType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600 text-sm">
                                        {new Date(h.generatedAt || h.issuedAt).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedMember({ name: h.memberDataSnapshot.name, cpf: h.memberDataSnapshot.cpf, birthDate: h.memberDataSnapshot.birthDate || '', baptismDate: h.memberDataSnapshot.baptismDate } as Member);
                                                    setRoleOrFunction(h.memberDataSnapshot.roleOrFunction);
                                                    setLetterType(h.letterType as any);
                                                    showAlert("Pronto para Reemissão", "Os dados foram carregados. Clique em 'Gerar Carta PDF' para reimprimir.", "info");
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="text-gray-500 hover:text-brand-orange p-1 flex items-center"
                                                title="Reemitir carta"
                                            >
                                                <Eye size={16} className="mr-1"/> Reemitir
                                            </button>
                                            <button
                                                onClick={() => showConfirm("Excluir Registro", "Tem certeza que deseja excluir este registro do histórico?", async () => { await deleteLetterHistory(h.id); }, "danger")}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Excluir registro"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {lettersHistory.filter(h => h.churchId === currentChurch?.id).length === 0 && (
                                <tr><td colSpan={4} className="text-center py-6 text-gray-400">Nenhum registro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                        <Mail className="mr-3 text-brand-orange"/> Emissão de Documentos
                    </h1>
                    <p className="text-gray-500 mt-1">Emissão de documentos oficiais e gestão de modelos.</p>
                </div>
                <div className="bg-gray-100 p-1 rounded-lg flex">
                    <button onClick={() => setActiveTab('EMISSAO')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'EMISSAO' ? 'bg-white shadow text-brand-black' : 'text-gray-500 hover:text-gray-800'}`}>Emitir Carta</button>
                    <button onClick={() => setActiveTab('MODELOS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${activeTab === 'MODELOS' ? 'bg-white shadow text-brand-black' : 'text-gray-500 hover:text-gray-800'}`}>
                        <Settings size={14} className="mr-1"/> Modelos / Timbrado
                    </button>
                </div>
            </div>

            {activeTab === 'EMISSAO' ? renderEmission() : renderEditor()}

            {modalState.isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className={`h-2 ${modalState.variant === 'danger' ? 'bg-red-500' : modalState.variant === 'warning' ? 'bg-yellow-500' : modalState.variant === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <div className={`p-3 rounded-full mr-4 ${modalState.variant === 'danger' ? 'bg-red-100 text-red-500' : modalState.variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : modalState.variant === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {modalState.variant === 'danger' && <AlertTriangle size={24}/>}
                                    {modalState.variant === 'warning' && <AlertTriangle size={24}/>}
                                    {modalState.variant === 'success' && <CheckCircle size={24}/>}
                                    {modalState.variant === 'info' && <Info size={24}/>}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{modalState.title}</h3>
                            </div>
                            <p className="text-gray-600 mb-6 text-sm leading-relaxed">{modalState.message}</p>
                            <div className="flex justify-end space-x-3">
                                {modalState.showCancel && <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancelar</button>}
                                <button onClick={() => { if (modalState.onConfirm) modalState.onConfirm(); else setModalState(prev => ({ ...prev, isOpen: false })); }} className={`px-6 py-2 rounded-lg text-white font-bold shadow-md ${modalState.variant === 'danger' ? 'bg-red-600' : 'bg-blue-600'}`}>{modalState.showCancel ? 'Confirmar' : 'OK'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
