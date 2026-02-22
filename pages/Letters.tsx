
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { Member, LetterHistory, LetterTemplate, LayoutElement } from '../types';
import { Mail, Search, X, Download, User, Check, History, Eye, FileSignature, AlertTriangle, CheckCircle, Info, Settings, Move, Image as ImageIcon, Save, Trash2, PlusCircle, Type, User as UserIcon, Calendar, Briefcase, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import Draggable, { DraggableData } from 'react-draggable';

// --- CONSTANTES EDITOR ---
// A4 @ 96 DPI: ~794px width. A4 Ratio: 1.414 (297/210)
const EDITOR_WIDTH = 595; // px (Reduced for screen fit, will scale)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const EDITOR_HEIGHT = (EDITOR_WIDTH * A4_HEIGHT_MM) / A4_WIDTH_MM;

const DEFAULT_TAGS: LayoutElement[] = [
    { id: 'tag_nome', type: 'tag', content: '{{nome_membro}}', x: 50, y: 100, style: { fontSize: 12, color: '#000000', fontWeight: 'bold', textAlign: 'left' } },
    { id: 'tag_cargo', type: 'tag', content: '{{cargo}}', x: 50, y: 120, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'left' } },
    { id: 'tag_data', type: 'tag', content: '{{data_atual}}', x: 100, y: 200, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'center' } },
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
      '{{estado_civil}}': 'Est. Civil'
  };

  const getIcon = (content: string) => {
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
          className={`absolute cursor-move flex items-center px-2 py-1 rounded shadow-sm border transition-all select-none group z-20
            ${isSelected 
                ? 'bg-blue-600 text-white border-blue-700 shadow-xl scale-105' 
                : 'bg-white/90 text-gray-800 border-gray-300 hover:bg-blue-50'
            }`}
      >
          {getIcon(el.content)}
          <div style={{
              fontSize: '10px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
          }}>
              {friendlyName[el.content] || el.content}
          </div>
      </div>
    </Draggable>
  );
};

export const Letters: React.FC = () => {
    const { user, currentChurch, members, lettersHistory, addLetterHistory, updateMember, getLetterTemplates, addLetterTemplate, updateLetterTemplate, deleteLetterTemplate, uploadBookletBackground } = useApp();
    
    const [activeTab, setActiveTab] = useState<'EMISSAO' | 'MODELOS'>('EMISSAO');

    // EMISSAO STATE
    const [letterType, setLetterType] = useState<'RECOMENDACAO' | 'MUDANCA'>('RECOMENDACAO');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [roleOrFunction, setRoleOrFunction] = useState('MEMBRO');
    const [disableMember, setDisableMember] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(''); // Vazio = Padrão (Texto)

    // EDITOR STATE
    const [templates, setTemplates] = useState<LetterTemplate[]>([]);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'RECOMENDACAO' | 'MUDANCA' | 'GENERICO'>('RECOMENDACAO');
    const [recommendationText, setRecommendationText] = useState('');
    const [changeText, setChangeText] = useState('');
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

    const loadTemplates = async () => {
        if (!currentChurch) return;
        const data = await getLetterTemplates(currentChurch.id);
        setTemplates(data);
    };

    // --- LOGICA DE GERAÇÃO (PDF) ---
    const generatePDF = async () => {
        if (!currentChurch || !selectedMember) return;

        const doc = new jsPDF('p', 'mm', 'a4');
        const template = templates.find(t => t.id === selectedTemplateId);

        // SE TIVER MODELO VISUAL SELECIONADO
        if (template) {
            // 1. Background Image (Papel Timbrado)
            if (template.backgroundUrl) {
                try {
                    const imgProps = await new Promise<{data: string, w: number, h: number}>((resolve, reject) => {
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
                    doc.addImage(imgProps.data, 'JPEG', 0, 0, 210, 297);
                } catch (e) {
                    console.error("Erro ao carregar background", e);
                    showAlert("Aviso", "Não foi possível carregar o papel timbrado. Gerando apenas texto.", "warning");
                }
            }

            // 2. Overlay Data
            const scale = 210 / EDITOR_WIDTH;
            const today = new Date();
            const fullDate = `${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;

            template.layoutJson.forEach(el => {
                let text = el.content;
                
                // Se for um campo de texto fixo (type: 'text'), usamos o conteúdo dele
                // Mas aqui a lógica original parece tratar tudo como tag se tiver {{}}
                
                text = text.replace('{{nome_membro}}', selectedMember.name);
                text = text.replace('{{cpf}}', selectedMember.cpf);
                text = text.replace('{{cargo}}', roleOrFunction);
                text = text.replace('{{data_batismo}}', selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : '-');
                text = text.replace('{{data_nascimento}}', new Date(selectedMember.birthDate).toLocaleDateString('pt-BR'));
                text = text.replace('{{data_atual}}', today.toLocaleDateString('pt-BR'));
                text = text.replace('{{cidade_igreja}}', fullDate);
                text = text.replace('{{estado_civil}}', selectedMember.maritalStatus || '');
                
                // NOVO: Tags para o texto cadastrado
                const cadastrado = letterType === 'RECOMENDACAO' ? template.recommendationText : template.changeText;
                if (cadastrado) {
                    text = text.replace('{{texto_cadastrado}}', cadastrado);
                }

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
            });

        } else {
            // FALLBACK: GERAÇÃO TEXTUAL PADRÃO (LEGADO)
            const today = new Date();
            const formattedDate = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            
            const recommendationTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, vem por meio desta, recomendar à comunhão dos santos, o(a) irmão(a) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${new Date(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) é ${roleOrFunction} em nossa igreja, encontrando-se em plena comunhão e paz conosco. Portanto, o(a) recomendamos para participar de todas as atividades e sacramentos, como membro do corpo de Cristo.\n\nSem mais para o momento, subscrevemo-nos.`;
            const transferTemplate = `A Igreja Evangélica Assembleia de Deus em ${currentChurch.address.split(',')[1]?.trim() || currentChurch.name}, concede a presente CARTA DE MUDANÇA ao(à) irmão(ã) ${selectedMember.name}, portador(a) do CPF nº ${selectedMember.cpf}, nascido(a) em ${new Date(selectedMember.birthDate).toLocaleDateString('pt-BR')} e batizado(a) nas águas em ${selectedMember.baptismDate ? new Date(selectedMember.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada'}.\n\nO(A) referido(a) irmão(a) esteve em comunhão conosco na função de ${roleOrFunction} e, por motivo de mudança, solicitou seu desligamento de nosso rol de membros.\n\nNada temos que desabone sua conduta moral e espiritual. Portanto, o(a) recomendamos à vossa filiação.\n\nSem mais para o momento, subscrevemo-nos.`;
            
            const content = letterType === 'RECOMENDACAO' ? recommendationTemplate : transferTemplate;
            const title = letterType === 'RECOMENDACAO' ? 'CARTA DE RECOMENDAÇÃO' : 'CARTA DE MUDANÇA';

            if (currentChurch.logoUrl) doc.addImage(currentChurch.logoUrl, 'PNG', 15, 15, 30, 30);
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(currentChurch.name.toUpperCase(), 105, 25, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(currentChurch.address, 105, 32, { align: 'center' });
            doc.text(`Pastor Presidente: ${currentChurch.pastorName}`, 105, 39, { align: 'center' });
            doc.setLineWidth(0.5);
            doc.line(15, 50, 195, 50);

            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(title, 105, 70, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            const splitText = doc.splitTextToSize(content, 170);
            doc.text(splitText, 20, 90);

            doc.text(`${currentChurch.address.split(',')[1]?.trim() || 'Local'}, ${formattedDate}.`, 105, 180, { align: 'center' });
            
            doc.line(65, 220, 145, 220);
            doc.text('Assinatura do Pastor', 105, 225, { align: 'center' });
            doc.setFontSize(8);
            doc.text(currentChurch.pastorName.toUpperCase(), 105, 230, { align: 'center' });
        }

        doc.save(`Carta_${letterType}_${selectedMember.name.replace(/\s/g, '_')}.pdf`);

        // Save History
        if (user) {
            await addLetterHistory({
                churchId: selectedMember.churchId,
                memberId: selectedMember.id,
                letterType: letterType,
                issuedAt: new Date().toISOString(),
                issuedByUserId: user.id,
                memberDataSnapshot: {
                    name: selectedMember.name,
                    baptismDate: selectedMember.baptismDate,
                    birthDate: selectedMember.birthDate,
                    roleOrFunction: roleOrFunction,
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
        setBackgroundUrl(undefined);
        setRecommendationText('');
        setChangeText('');
        setLayoutElements(DEFAULT_TAGS);
    };

    const handleEditTemplate = (t: LetterTemplate) => {
        setEditingTemplateId(t.id);
        setTemplateName(t.name);
        setTemplateType(t.type);
        setBackgroundUrl(t.backgroundUrl);
        setRecommendationText(t.recommendationText || '');
        setChangeText(t.changeText || '');
        setLayoutElements(t.layoutJson || DEFAULT_TAGS);
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
            recommendationText,
            changeText,
            layoutJson: layoutElements
        };

        let res;
        if (editingTemplateId) {
            res = await updateLetterTemplate(editingTemplateId, payload);
        } else {
            res = await addLetterTemplate(payload);
        }
        
        if (res && !res.success) {
            showAlert("Erro ao Salvar", `Ocorreu um erro no banco de dados: ${res.error}. \n\nCertifique-se de que as colunas 'recommendation_text' e 'change_text' existem na tabela 'letter_templates'.`, "danger");
        } else {
            await loadTemplates();
            showAlert("Sucesso", "Modelo salvo com sucesso!", "success");
        }
        setIsSavingTemplate(false);
    };

    const handleDeleteTemplateHandler = (id: string) => {
        showConfirm("Excluir Modelo", "Tem certeza?", async () => {
            await deleteLetterTemplate(id);
            await loadTemplates();
            if(editingTemplateId === id) handleNewTemplate();
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
        const newEl: LayoutElement = {
            id: `tag_${Date.now()}`,
            type: 'tag',
            content: tag,
            x: 50,
            y: 50,
            style: { fontSize: 12, color: '#000000', fontWeight: 'bold', textAlign: 'left' }
        };
        setLayoutElements(prev => [...prev, newEl]);
        setSelectedElementId(newEl.id);
    };

    const handleDragStop = (id: string, data: DraggableData) => {
        setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, x: data.x, y: data.y } : el));
    };

    const wrapperRef = useRef<HTMLDivElement>(null);
    const activeMembers = members.filter(m => m.churchId === currentChurch?.id && (m.status || 'ATIVO') === 'ATIVO');
    const memberSuggestions = searchTerm.length < 2 ? [] : activeMembers.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cpf.includes(searchTerm));
    const filteredTemplates = templates.filter(t => t.churchId === currentChurch?.id && (t.type === letterType || t.type === 'GENERICO'));

    // --- RENDERERS ---

    const renderEditor = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow border">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700 flex items-center"><FileSignature className="mr-2"/> Editor de Modelos (Papel Timbrado)</h3>
                    <div className="flex gap-2">
                        <button onClick={handleNewTemplate} className="px-3 py-2 border rounded hover:bg-gray-50 text-sm font-bold">Novo</button>
                        <button onClick={handleSaveTemplate} disabled={isSavingTemplate} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700 flex items-center">
                            {isSavingTemplate ? <Settings className="animate-spin mr-2"/> : <Save className="mr-2"/>} Salvar
                        </button>
                    </div>
                </div>

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Texto de Recomendação</label>
                        <textarea 
                            rows={3}
                            className="w-full p-2 border rounded text-sm" 
                            value={recommendationText} 
                            onChange={e => setRecommendationText(e.target.value)}
                            placeholder="Texto base que será inserido na tag {{texto_cadastrado}}"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Texto de Mudança</label>
                        <textarea 
                            rows={3}
                            className="w-full p-2 border rounded text-sm" 
                            value={changeText} 
                            onChange={e => setChangeText(e.target.value)}
                            placeholder="Texto base que será inserido na tag {{texto_cadastrado}}"
                        />
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-2 rounded border">
                    <span className="text-xs font-bold text-gray-400 flex items-center mr-2">Adicionar Campos:</span>
                    {['{{nome_membro}}', '{{cpf}}', '{{cargo}}', '{{data_batismo}}', '{{data_nascimento}}', '{{data_atual}}', '{{cidade_igreja}}', '{{estado_civil}}', '{{texto_cadastrado}}'].map(tag => (
                        <button key={tag} onClick={() => handleAddField(tag)} className="bg-white border px-2 py-1 rounded text-xs hover:bg-blue-50 text-blue-700 font-bold shadow-sm">
                            {tag.replace(/{{|}}/g, '')}
                        </button>
                    ))}
                    {selectedElementId && (
                        <button onClick={() => { setLayoutElements(prev => prev.filter(e => e.id !== selectedElementId)); setSelectedElementId(null); }} className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded">
                            <Trash2 size={16}/>
                        </button>
                    )}
                </div>

                {/* CANVAS */}
                <div className="relative border bg-gray-200 overflow-hidden mx-auto shadow-2xl" style={{ width: EDITOR_WIDTH, height: EDITOR_HEIGHT }}>
                    {backgroundUrl && <img src={backgroundUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />}
                    {layoutElements.map(el => (
                        <DraggableLabel key={el.id} el={el} isSelected={selectedElementId === el.id} onSelect={setSelectedElementId} onDragStop={handleDragStop} />
                    ))}
                    <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/80 px-1 rounded pointer-events-none">A4 Preview</div>
                </div>
            </div>

            {/* LISTA DE MODELOS - HISTÓRICO */}
            <div className="bg-white p-6 rounded-xl shadow border">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center"><History className="mr-2"/> Histórico de Modelos de Cartas</h3>
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
        </div>
    );

    const renderEmission = () => (
        <div className="space-y-6 animate-fade-in">
            {/* FORMULÁRIO DE GERAÇÃO */}
            <div className="bg-white p-6 rounded-xl shadow-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Coluna 1: Seleção de Tipo e Membro */}
                    <div className="md:col-span-1 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Carta</label>
                            <div className="flex gap-2">
                                <button onClick={() => setLetterType('RECOMENDACAO')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${letterType === 'RECOMENDACAO' ? 'bg-brand-black text-white' : 'bg-white'}`}>Recomendação</button>
                                <button onClick={() => setLetterType('MUDANCA')} className={`flex-1 py-2 text-xs font-bold rounded-lg border ${letterType === 'MUDANCA' ? 'bg-brand-black text-white' : 'bg-white'}`}>Mudança</button>
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
                                {searchTerm && <button onClick={() => {setSelectedMember(null); setSearchTerm('');}} className="absolute right-3 top-3 text-gray-400 hover:text-red-500"><X size={18}/></button>}
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

                    {/* Coluna 2: Dados e Geração */}
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
                                            <option value="">Padrão (Apenas Texto)</option>
                                            {filteredTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                        {filteredTemplates.length === 0 && (
                                            <p className="text-[10px] text-orange-600 mt-1 font-medium italic">Nenhum modelo personalizado para este tipo.</p>
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
                                    <Download className="mr-2" /> Gerar Carta PDF
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
                                <th className="px-4 py-2 text-left">Tipo</th>
                                <th className="px-4 py-2 text-left">Data de Emissão</th>
                                <th className="px-4 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {lettersHistory.filter(h => h.churchId === currentChurch?.id).sort((a,b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()).map(h => (
                                <tr key={h.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium">{h.memberDataSnapshot.name}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.letterType === 'MUDANCA' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {h.letterType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-600">{new Date(h.issuedAt).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-2 text-right">
                                        <button 
                                            onClick={() => {
                                                setSelectedMember({
                                                    name: h.memberDataSnapshot.name,
                                                    cpf: h.memberDataSnapshot.cpf,
                                                    birthDate: h.memberDataSnapshot.birthDate || '',
                                                    baptismDate: h.memberDataSnapshot.baptismDate,
                                                } as Member);
                                                setRoleOrFunction(h.memberDataSnapshot.roleOrFunction);
                                                setLetterType(h.letterType);
                                                showAlert("Pronto para Reemissão", "Os dados foram carregados no formulário. Clique em 'Gerar Carta PDF' para reimprimir.", "info");
                                                window.scrollTo({top: 0, behavior: 'smooth'});
                                            }}
                                            className="text-gray-500 hover:text-brand-orange p-1 flex items-center ml-auto"
                                            title="Carregar dados para reimpressão"
                                        >
                                            <Eye size={16} className="mr-1"/> Reemitir
                                        </button>
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
                        <Mail className="mr-3 text-brand-orange" /> Secretaria: Cartas
                    </h1>
                    <p className="text-gray-500 mt-1">Emissão de documentos oficiais e gestão de modelos.</p>
                </div>
                {/* TAB SWITCHER */}
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
                <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
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
