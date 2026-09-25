
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { Member, LetterHistory, LetterTemplate, LayoutElement } from '../types';
import { Mail, Search, X, Download, User, Check, History, Eye, FileSignature, AlertTriangle, CheckCircle, Info, Settings, Move, Image as ImageIcon, Save, Trash2, PlusCircle, Type, User as UserIcon, Calendar, Briefcase, MapPin, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import jsPDF from 'jspdf';
import { loadImageForPDF, addImageToPdf } from '../utils/pdfImageLoader';

// --- CONSTANTES EDITOR ---
const EDITOR_WIDTH          = 595;
const A4_WIDTH_MM           = 210;
const A4_HEIGHT_MM          = 297;
const EDITOR_HEIGHT         = Math.round((EDITOR_WIDTH * A4_HEIGHT_MM) / A4_WIDTH_MM); // 842px — retrato
const EDITOR_HEIGHT_LAND    = Math.round((EDITOR_WIDTH * A4_WIDTH_MM)  / A4_HEIGHT_MM); // 421px — paisagem
const CERT_TYPES            = ['BATISMO', 'APRESENTACAO'] as const;
type CertType = typeof CERT_TYPES[number];
const isCertType = (t: string): t is CertType => CERT_TYPES.includes(t as CertType);

const DEFAULT_TEXTO_ELEMENT: LayoutElement = {
    id: 'tag_texto_cadastrado',
    type: 'text',
    content: '{{texto_cadastrado}}',
    x: Math.round(EDITOR_WIDTH / 2),
    y: Math.round(EDITOR_HEIGHT / 2),
    width: EDITOR_WIDTH - 80,
    style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'justify' }
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
    const [fatherSearch, setFatherSearch] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [fatherId, setFatherId] = useState<string | undefined>(undefined);
    const [showFatherDrop, setShowFatherDrop] = useState(false);
    const [motherSearch, setMotherSearch] = useState('');
    const [motherName, setMotherName] = useState('');
    const [motherId, setMotherId] = useState<string | undefined>(undefined);
    const [showMotherDrop, setShowMotherDrop] = useState(false);

    // EDITOR STATE
    const [templates, setTemplates] = useState<LetterTemplate[]>([]);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'RECOMENDACAO' | 'MUDANCA' | 'BATISMO' | 'APRESENTACAO' | 'GENERICO'>('RECOMENDACAO');
    const [templateRecommendationText, setTemplateRecommendationText] = useState('');
    const [templateChangeText, setTemplateChangeText] = useState('');
    const [layoutElements, setLayoutElements] = useState<LayoutElement[]>([{ ...DEFAULT_TEXTO_ELEMENT }]);
    const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const recTextareaRef = useRef<HTMLTextAreaElement>(null);
    const changeTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [activeTextareaKey, setActiveTextareaKey] = useState<'recommendation' | 'change'>('recommendation');

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

    const processTextForPreview = (text: string): string => {
        if (!text.trim()) return '';
        const today = new Date();
        return text
            .replace(/{{nome_membro}}/g, 'NOME DO MEMBRO')
            .replace(/{{cpf}}/g, '000.000.000-00')
            .replace(/{{rg}}/g, '00.000.000-0')
            .replace(/{{cargo}}/g, 'MEMBRO')
            .replace(/{{data_batismo}}/g, '01/01/2000')
            .replace(/{{data_nascimento}}/g, '01/01/2000')
            .replace(/{{data_atual}}/g, today.toLocaleDateString('pt-BR'))
            .replace(/{{cidade_igreja}}/g, `Local, ${today.toLocaleDateString('pt-BR')}`)
            .replace(/{{estado_civil}}/g, 'CASADO(A)')
            .replace(/{{nome_pai}}/g, 'NOME DO PAI')
            .replace(/{{nome_mae}}/g, 'NOME DA MÃE')
            .replace(/{{naturalidade}}/g, 'CIDADE/UF')
            .replace(/{{nacionalidade}}/g, 'BRASILEIRO(A)')
            .replace(/{{nome_pastor_presidente}}/g, currentChurch?.pastorName || 'PASTOR PRESIDENTE');
    };

    const insertTagAtCursor = (tag: string) => {
        const isRec = activeTextareaKey === 'recommendation';
        const taRef = isRec ? recTextareaRef : changeTextareaRef;
        const ta = taRef.current;
        const current = isRec ? templateRecommendationText : templateChangeText;
        const setter = isRec ? setTemplateRecommendationText : setTemplateChangeText;
        if (!ta) { setter(current + tag); return; }
        const start = ta.selectionStart ?? current.length;
        const end = ta.selectionEnd ?? current.length;
        setter(current.substring(0, start) + tag + current.substring(end));
        setTimeout(() => {
            ta.focus();
            const np = start + tag.length;
            ta.selectionStart = np;
            ta.selectionEnd = np;
        }, 10);
    };

    // --- HELPER: parseia YYYY-MM-DD sem offset de fuso horário ---
    const parseLocalDate = (dateStr: string): Date => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
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
                const bgData = await loadImageForPDF(template.backgroundUrl);
                if (bgData) {
                    addImageToPdf(doc, bgData, 0, 0, pdfW_mm, pdfH_mm);
                } else {
                    showAlert("Aviso", "Não foi possível carregar o papel timbrado. Gerando apenas texto.", "warning");
                }
            }

            const scale = pdfW_mm / EDITOR_WIDTH;
            const today = new Date();
            const fullDate = `${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;

            const elementsToRender = template.layoutJson || [{ ...DEFAULT_TEXTO_ELEMENT }];
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
                            .replace(/{{rg}}/g, selectedMember.rg || '')
                            .replace(/{{cargo}}/g, roleOrFunction)
                            .replace(/{{data_batismo}}/g, selectedMember.baptismDate ? parseLocalDate(selectedMember.baptismDate).toLocaleDateString('pt-BR') : '-')
                            .replace(/{{data_nascimento}}/g, parseLocalDate(selectedMember.birthDate).toLocaleDateString('pt-BR'))
                            .replace(/{{data_atual}}/g, today.toLocaleDateString('pt-BR'))
                            .replace(/{{cidade_igreja}}/g, fullDate)
                            .replace(/{{estado_civil}}/g, selectedMember.maritalStatus || '')
                            .replace(/{{nome_pai}}/g, fatherName || '')
                            .replace(/{{nome_mae}}/g, motherName || '')
                            .replace(/{{naturalidade}}/g, selectedMember.naturalidade || '')
                            .replace(/{{nacionalidade}}/g, selectedMember.nacionalidade || 'Brasileiro(a)')
                            .replace(/{{nome_pastor_presidente}}/g, currentChurch?.pastorName || '');
                        // Margens seguras
                        const pageMargin = isCert ? 30 : 20;
                        const safeMaxW   = pdfW_mm - 2 * pageMargin;
                        const lh         = doc.getLineHeight() / doc.internal.scaleFactor;
                        // Centralização vertical real: estimar altura do bloco de texto
                        const allLinesEst: string[] = [];
                        processedText.split('\n').forEach(para => {
                            if (para.trim() === '') { allLinesEst.push(''); return; }
                            allLinesEst.push(...doc.splitTextToSize(para, safeMaxW));
                        });
                        const blockH   = allLinesEst.length * lh;
                        const textY    = Math.max(pageMargin + lh, (pdfH_mm - blockH) / 2 + lh);
                        const align    = el.style.textAlign as string;
                        if (align === 'center') {
                            const centerX = pdfW_mm / 2;
                            const lines   = doc.splitTextToSize(processedText, safeMaxW);
                            lines.forEach((line: string, i: number) => {
                                doc.text(line, centerX, textY + i * lh, { align: 'center' });
                            });
                        } else {
                            renderJustifiedText(doc, processedText, pageMargin, textY, safeMaxW, lh);
                        }
                    }
                } else {
                    let text = el.content
                        .replace('{{nome_membro}}', selectedMember.name)
                        .replace('{{cpf}}', selectedMember.cpf)
                        .replace('{{rg}}', selectedMember.rg || '')
                        .replace('{{cargo}}', roleOrFunction)
                        .replace('{{data_batismo}}', selectedMember.baptismDate ? parseLocalDate(selectedMember.baptismDate).toLocaleDateString('pt-BR') : '-')
                        .replace('{{data_nascimento}}', parseLocalDate(selectedMember.birthDate).toLocaleDateString('pt-BR'))
                        .replace('{{data_atual}}', today.toLocaleDateString('pt-BR'))
                        .replace('{{cidade_igreja}}', fullDate)
                        .replace('{{estado_civil}}', selectedMember.maritalStatus || '')
                        .replace('{{nome_pai}}', fatherName || '')
                        .replace('{{nome_mae}}', motherName || '')
                        .replace('{{naturalidade}}', selectedMember.naturalidade || '')
                        .replace('{{nacionalidade}}', selectedMember.nacionalidade || 'Brasileiro(a)')
                        .replace('{{nome_pastor_presidente}}', currentChurch?.pastorName || '');
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
            const recommendationTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, vem por meio desta, recomendar à comunhão dos santos, o(a) irmão(a) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${parseLocalDate(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? parseLocalDate(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) é ${roleOrFunction} em nossa igreja, encontrando-se em plena comunhão e paz conosco. Portanto, o(a) recomendamos para participar de todas as atividades e sacramentos, como membro do corpo de Cristo.\n\nSem mais para o momento, subscrevemo-nos.`;
            const transferTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, concede a presente CARTA DE MUDANÇA ao(à) irmão(ã) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${parseLocalDate(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? parseLocalDate(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) esteve em comunhão conosco na função de ${roleOrFunction} e, por motivo de mudança, solicitou seu desligamento de nosso rol de membros.\n\nNada temos que desabone sua conduta moral e espiritual. Portanto, o(a) recomendamos à vossa filiação.\n\nSem mais para o momento, subscrevemo-nos.`;
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
                    cpf: selectedMember.cpf,
                    rg: selectedMember.rg,
                    maritalStatus: selectedMember.maritalStatus,
                    nacionalidade: selectedMember.nacionalidade,
                    naturalidade: selectedMember.naturalidade,
                    fatherName: fatherName || '',
                    motherName: motherName || '',
                    fatherId: fatherId || undefined,
                    motherId: motherId || undefined,
                }
            } as LetterHistory);
            if (letterType === 'MUDANCA' && disableMember) {
                await updateMember(selectedMember.id, { ...selectedMember, status: 'TRANSFERIDO' });
            }
        }

        showAlert("Sucesso", "Carta gerada e registrada!", "success");
        setSelectedMember(null);
        setSearchTerm('');
        setFatherSearch('');
        setFatherName('');
        setFatherId(undefined);
        setMotherSearch('');
        setMotherName('');
        setMotherId(undefined);
    };

    // --- EDITOR LOGIC ---
    const handleNewTemplate = () => {
        setEditingTemplateId(null);
        setTemplateName('');
        setTemplateType('RECOMENDACAO' as const);
        setBackgroundUrl(undefined);
        setLayoutElements([{ ...DEFAULT_TEXTO_ELEMENT, id: `tag_texto_${Date.now()}` }]);
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
        const layout = t.layoutJson || [];
        const textoEl = layout.find(el => el.content === '{{texto_cadastrado}}');
        if (textoEl) {
            setLayoutElements([{
                ...textoEl,
                x: Math.round(EDITOR_WIDTH / 2),
                y: Math.round((isCertType(t.type) ? EDITOR_HEIGHT_LAND : EDITOR_HEIGHT) / 2),
                width: textoEl.width || (EDITOR_WIDTH - 80),
            }]);
        } else {
            setLayoutElements([{ ...DEFAULT_TEXTO_ELEMENT, id: `tag_texto_${Date.now()}` }]);
        }
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

    const updateElementStyle = (id: string, style: Partial<LayoutElement['style']>) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...style } } : el));
    };

    const updateElementWidth = (id: string, width: number) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, width } : el));
    };

    const wrapperRef = useRef<HTMLDivElement>(null);
    const fatherWrapperRef = useRef<HTMLDivElement>(null);
    const motherWrapperRef = useRef<HTMLDivElement>(null);
    const activeMembers = members.filter(m => m.churchId === currentChurch?.id && (m.status || 'ATIVO') === 'ATIVO');
    const memberSuggestions = searchTerm.length < 2 ? [] : activeMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cpf.includes(searchTerm));
    const fatherSuggestions = fatherSearch.length < 2 ? [] : activeMembers.filter(m => m.name.toLowerCase().includes(fatherSearch.toLowerCase()));
    const motherSuggestions = motherSearch.length < 2 ? [] : activeMembers.filter(m => m.name.toLowerCase().includes(motherSearch.toLowerCase()));
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

                {/* NOVO LAYOUT: painel esquerdo (tags + textareas) + canvas preview */}
                <div className="flex gap-4 items-start overflow-x-auto">

                    {/* PAINEL ESQUERDO: inserção de tags e campo de texto */}
                    <div className="w-72 shrink-0 space-y-3">

                        {/* Toolbar de inserção de tags no Texto Modelo */}
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-orange-600 uppercase mb-2 flex items-center gap-1">
                                <Type size={10}/> Inserir Tag no Texto Modelo (no cursor)
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { tag: '{{nome_membro}}', label: 'Nome' },
                                    { tag: '{{cpf}}', label: 'CPF' },
                                    { tag: '{{rg}}', label: 'RG' },
                                    { tag: '{{estado_civil}}', label: 'Est. Civil' },
                                    { tag: '{{nacionalidade}}', label: 'Nacionalidade' },
                                    { tag: '{{naturalidade}}', label: 'Naturalidade' },
                                    { tag: '{{cargo}}', label: 'Cargo' },
                                    { tag: '{{nome_pastor_presidente}}', label: 'Pastor Pres.' },
                                    { tag: '{{data_nascimento}}', label: 'Nascimento' },
                                    { tag: '{{data_batismo}}', label: 'Batismo' },
                                    { tag: '{{data_atual}}', label: 'Data Hoje' },
                                    { tag: '{{cidade_igreja}}', label: 'Cidade/Data' },
                                    { tag: '{{nome_pai}}', label: 'Nome Pai' },
                                    { tag: '{{nome_mae}}', label: 'Nome Mãe' },
                                ].map(({ tag, label }) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => insertTagAtCursor(tag)}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold border bg-white hover:bg-orange-100 hover:border-orange-400 text-orange-700 border-orange-300 transition-colors shadow-xs"
                                        title={`Inserir ${tag} no Texto Modelo`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Formatação do bloco {{texto_cadastrado}} */}
                        {(() => {
                            const textoEl = layoutElements.find(el => el.content === '{{texto_cadastrado}}');
                            if (!textoEl) return null;
                            return (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Formatação do Texto Central</p>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <select className="text-xs p-1 border rounded" value={textoEl.style.fontSize} onChange={e => updateElementStyle(textoEl.id, { fontSize: parseInt(e.target.value) })}>
                                            {[8,9,10,11,12,14,16,18,20,24].map(s => <option key={s} value={s}>{s}px</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => updateElementStyle(textoEl.id, { fontWeight: textoEl.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                            className={`p-1 border rounded text-xs font-bold w-7 h-7 flex items-center justify-center ${textoEl.style.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                                        >B</button>
                                        <div className="flex border rounded overflow-hidden">
                                            {(['left','center','right','justify'] as const).map(align => {
                                                const icons = { left: <AlignLeft size={11}/>, center: <AlignCenter size={11}/>, right: <AlignRight size={11}/>, justify: <AlignJustify size={11}/> };
                                                return (
                                                    <button key={align} type="button" onClick={() => updateElementStyle(textoEl.id, { textAlign: align })} className={`p-1 w-6 h-6 flex items-center justify-center border-r last:border-0 ${textoEl.style.textAlign === align ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}>
                                                        {icons[align]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <input type="color" className="w-7 h-7 p-0 border-0 rounded cursor-pointer" value={textoEl.style.color} onChange={e => updateElementStyle(textoEl.id, { color: e.target.value })} title="Cor"/>
                                        <div className="w-full flex items-center gap-1 mt-1">
                                            <span className="text-[9px] text-gray-500 shrink-0">Largura:</span>
                                            <input type="range" min={200} max={EDITOR_WIDTH - 40} value={textoEl.width || EDITOR_WIDTH - 80} onChange={e => updateElementWidth(textoEl.id, parseInt(e.target.value))} className="flex-1 h-1"/>
                                            <span className="text-[9px] text-gray-500 shrink-0">{textoEl.width || EDITOR_WIDTH - 80}px</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Campo "Texto Modelo" — sempre visível */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-gray-700 flex items-center text-sm">
                                <Type size={14} className="mr-1.5"/> Texto Modelo
                            </h4>
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Digite o texto da carta/certificado. Use as tags acima para inserir dados dinâmicos. O texto aparecerá <b>centralizado no centro absoluto</b> do documento.
                            </p>

                            {(templateType !== 'MUDANCA') && (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                        {templateType === 'BATISMO' ? 'Cert. Batismo' : templateType === 'APRESENTACAO' ? 'Cert. Apresentação' : templateType === 'GENERICO' ? 'Texto Principal' : 'Carta de Recomendação'}
                                        {activeTextareaKey === 'recommendation' && <span className="ml-1 text-blue-500 font-normal">← ativo</span>}
                                    </label>
                                    <textarea
                                        ref={recTextareaRef}
                                        className={`w-full h-44 p-2 border rounded text-xs resize-y transition-colors ${activeTextareaKey === 'recommendation' ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-300'}`}
                                        placeholder={templateType === 'BATISMO' ? 'Certificamos que {{nome_membro}}, nascido(a) em {{data_nascimento}}...' : templateType === 'APRESENTACAO' ? 'Apresentamos o(a) irmão(a) {{nome_membro}}...' : 'A Igreja Evangélica Assembleia de Deus...'}
                                        value={templateRecommendationText}
                                        onChange={e => setTemplateRecommendationText(e.target.value)}
                                        onFocus={() => setActiveTextareaKey('recommendation')}
                                    />
                                </div>
                            )}

                            {(templateType === 'MUDANCA' || templateType === 'GENERICO') && (
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-600 mb-1">
                                        Carta de Mudança
                                        {activeTextareaKey === 'change' && <span className="ml-1 text-blue-500 font-normal">← ativo</span>}
                                    </label>
                                    <textarea
                                        ref={changeTextareaRef}
                                        className={`w-full h-44 p-2 border rounded text-xs resize-y transition-colors ${activeTextareaKey === 'change' ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-300'}`}
                                        placeholder="A Igreja Evangélica Assembleia de Deus concede a presente carta de mudança..."
                                        value={templateChangeText}
                                        onChange={e => setTemplateChangeText(e.target.value)}
                                        onFocus={() => setActiveTextareaKey('change')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CANVAS PREVIEW — {{texto_cadastrado}} sempre centralizado no centro absoluto da folha */}
                    {(() => {
                        const isLand = isCertType(templateType);
                        const canvasH = isLand ? EDITOR_HEIGHT_LAND : EDITOR_HEIGHT;
                        const textoEl = layoutElements.find(el => el.content === '{{texto_cadastrado}}');
                        const activeText = templateType === 'MUDANCA' ? templateChangeText : templateRecommendationText;
                        const previewText = processTextForPreview(activeText);
                        const widthPx = textoEl?.width || Math.round(EDITOR_WIDTH - 80);

                        return (
                            <div className="overflow-x-auto shrink-0">
                                {/* Container da folha A4 com position: relative e dimensões exatas */}
                                <div
                                    className="relative border-2 border-gray-300 bg-white overflow-hidden shadow-2xl"
                                    style={{ width: `${EDITOR_WIDTH}px`, height: `${canvasH}px` }}
                                    onClick={() => setSelectedElementId(null)}
                                >
                                    {backgroundUrl && (
                                        <img
                                            src={backgroundUrl}
                                            alt="Papel Timbrado"
                                            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                            style={{ opacity: 0.88 }}
                                        />
                                    )}

                                    {/* BLOCO CENTRAL ABSOLUTO DA TAG {{texto_cadastrado}} (EIXO X E Y) */}
                                    {textoEl && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: `${widthPx}px`,
                                                fontSize: `${textoEl.style.fontSize}px`,
                                                color: textoEl.style.color,
                                                fontWeight: textoEl.style.fontWeight,
                                                textAlign: (textoEl.style.textAlign || 'center') as React.CSSProperties['textAlign'],
                                                lineHeight: 1.65,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                                padding: '12px 16px',
                                                border: '1.5px dashed #3b82f6',
                                                background: 'rgba(255, 255, 255, 0.82)',
                                                backdropFilter: 'blur(2px)',
                                                borderRadius: '4px',
                                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                                                maxHeight: `${canvasH - 60}px`,
                                                overflow: 'hidden',
                                                boxSizing: 'border-box',
                                                zIndex: 10,
                                            }}
                                        >
                                            {previewText || (
                                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                                                    O texto do modelo aparecerá aqui centralizado. Digite no campo "Texto Modelo" ao lado.
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 px-1.5 py-0.5 rounded shadow-sm pointer-events-none select-none">
                                        {isLand ? 'A4 Paisagem' : 'A4 Retrato'}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
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
                                        <p className="text-xs text-gray-500">Nasc: {parseLocalDate(selectedMember.birthDate).toLocaleDateString('pt-BR')} | Batismo: {selectedMember.baptismDate ? parseLocalDate(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
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

                                    {/* BUSCA NOME DO PAI e MÃE — só para Cert. Apresentação */}
                                    {letterType === 'APRESENTACAO' && (<>
                                    <div ref={fatherWrapperRef} className="relative">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Pai <span className="text-gray-400 font-normal normal-case">(opcional)</span></label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                            <input
                                                type="text"
                                                placeholder="Buscar nome do pai..."
                                                className="w-full pl-9 p-2 border rounded-lg"
                                                value={fatherSearch}
                                                onChange={e => { setFatherSearch(e.target.value); setFatherName(e.target.value); setFatherId(undefined); setShowFatherDrop(true); }}
                                                onFocus={() => setShowFatherDrop(true)}
                                                onBlur={() => setTimeout(() => setShowFatherDrop(false), 200)}
                                            />
                                            {fatherSearch && <button onClick={() => { setFatherSearch(''); setFatherName(''); setFatherId(undefined); setShowFatherDrop(false); }} className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"><X size={14}/></button>}
                                        </div>
                                        {showFatherDrop && fatherSuggestions.length > 0 && (
                                            <div className="absolute w-full bg-white shadow-lg border rounded-lg mt-1 max-h-48 overflow-y-auto z-30">
                                                {fatherSuggestions.map(m => (
                                                    <div key={m.id} onMouseDown={() => { setFatherName(m.name); setFatherSearch(m.name); setFatherId(m.id); setShowFatherDrop(false); }} className="p-2 hover:bg-purple-50 cursor-pointer border-b text-sm font-medium">{m.name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div ref={motherWrapperRef} className="relative">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Mãe <span className="text-gray-400 font-normal normal-case">(opcional)</span></label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                                            <input
                                                type="text"
                                                placeholder="Buscar nome da mãe..."
                                                className="w-full pl-9 p-2 border rounded-lg"
                                                value={motherSearch}
                                                onChange={e => { setMotherSearch(e.target.value); setMotherName(e.target.value); setMotherId(undefined); setShowMotherDrop(true); }}
                                                onFocus={() => setShowMotherDrop(true)}
                                                onBlur={() => setTimeout(() => setShowMotherDrop(false), 200)}
                                            />
                                            {motherSearch && <button onClick={() => { setMotherSearch(''); setMotherName(''); setMotherId(undefined); setShowMotherDrop(false); }} className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"><X size={14}/></button>}
                                        </div>
                                        {showMotherDrop && motherSuggestions.length > 0 && (
                                            <div className="absolute w-full bg-white shadow-lg border rounded-lg mt-1 max-h-48 overflow-y-auto z-30">
                                                {motherSuggestions.map(m => (
                                                    <div key={m.id} onMouseDown={() => { setMotherName(m.name); setMotherSearch(m.name); setMotherId(m.id); setShowMotherDrop(false); }} className="p-2 hover:bg-purple-50 cursor-pointer border-b text-sm font-medium">{m.name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    </>)}

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
