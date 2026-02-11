import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Globe, DollarSign, BookOpen, 
  Download, Save, X, Search, CheckCircle, Info,
  LayoutDashboard, Settings, Image as ImageIcon,
  Move, Upload, History, Trash2, Calendar,
  User as UserIcon, Eye, FileText, RefreshCw, PlusCircle, MinusCircle,
  PieChart, TrendingUp, TrendingDown, Users, Edit2, Key, Filter, Loader, Copy, Grid, CheckSquare, Maximize, AlertTriangle, Type, Hash, CalendarDays, Printer, Sparkles
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Transaction, LayoutElement, Member, User, Role, CarnetTemplate, CarnetBackgroundStyle } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Draggable, { DraggableData } from 'react-draggable';
import { GoogleGenAI, Type as GenAIType } from "@google/genai";

// --- CONFIGURAÇÕES DE DIMENSÃO (BASE 96 DPI) ---
const EDITOR_WIDTH = 794; 
const TICKET_HEIGHT_MM = 70;
const TICKET_WIDTH_MM = 210;
const EDITOR_HEIGHT = (EDITOR_WIDTH * TICKET_HEIGHT_MM) / TICKET_WIDTH_MM;

const REQUIRED_FIELDS: LayoutElement[] = [
    { id: 'field_nome', type: 'tag', content: '{{nome_membro}}', x: 50, y: 50, style: { fontSize: 12, color: '#000000', fontWeight: 'bold', textAlign: 'left' } },
    { id: 'field_valor', type: 'tag', content: '{{valor}}', x: 200, y: 50, style: { fontSize: 14, color: '#000000', fontWeight: 'bold', textAlign: 'left' } },
    { id: 'field_mes', type: 'tag', content: '{{mes_extenso}}', x: 50, y: 100, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'left' } },
    { id: 'field_ano', type: 'tag', content: '{{ano}}', x: 200, y: 100, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'left' } },
    { id: 'field_parcela', type: 'tag', content: '{{n_parcela}}', x: 350, y: 100, style: { fontSize: 12, color: '#000000', fontWeight: 'normal', textAlign: 'left' } }
];

const MISSIONS_ROLES: {role: Role, label: string}[] = [
    { role: 'PRESIDENTE_MISSOES', label: 'Presidente de Missões' },
    { role: 'VICE_MISSOES', label: 'Vice-Presidente de Missões' },
    { role: 'TESOUREIRO_MISSOES', label: '1º Tesoureiro(a) de Missões' },
    { role: 'SECRETARIO_MISSOES', label: '1º Secretário(a) de Missões' }
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(',')[1]; 
        resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

interface DraggableLabelProps {
  el: LayoutElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStop: (id: string, data: DraggableData) => void;
}

const DraggableLabel: React.FC<DraggableLabelProps> = ({ el, isSelected, onSelect, onDragStop }) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  
  const friendlyName: Record<string, string> = {
      '{{nome_membro}}': 'Nome',
      '{{valor}}': 'R$',
      '{{mes_extenso}}': 'Mês',
      '{{ano}}': 'Ano',
      '{{n_parcela}}': 'Parc.'
  };

  const showIcon = el.style.fontSize > 10;

  const getIcon = (content: string) => {
      if (!showIcon) return null;
      if (content.includes('nome')) return <UserIcon size={10} className="mr-1 opacity-70"/>;
      if (content.includes('valor')) return <DollarSign size={10} className="mr-1 opacity-70"/>;
      if (content.includes('mes') || content.includes('ano')) return <CalendarDays size={10} className="mr-1 opacity-70"/>;
      if (content.includes('parcela')) return <Hash size={10} className="mr-1 opacity-70"/>;
      return <Type size={10} className="mr-1 opacity-70"/>;
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
          className={`absolute cursor-move flex items-center rounded-sm transition-all select-none group z-20 hover:border-blue-400
            ${isSelected 
                ? 'border border-blue-600 bg-blue-50/90 text-white z-30 shadow-md' 
                : 'border border-dashed border-gray-500/60 bg-white/20 hover:bg-white/60 text-gray-900'}
            `}
          style={{
              padding: '0px 3px',
              transformOrigin: 'left top',
              height: 'fit-content'
          }}
      >
          {isSelected && getIcon(el.content)}
          <div 
            style={{
                fontSize: `${el.style.fontSize}px`,
                color: isSelected ? '#ffffff' : el.style.color,
                fontWeight: el.style.fontWeight === 'bold' ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                lineHeight: 1.1,
                textShadow: isSelected ? 'none' : '0px 0px 2px rgba(255,255,255,0.8)'
            }}
          >
              {el.type === 'tag' ? (friendlyName[el.content] || el.content) : el.content}
          </div>
          {(isSelected) && (
             <span className="absolute -top-3 -right-3 bg-blue-600 text-white text-[8px] px-1 rounded-full shadow pointer-events-none">{el.style.fontSize}px</span>
          )}
      </div>
    </Draggable>
  );
};

export const MissionsPanel: React.FC = () => {
  const { 
      user, currentChurch, transactions, members, users,
      addTransaction, deleteTransaction, 
      uploadBookletBackground, uploadTransactionFile, addFixedExpense,
      addUser, updateUser, deleteUser, updateUserCredentials,
      getCarnetTemplates, addCarnetTemplate, updateCarnetTemplate, deleteCarnetTemplate, setDefaultTemplate
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  
  const isMissionsRole = user && [
      'PRESIDENTE_MISSOES', 'VICE_MISSOES', 'TESOUREIRO_MISSOES', 'SECRETARIO_MISSOES'
  ].includes(user.role);

  const canManageTeam = user && [
      'SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE', 'PRESIDENTE_MISSOES', 'VICE_MISSOES'
  ].includes(user.role);

  const [viewMode, setViewMode] = useState<'SELECTION' | 'DASHBOARD'>(isMissionsRole ? 'DASHBOARD' : 'SELECTION');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LANCAMENTOS' | 'CARNES' | 'CONFIG_MODELO' | 'RELATORIOS' | 'EQUIPE'>('DASHBOARD');

  const [dashMonth, setDashMonth] = useState(new Date().getMonth() + 1);
  const [dashYear, setDashYear] = useState(new Date().getFullYear());

  const [reportFilterType, setReportFilterType] = useState<'MONTH' | 'PERIOD'>('MONTH');
  const [reportViewMode, setReportViewMode] = useState<'DETAILED' | 'SUMMARY'>('DETAILED');
  const [repMonth, setRepMonth] = useState(new Date().getMonth() + 1);
  const [repYear, setRepYear] = useState(new Date().getFullYear());
  
  const today = new Date();
  const [repStartDate, setRepStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [repEndDate, setRepEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
  const [appliedRepStart, setAppliedRepStart] = useState(repStartDate);
  const [appliedRepEnd, setAppliedRepEnd] = useState(repEndDate);

  const [templates, setTemplates] = useState<CarnetTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  
  const [layoutElements, setLayoutElements] = useState<LayoutElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | undefined>(undefined);
  const [bgStyle, setBgStyle] = useState<CarnetBackgroundStyle>({ mode: 'fill', opacity: 1.0 });

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [subTab, setSubTab] = useState<'LISTA' | 'ENTRADA' | 'SAIDA'>('LISTA');
  const [transType, setTransType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState(''); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [missionRecipient, setMissionRecipient] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [bookletYear, setBookletYear] = useState(new Date().getFullYear());
  const [bookletAmount, setBookletAmount] = useState('');
  const [bookletMemberId, setBookletMemberId] = useState('');
  const [bookletSearchTerm, setBookletSearchTerm] = useState('');
  const [selectedGenTemplateId, setSelectedGenTemplateId] = useState<string>('');

  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());
  const [historySearch, setHistorySearch] = useState('');
  
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamFormMode, setTeamFormMode] = useState<'LIST' | 'EDIT'>('LIST');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [teamFormData, setTeamFormData] = useState({ name: '', username: '', password: '', role: 'PRESIDENTE_MISSOES' as Role, cpf: '' });
  
  // Autocomplete State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState<{show: boolean, msg: string, type: 'success'|'error'|'info'}>({show: false, msg: '', type: 'success'});

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning'; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'warning', onConfirm: undefined });

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filter for Extrato List (Global for Missions Panel)
  const historyTransactions = transactions.filter(t => {
      if (t.churchId !== currentChurch?.id) return false;
      if (t.category !== 'MISSOES') return false; 
      const d = new Date(t.date + 'T12:00:00');
      const matchesDate = (d.getMonth() + 1) === historyMonth && d.getFullYear() === historyYear;
      const memberName = members.find(m => m.id === t.memberId)?.name || '';
      const matchesSearch = t.description.toLowerCase().includes(historySearch.toLowerCase()) || 
                            memberName.toLowerCase().includes(historySearch.toLowerCase());
      return matchesDate && matchesSearch;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
      const state = location.state as { activeTab?: string; entered?: boolean } | null;
      if (state?.activeTab) { 
          setViewMode('DASHBOARD'); 
          setActiveTab(state.activeTab as any); 
      } else if (!isMissionsRole) {
          setViewMode('SELECTION');
      }
      
      if (currentChurch) {
          loadTemplates();
      }
  }, [currentChurch, location, isMissionsRole]);

  // Click Outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const loadTemplates = async () => {
      if(!currentChurch) return;
      const loaded = await getCarnetTemplates(currentChurch.id);
      setTemplates(loaded);
      
      const def = loaded.find(t => t.isDefault);
      if(def && !selectedGenTemplateId) setSelectedGenTemplateId(def.id);
      else if(loaded.length > 0 && !selectedGenTemplateId) setSelectedGenTemplateId(loaded[0].id);
  };

  const showFeedback = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setModal({show: true, msg, type});
      setTimeout(() => setModal({show: false, msg: '', type: 'success'}), 3000);
  };

  const handleNewTemplate = () => { setEditingTemplateId(null); setTemplateName(''); setBackgroundUrl(undefined); setLayoutElements([]); setBgStyle({ mode: 'fill', opacity: 1.0 }); };
  const handleEditTemplate = (t: CarnetTemplate) => { setEditingTemplateId(t.id); setTemplateName(t.name); setBackgroundUrl(t.backgroundUrl); setLayoutElements(t.layoutJson || REQUIRED_FIELDS); setBgStyle(t.backgroundStyle || { mode: 'fill', opacity: 1.0 }); window.scrollTo({top: 0, behavior: 'smooth'}); };
  
  const handleSaveTemplate = async (asNew: boolean) => { 
      if(!currentChurch) return; 
      if(!templateName.trim()) { showFeedback('Digite um nome.', 'error'); return; } 
      if(!backgroundUrl) { showFeedback('Carregue uma imagem.', 'error'); return; } 
      setIsSavingSettings(true); 
      if (asNew || !editingTemplateId) { 
          const newT: CarnetTemplate = { 
              id: '', 
              churchId: currentChurch.id, 
              name: templateName, 
              backgroundUrl, 
              backgroundStyle: bgStyle, 
              layoutJson: layoutElements, 
              isDefault: templates.length === 0,
              category: 'MISSOES' // Added
          }; 
          await addCarnetTemplate(newT); 
          showFeedback('Salvo!'); 
      } else { 
          await updateCarnetTemplate(editingTemplateId, { 
              name: templateName, 
              backgroundUrl, 
              backgroundStyle: bgStyle, 
              layoutJson: layoutElements,
              category: 'MISSOES' // Added
          }); 
          showFeedback('Atualizado!'); 
      } 
      await loadTemplates(); 
      setIsSavingSettings(false); 
  };

  const handleDeleteTemplate = async (id: string) => { setConfirmModal({ isOpen: true, title: 'Excluir', message: 'Confirma exclusão?', variant: 'danger', onConfirm: async () => { await deleteCarnetTemplate(id); await loadTemplates(); if(editingTemplateId === id) handleNewTemplate(); showFeedback('Excluído.'); setConfirmModal(prev => ({...prev, isOpen: false})); }}); };
  
  const handleSetDefault = async (id: string) => { if(!currentChurch) return; await setDefaultTemplate(id, currentChurch.id, 'MISSOES'); await loadTemplates(); showFeedback('Padrão definido.'); };
  
  const handleAddTag = (tag: string, x: number = 50, y: number = 50) => { if (layoutElements.some(el => el.content === tag)) { setLayoutElements(prev => prev.map(el => el.content === tag ? { ...el, x, y } : el)); return; } const newEl: LayoutElement = { id: `field_${Date.now()}_${Math.random()}`, type: 'tag', content: tag, x: x, y: y, style: { fontSize: 12, color: '#000000', fontWeight: 'bold', textAlign: 'left' } }; setLayoutElements(prev => [...prev, newEl]); if (x === 50 && y === 50) setSelectedElementId(newEl.id); };
  const handleDeleteElement = (id: string) => { setLayoutElements(prev => prev.filter(el => el.id !== id)); setSelectedElementId(null); };
  
  const analyzeLayoutWithGemini = async (file: File) => {
      // SECURITY CHECK: API KEY
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
          showFeedback("IA não configurada (API Key ausente). Edição manual.", "info");
          return;
      }

      try {
          setIsAnalyzing(true);
          const base64Image = await fileToBase64(file);
          const ai = new GoogleGenAI({ apiKey });
          
          const prompt = `
            Você é um especialista em UI/UX e extração de dados de formulários.
            Analise a imagem deste carnê de pagamento.
            
            Sua tarefa é encontrar as coordenadas (x, y) do ESPAÇO VAZIO DE PREENCHIMENTO para cada campo.
            NÃO retorne a posição do rótulo.

            Campos:
            1. Nome (tag: "{{nome_membro}}")
            2. Valor (tag: "{{valor}}")
            3. Mês (tag: "{{mes_extenso}}")
            4. Ano (tag: "{{ano}}")
            5. Parcela (tag: "{{n_parcela}}")

            Retorne um JSON com coordenadas normalizadas (0-1000):
            { "fields": [ { "tag": "{{nome_membro}}", "x": 100, "y": 200, "estimated_font_size": 12 } ] }
          `;

          const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: { parts: [{ inlineData: { mimeType: file.type, data: base64Image } }, { text: prompt }] },
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: GenAIType.OBJECT,
                      properties: {
                          fields: {
                              type: GenAIType.ARRAY,
                              items: {
                                  type: GenAIType.OBJECT,
                                  properties: {
                                      tag: { type: GenAIType.STRING },
                                      x: { type: GenAIType.NUMBER },
                                      y: { type: GenAIType.NUMBER },
                                      estimated_font_size: { type: GenAIType.NUMBER }
                                  }
                              }
                          }
                      }
                  }
              }
          });

          const resultText = response.text;
          if (resultText) {
              const data = JSON.parse(resultText);
              if (data.fields && Array.isArray(data.fields)) {
                  setLayoutElements([]);
                  let count = 0;
                  data.fields.forEach((field: any) => {
                      const pixelX = (field.x / 1000) * EDITOR_WIDTH;
                      const pixelY = (field.y / 1000) * EDITOR_HEIGHT;
                      const newEl: LayoutElement = {
                          id: `field_${Date.now()}_${count}`,
                          type: 'tag', content: field.tag, x: pixelX, y: pixelY,
                          style: { fontSize: Math.max(8, Math.min(16, field.estimated_font_size || 12)), color: '#000000', fontWeight: 'bold', textAlign: 'left' }
                      };
                      setLayoutElements(prev => [...prev, newEl]);
                      count++;
                  });
                  if (count > 0) showFeedback(`IA: ${count} campos posicionados!`, 'success');
              }
          }
      } catch (error) {
          console.error("Erro IA:", error);
          showFeedback("Falha na análise automática.", 'error');
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleTestPrint = () => {
      if (!backgroundUrl) { showFeedback('Carregue uma imagem de fundo.', 'error'); return; }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const scale = 210 / EDITOR_WIDTH;
      const dummyData: Record<string, string> = {
          '{{nome_membro}}': 'JOÃO DA SILVA (TESTE)', '{{valor}}': 'R$ 50,00',
          '{{mes_extenso}}': 'JANEIRO', '{{ano}}': '2024', '{{n_parcela}}': '1/12'
      };
      doc.addImage(backgroundUrl, 'JPEG', 0, 0, 210, 70);
      layoutElements.forEach(el => {
          let text = dummyData[el.content] || el.content;
          doc.setTextColor(el.style.color);
          doc.setFontSize(el.style.fontSize); 
          doc.setFont("helvetica", el.style.fontWeight === 'bold' ? 'bold' : 'normal');
          doc.text(text, el.x * scale, (el.y * scale) + (el.style.fontSize * 0.35)); 
      });
      doc.setDrawColor(200, 200, 200); doc.rect(0, 0, 210, 70);
      window.open(doc.output('bloburl'), '_blank');
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
      if (e.target.files && e.target.files[0]) { 
          setIsSavingSettings(true); 
          const file = e.target.files[0]; 
          const url = await uploadBookletBackground(file); 
          if (url) { 
              setBackgroundUrl(url); 
              showFeedback("Imagem carregada!"); 
              await analyzeLayoutWithGemini(file);
          } 
          setIsSavingSettings(false); 
          if (bgInputRef.current) bgInputRef.current.value = ''; 
      } 
  };

  const handleDragStop = (id: string, data: DraggableData) => { setLayoutElements(prev => prev.map(el => el.id === id ? { ...el, x: data.x, y: data.y } : el)); };
  const updateSelectedStyle = (key: keyof LayoutElement['style'], value: any) => { if (!selectedElementId) return; setLayoutElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, style: { ...el.style, [key]: value } } : el)); };
  const missionsUsers = users.filter(u => u.churchId === currentChurch?.id && MISSIONS_ROLES.some(mr => mr.role === u.role));
  
  const handleEditTeamMember = (user: User) => { setEditingUserId(user.id); setTeamFormData({ name: user.name, username: user.username, password: '', role: user.role, cpf: user.cpf }); setTeamFormMode('EDIT'); };
  
  const handleSaveTeamMember = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!currentChurch) return; 
      const payload: User = { 
          id: editingUserId || '', 
          name: teamFormData.name.toUpperCase(), 
          username: teamFormData.username, 
          cpf: teamFormData.cpf, 
          role: teamFormData.role, 
          churchId: currentChurch.id, 
          password: teamFormData.password 
      }; 
      if (editingUserId) { 
          await updateUser(editingUserId, payload); 
          if (teamFormData.password) { await updateUserCredentials(editingUserId, undefined, teamFormData.password); } 
          showFeedback('Atualizado!'); 
      } else { 
          const res = await addUser(payload); 
          if (res.success) showFeedback('Adicionado!'); 
          else { showFeedback(res.error || 'Erro', 'error'); return; } 
      } 
      setTeamFormMode('LIST'); setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'PRESIDENTE_MISSOES', cpf: '' }); 
  };
  
  const handleDeleteTeamMember = async (id: string) => { setConfirmModal({ isOpen: true, title: 'Excluir', message: 'Remover membro?', variant: 'danger', onConfirm: async () => { await deleteUser(id); showFeedback('Removido.'); setConfirmModal(prev => ({...prev, isOpen: false})); }}); };
  
  const handleCancelForm = () => {
    setAmount(''); setDesc(''); setSearchTerm(''); setSelectedMemberId(''); setSelectedFile(null); setMissionRecipient('');
    setSubTab('LISTA');
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const handleMemberSelectForTransaction = (m: Member) => {
    setSelectedMemberId(m.id);
    setSearchTerm(m.name);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentChurch || !user) return;
      setIsSubmitting(true);
      
      let attUrl = undefined;
      if (selectedFile) attUrl = await uploadTransactionFile(selectedFile);
      
      let finalDesc = desc.toUpperCase();
      if (transType === 'ENTRADA' && !finalDesc) finalDesc = `OFERTA MISSÕES`;

      let fixedId: string | undefined = undefined;
      if (transType === 'SAIDA' && isRecurring) {
          const day = parseInt(date.split('-')[2]);
          fixedId = await addFixedExpense({
              id: '', churchId: currentChurch.id, description: finalDesc, amount: parseFloat(amount),
              dueDay: day, category: 'MISSOES', autoGenerate: true, active: true
          });
      }

      await addTransaction({
          id: '', churchId: currentChurch.id, type: transType, category: 'MISSOES', amount: parseFloat(amount),
          date, description: finalDesc, memberId: selectedMemberId || undefined, responsibleUserId: user.id, 
          attachmentUrl: attUrl, isFixed: isRecurring, fixedExpenseId: fixedId, status: 'PAGO'
      });
      
      setIsSubmitting(false);
      showFeedback('Lançamento realizado!');
      handleCancelForm();
  };

  const handleDeleteTransaction = async (id: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'Excluir',
          message: 'Deseja excluir?',
          variant: 'danger',
          onConfirm: async () => {
              await deleteTransaction(id);
              showFeedback('Excluído.');
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // Booklet Generation Handlers
  const filteredMembersForBooklet = members.filter(m => m.churchId === currentChurch?.id && (m.name.toLowerCase().includes(bookletSearchTerm.toLowerCase()) || m.cpf.includes(bookletSearchTerm)));
  const handleBookletMemberSelect = (m: Member) => { setBookletMemberId(m.id); setBookletSearchTerm(m.name); };

  const generateBookletPDF = async () => { 
      if (!currentChurch || !bookletMemberId || !bookletAmount) { showFeedback("Selecione membro e valor.", 'error'); return; } 
      
      const templateToUse = templates.find(t => t.id === selectedGenTemplateId);
      if (!templateToUse) { showFeedback("Selecione um modelo.", 'error'); return; }

      const member = members.find(m => m.id === bookletMemberId); 
      if (!member) return; 
      
      setIsGenerating(true);

      const bgUrl = templateToUse.backgroundUrl;
      const bgStyle = templateToUse.backgroundStyle || { mode: 'cover', opacity: 0.5 };
      let bgData: string | null = null;
      let bgWidth = 0;
      let bgHeight = 0;

      if (bgUrl) {
          try {
              const response = await fetch(bgUrl);
              const blob = await response.blob();
              bgData = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
              });
              if (bgData) {
                  const img = new Image();
                  img.src = bgData;
                  await new Promise((resolve) => { img.onload = resolve; });
                  bgWidth = img.naturalWidth;
                  bgHeight = img.naturalHeight;
              }
          } catch (err) {
              console.error("Erro ao baixar background", err);
          }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const elements = templateToUse.layoutJson || REQUIRED_FIELDS;
      const scale = 210 / EDITOR_WIDTH; 

      const ticketsPerPage = 4;
      const pageHeight = 297;
      const totalTicketsHeight = ticketsPerPage * TICKET_HEIGHT_MM; 
      const marginY = (pageHeight - totalTicketsHeight) / 2;
      
      let imgX = 0, imgY = 0, imgW = 210, imgH = 70;

      if (bgData && bgWidth > 0 && bgHeight > 0) {
          const ratioImg = bgWidth / bgHeight;
          const ratioTicket = 210 / 70; 

          if (bgStyle.mode === 'contain') {
              if (ratioImg > ratioTicket) { imgW = 210; imgH = 210 / ratioImg; imgY = (70 - imgH) / 2; } 
              else { imgH = 70; imgW = 70 * ratioImg; imgX = (210 - imgW) / 2; }
          } else if (bgStyle.mode === 'cover') {
              if (ratioImg > ratioTicket) { imgH = 70; imgW = 70 * ratioImg; imgX = (210 - imgW) / 2; } 
              else { imgW = 210; imgH = 210 / ratioImg; imgY = (70 - imgH) / 2; }
          } 
      }

      for (let i = 0; i < 12; i++) { 
          if (i > 0 && i % ticketsPerPage === 0) doc.addPage();
          const currentY = marginY + ((i % ticketsPerPage) * TICKET_HEIGHT_MM);

          if (bgData) {
              doc.saveGraphicsState();
              doc.setGState(new (doc as any).GState({ opacity: bgStyle.opacity }));
              doc.addImage(bgData, 'JPEG', imgX, currentY + imgY, imgW, imgH);
              doc.restoreGraphicsState();
          }

          elements.forEach(el => {
              let text = el.content;
              text = text.replace('{{nome_membro}}', member.name);
              text = text.replace('{{valor}}', `R$ ${parseFloat(bookletAmount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
              text = text.replace('{{mes_extenso}}', months[i]);
              text = text.replace('{{ano}}', bookletYear.toString());
              text = text.replace('{{n_parcela}}', `${i+1}/12`);

              let fontSize = el.style.fontSize;
              doc.setFontSize(fontSize);
              doc.setFont("helvetica", el.style.fontWeight === 'bold' ? 'bold' : 'normal');

              const xPosMM = el.x * scale;
              const STUB_WIDTH_MM = 70;
              const PAGE_WIDTH_MM = 210;
              const MARGIN_MM = 3;
              let maxWidthMM = 0;

              if (xPosMM < (STUB_WIDTH_MM - 10)) {
                  maxWidthMM = STUB_WIDTH_MM - xPosMM - MARGIN_MM;
              } else {
                  maxWidthMM = PAGE_WIDTH_MM - xPosMM - MARGIN_MM;
              }
              if (maxWidthMM < 10) maxWidthMM = 20;

              while (doc.getTextWidth(text) > maxWidthMM && fontSize > 6) {
                  fontSize -= 0.5;
                  doc.setFontSize(fontSize);
              }

              doc.setTextColor(el.style.color);
              const x = el.x * scale;
              const y = el.y * scale;
              doc.text(text, x, currentY + y + (fontSize * 0.35)); 
          });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(0, currentY, 210, 70);

          if ((i + 1) % ticketsPerPage !== 0 && (i + 1) < 12) {
              (doc as any).setLineDash([2, 2], 0);
              doc.setDrawColor(150, 150, 150);
              doc.line(0, currentY + 70, 210, currentY + 70);
              (doc as any).setLineDash([], 0); 
          }

          const monthStr = (i+1).toString().padStart(2, '0');
          const dueDate = `${bookletYear}-${monthStr}-10`; 
          
          await addTransaction({ 
              id: '', churchId: currentChurch.id, type: 'ENTRADA', category: 'MISSOES', 
              amount: parseFloat(bookletAmount), date: dueDate, 
              description: `CARNÊ ${bookletYear} (${i+1}/12) - ${member.name}`, 
              memberId: member.id, responsibleUserId: user?.id || '', status: 'PENDENTE' 
          }); 
      } 
      
      doc.save(`CARNE_MISSOES_${member.name.replace(/\s+/g, '_')}_${bookletYear}.pdf`); 
      setIsGenerating(false);
      showFeedback("Carnê gerado e lançamentos criados!"); 
  };

  const handleReprintCarnet = async (t: Transaction) => {
      const member = members.find(m => m.id === t.memberId);
      if (!member) { showFeedback('Membro não encontrado', 'error'); return; }

      const templateToUse = templates.find(temp => temp.id === selectedGenTemplateId) || templates.find(temp => temp.isDefault) || templates[0];
      if (!templateToUse) { showFeedback('Selecione um modelo de impressão acima ou cadastre um modelo.', 'error'); return; }

      const tDate = new Date(t.date);
      const year = tDate.getFullYear();
      const amountVal = t.amount;

      // Load background
      const bgUrl = templateToUse.backgroundUrl;
      const bgStyle = templateToUse.backgroundStyle || { mode: 'cover', opacity: 0.5 };
      let bgData: string | null = null;
      let bgWidth = 0; let bgHeight = 0;

      if (bgUrl) {
          try {
              const response = await fetch(bgUrl);
              const blob = await response.blob();
              bgData = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
              });
              if (bgData) {
                  const img = new Image();
                  img.src = bgData;
                  await new Promise((resolve) => { img.onload = resolve; });
                  bgWidth = img.naturalWidth; bgHeight = img.naturalHeight;
              }
          } catch (err) { console.error("Erro ao baixar background", err); }
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const elements = templateToUse.layoutJson || REQUIRED_FIELDS;
      const scale = 210 / EDITOR_WIDTH;
      
      const ticketsPerPage = 4;
      const pageHeight = 297;
      const totalTicketsHeight = ticketsPerPage * TICKET_HEIGHT_MM; 
      const marginY = (pageHeight - totalTicketsHeight) / 2;

      let imgX = 0, imgY = 0, imgW = 210, imgH = 70;
      if (bgData && bgWidth > 0 && bgHeight > 0) {
          const ratioImg = bgWidth / bgHeight;
          const ratioTicket = 210 / 70; 
          if (bgStyle.mode === 'contain') {
              if (ratioImg > ratioTicket) { imgW = 210; imgH = 210 / ratioImg; imgY = (70 - imgH) / 2; } 
              else { imgH = 70; imgW = 70 * ratioImg; imgX = (210 - imgW) / 2; }
          } else if (bgStyle.mode === 'cover') {
              if (ratioImg > ratioTicket) { imgH = 70; imgW = 70 * ratioImg; imgX = (210 - imgW) / 2; } 
              else { imgW = 210; imgH = 210 / ratioImg; imgY = (70 - imgH) / 2; }
          } 
      }

      // GENERATE 12 PAGES (CARNET COMPLET)
      for (let i = 0; i < 12; i++) {
          if (i > 0 && i % ticketsPerPage === 0) doc.addPage();
          const currentY = marginY + ((i % ticketsPerPage) * TICKET_HEIGHT_MM);

          if (bgData) {
              doc.saveGraphicsState();
              doc.setGState(new (doc as any).GState({ opacity: bgStyle.opacity }));
              doc.addImage(bgData, 'JPEG', imgX, currentY + imgY, imgW, imgH);
              doc.restoreGraphicsState();
          }

          elements.forEach(el => {
              let text = el.content;
              text = text.replace('{{nome_membro}}', member.name);
              text = text.replace('{{valor}}', `R$ ${amountVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
              text = text.replace('{{mes_extenso}}', months[i]);
              text = text.replace('{{ano}}', year.toString());
              text = text.replace('{{n_parcela}}', `${i+1}/12`);

              let fontSize = el.style.fontSize;
              doc.setFontSize(fontSize);
              doc.setFont("helvetica", el.style.fontWeight === 'bold' ? 'bold' : 'normal');
              
              const xPosMM = el.x * scale;
              const STUB_WIDTH_MM = 70;
              const PAGE_WIDTH_MM = 210;
              const MARGIN_MM = 3;
              let maxWidthMM = 0;
              if (xPosMM < (STUB_WIDTH_MM - 10)) maxWidthMM = STUB_WIDTH_MM - xPosMM - MARGIN_MM;
              else maxWidthMM = PAGE_WIDTH_MM - xPosMM - MARGIN_MM;
              if (maxWidthMM < 10) maxWidthMM = 20;

              while (doc.getTextWidth(text) > maxWidthMM && fontSize > 6) {
                  fontSize -= 0.5;
                  doc.setFontSize(fontSize);
              }

              const x = el.x * scale;
              const y = el.y * scale;
              doc.setTextColor(el.style.color);
              doc.text(text, x, currentY + y + (fontSize * 0.35)); 
          });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.1);
          doc.rect(0, currentY, 210, 70);

          if ((i + 1) % ticketsPerPage !== 0 && (i + 1) < 12) {
              (doc as any).setLineDash([2, 2], 0);
              doc.setDrawColor(150, 150, 150);
              doc.line(0, currentY + 70, 210, currentY + 70);
              (doc as any).setLineDash([], 0); 
          }
      }

      doc.save(`CARNE_COMPLETO_${year}_${member.name.replace(/\s+/g, '_')}.pdf`);
      showFeedback('Carnê completo baixado!');
  };

  // AUTOCOMPLETE LOGIC FOR TEAM MEMBER
  const memberSuggestions = members.filter(m => {
    if (m.churchId !== currentChurch?.id) return false;
    if (teamFormData.name.length < 2) return false;
    return m.name.toLowerCase().includes(teamFormData.name.toLowerCase());
  });

  const handleSelectMember = (member: Member) => {
    const firstName = member.name.split(' ')[0].toLowerCase();
    const suggestedUser = member.email ? member.email.split('@')[0] : firstName;
    
    setTeamFormData(prev => ({
      ...prev,
      name: member.name,
      cpf: member.cpf,
      username: suggestedUser
    }));
    setShowSuggestions(false);
  };

  const renderVisualEditor = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow border gap-4">
            <div className="flex-1 w-full md:w-auto"><input type="text" className="w-full p-2 border rounded font-bold text-sm bg-gray-50 focus:bg-white transition-colors" placeholder="Nome do Modelo" value={templateName} onChange={e => setTemplateName(e.target.value)} /></div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-end"><button type="button" onClick={() => bgInputRef.current?.click()} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center shadow-md">{isSavingSettings || isAnalyzing ? <Loader size={16} className="mr-2 animate-spin"/> : <Upload size={16} className="mr-2"/>} {isAnalyzing ? 'Analisando...' : '1. Carregar Arte'}</button><input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBackgroundUpload} /><div className="h-8 w-px bg-gray-300 mx-2"></div><button type="button" onClick={handleTestPrint} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center"><Printer size={16} className="mr-2"/> Testar</button><div className="flex flex-col"><button type="button" disabled={isSavingSettings} onClick={() => handleSaveTemplate(false)} className="px-4 py-1 bg-green-600 text-white rounded-t-lg text-xs font-bold hover:bg-green-700 flex items-center justify-center"><Save size={12} className="mr-1"/> Salvar</button><button type="button" disabled={isSavingSettings} onClick={() => handleSaveTemplate(true)} className="px-4 py-1 bg-green-700 text-white rounded-b-lg text-[10px] font-bold hover:bg-green-800 flex items-center justify-center border-t border-green-600"><Copy size={10} className="mr-1"/> Novo</button></div><button type="button" onClick={handleNewTemplate} className="p-2 text-gray-400 hover:text-red-500" title="Limpar"><RefreshCw size={18}/></button></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow border h-fit"><h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><Type size={14} className="mr-1"/> Campos</h4><div className="space-y-2">{['{{nome_membro}}', '{{valor}}', '{{mes_extenso}}', '{{ano}}', '{{n_parcela}}'].map(tag => {const isActive = layoutElements.some(el => el.content === tag);return (<button key={tag} onClick={() => handleAddTag(tag)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center ${isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm'}`}>{isActive ? <CheckCircle size={12} className="mr-2"/> : <PlusCircle size={12} className="mr-2"/>}{tag.replace(/{{|}}/g, '').replace('_', ' ').toUpperCase()}</button>);})}</div></div>
            <div className="lg:col-span-10 relative">{/* Canvas */}{selectedElementId && (<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 bg-brand-black text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-4 animate-fade-in-up"><span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ajustes:</span><div className="flex items-center gap-2"><Type size={14}/><input type="range" min="6" max="36" value={layoutElements.find(e => e.id === selectedElementId)?.style.fontSize || 12} onChange={(e) => updateSelectedStyle('fontSize', parseInt(e.target.value))} className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-orange"/><span className="text-xs font-mono w-6 text-right">{layoutElements.find(e => e.id === selectedElementId)?.style.fontSize}px</span></div><div className="w-px h-4 bg-gray-600"></div><div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: layoutElements.find(e => e.id === selectedElementId)?.style.color }}></div><input type="color" className="w-6 h-6 p-0 border-0 rounded bg-transparent cursor-pointer" value={layoutElements.find(e => e.id === selectedElementId)?.style.color} onChange={(e) => updateSelectedStyle('color', e.target.value)} /></div><div className="w-px h-4 bg-gray-600"></div><button onClick={() => handleDeleteElement(selectedElementId)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={16}/></button><button onClick={() => setSelectedElementId(null)} className="ml-2 text-gray-500 hover:text-white"><X size={16}/></button></div>)}<div className="relative overflow-hidden border-2 border-dashed border-gray-300 bg-gray-100 rounded-lg mx-auto shadow-inner transition-all select-none" style={{ width: '100%', maxWidth: '794px', aspectRatio: '210/70' }} onClick={() => setSelectedElementId(null)}>{backgroundUrl ? (<><img src={backgroundUrl} className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500 ${isAnalyzing ? 'opacity-50' : 'opacity-100'}`} style={{ objectFit: 'fill' }} />{isAnalyzing && (<div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-pulse"><Sparkles size={48} className="text-blue-500 mb-2"/><p className="text-blue-600 font-bold bg-white/80 px-4 py-1 rounded-full shadow">IA Analisando Layout...</p></div>)}</>) : (<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none"><ImageIcon size={48} className="mb-2 opacity-20"/><p className="text-sm font-bold">Área de Impressão (210mm x 70mm)</p><p className="text-xs">Carregue a arte para começar</p></div>)}{layoutElements.map(el => (<DraggableLabel key={el.id} el={el} isSelected={selectedElementId === el.id} onSelect={setSelectedElementId} onDragStop={handleDragStop} />))}</div></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border mt-8"><h3 className="font-bold text-gray-700 mb-4 flex items-center text-lg"><Grid size={20} className="mr-2"/> Meus Modelos Salvos</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{templates.map(t => (<div key={t.id} className={`border rounded-lg p-3 flex flex-col gap-3 hover:shadow-md transition-all ${editingTemplateId === t.id ? 'ring-2 ring-teal-500 bg-teal-50' : 'bg-white'}`}><div className="h-16 bg-gray-200 rounded overflow-hidden relative">{t.backgroundUrl ? (<img src={t.backgroundUrl} className="w-full h-full object-cover opacity-80" />) : (<div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon size={24}/></div>)}{t.isDefault && <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">PADRÃO</span>}</div><div><h4 className="font-bold text-sm text-gray-800 truncate" title={t.name}>{t.name}</h4><p className="text-[10px] text-gray-500">Criado em: {new Date(t.createdAt || '').toLocaleDateString('pt-BR')}</p></div><div className="flex gap-2 mt-auto pt-2 border-t"><button type="button" onClick={() => handleEditTemplate(t)} className="flex-1 py-1.5 bg-white border text-gray-600 rounded text-xs font-bold hover:bg-gray-50 flex justify-center items-center"><Edit2 size={12} className="mr-1"/> Editar</button><button type="button" onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 size={14}/></button>{!t.isDefault && (<button type="button" onClick={() => handleSetDefault(t.id)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Definir como Padrão"><CheckSquare size={14}/></button>)}</div></div>))}{templates.length === 0 && (<div className="col-span-full py-8 text-center text-gray-400 border border-dashed rounded-lg"><p>Nenhum modelo salvo.</p></div>)}</div></div></div>
  );

  const renderDashboard = () => {
      const daysInMonth = new Date(dashYear, dashMonth, 0).getDate();
      const monthlyTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'MISSOES') return false;
          if (t.status !== 'PAGO') return false;
          if (t.description.includes('CARNÊ')) return false;
          const tDate = new Date(t.date + 'T12:00:00');
          return (tDate.getMonth() + 1) === dashMonth && tDate.getFullYear() === dashYear;
      });
      const monthlyIn = monthlyTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const monthlyOut = monthlyTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const lastDayOfSelectedMonth = new Date(dashYear, dashMonth, 0).toISOString().split('T')[0];
      const cumulativeTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'MISSOES') return false;
          if (t.status !== 'PAGO') return false;
          if (t.description.includes('CARNÊ')) return false;
          return t.date <= lastDayOfSelectedMonth;
      });
      const totalInAllTime = cumulativeTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const totalOutAllTime = cumulativeTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const currentBalance = totalInAllTime - totalOutAllTime;
      const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, entradas: 0, saidas: 0 }));
      monthlyTransactions.forEach(t => {
          const tDate = new Date(t.date + 'T12:00:00');
          const dayIndex = tDate.getDate() - 1;
          if (dayIndex >= 0 && dayIndex < daysInMonth) {
              if (t.type === 'ENTRADA') dailyData[dayIndex].entradas += t.amount;
              else dailyData[dayIndex].saidas += t.amount;
          }
      });

      return (
          <div className="pb-12 w-full animate-fade-in relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                      <h2 className="text-lg font-bold text-gray-700">Visão Geral</h2>
                      {canManageTeam && <div className="mt-1"><button onClick={() => { setShowTeamModal(true); setTeamFormMode('LIST'); }} className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center" title="Editar Equipe"><Edit2 size={12} className="mr-1"/> Gerenciar Equipe de Missões</button></div>}
                  </div>
                  <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                      <div className="px-2 text-gray-400"><Calendar size={16}/></div>
                      <select value={dashMonth} onChange={(e) => setDashMonth(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer border-r border-gray-200">{Array.from({length: 12}, (_, i) => (<option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()}</option>))}</select>
                      <select value={dashYear} onChange={(e) => setDashYear(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 p-1 outline-none cursor-pointer pl-2"><option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500"><p className="text-xs text-gray-500 font-bold uppercase">ENTRADAS</p><p className="text-2xl font-black text-green-600">{formatCurrency(monthlyIn)}</p></div>
                  <div className="bg-white p-6 rounded-xl shadow border-l-4 border-red-500"><p className="text-xs text-gray-500 font-bold uppercase">SAÍDAS</p><p className="text-2xl font-black text-red-600">{formatCurrency(monthlyOut)}</p></div>
                  <div className="bg-white p-6 rounded-xl shadow border-l-4 border-gray-800"><p className="text-xs text-gray-500 font-bold uppercase">SALDO</p><p className="text-2xl font-black text-gray-800">{formatCurrency(currentBalance)}</p></div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                  <h3 className="font-bold text-gray-700 mb-4 flex items-center"><Globe className="mr-2 text-teal-600"/> Fluxo de Caixa Mensal ({new Date(0, dashMonth-1).toLocaleString('pt-BR', {month: 'long'}).toUpperCase()} / {dashYear})</h3>
                  <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient><linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="day" /><YAxis tickFormatter={(value) => `R$${value}`}/><CartesianGrid strokeDasharray="3 3" vertical={false} /><Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} /><Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" name="Entradas" /><Area type="monotone" dataKey="saidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidas)" name="Saídas" /></AreaChart></ResponsiveContainer></div>
              </div>
          </div>
      );
  };

  const renderSelectionView = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-fade-in">
        <div className="bg-teal-100 p-6 rounded-full">
            <Globe size={64} className="text-teal-600"/>
        </div>
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">Departamento de Missões</h1>
            <p className="text-gray-500 max-w-md">Gestão completa de ofertas missionárias, geração de carnês e relatórios financeiros.</p>
        </div>
        <button 
            onClick={() => setViewMode('DASHBOARD')}
            className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-teal-700 transition-all transform hover:scale-105 flex items-center"
        >
            <LayoutDashboard className="mr-2"/> Acessar Painel
        </button>
    </div>
  );

  const renderReports = () => {
      const filteredReportTransactions = transactions.filter(t => {
          if (t.churchId !== currentChurch?.id) return false;
          if (t.category !== 'MISSOES') return false;
          if (t.status !== 'PAGO') return false; 
          if (reportFilterType === 'MONTH') {
              const tDate = new Date(t.date + 'T12:00:00');
              return (tDate.getMonth() + 1) === repMonth && tDate.getFullYear() === repYear;
          } else {
              return t.date >= appliedRepStart && t.date <= appliedRepEnd;
          }
      });
      const totalIn = filteredReportTransactions.filter(t => t.type === 'ENTRADA').reduce((acc, t) => acc + t.amount, 0);
      const totalOut = filteredReportTransactions.filter(t => t.type === 'SAIDA').reduce((acc, t) => acc + t.amount, 0);
      const repBalance = totalIn - totalOut;
      const inflows = filteredReportTransactions.filter(t => t.type === 'ENTRADA');
      const outflows = filteredReportTransactions.filter(t => t.type === 'SAIDA');
      
      const applyDateFilter = () => { setAppliedRepStart(repStartDate); setAppliedRepEnd(repEndDate); };
      
      const generatePDFReport = () => {
        const doc = new jsPDF();
        const periodText = reportFilterType === 'MONTH' ? `${repMonth.toString().padStart(2, '0')}/${repYear}` : `${new Date(appliedRepStart).toLocaleDateString()} a ${new Date(appliedRepEnd).toLocaleDateString()}`;
        doc.setFontSize(18); doc.text("Relatório de Missões", 14, 20); doc.setFontSize(10); doc.text(`Período: ${periodText}`, 14, 26); doc.text(`Unidade: ${currentChurch?.name}`, 14, 32);
        
        if (reportViewMode === 'SUMMARY') {
            autoTable(doc, { startY: 40, head: [['Tipo', 'Valor']], body: [['Entradas (Ofertas/Carnês)', totalIn.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})], ['Saídas', totalOut.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})], ['Saldo Final', repBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})]] });
        } else {
             autoTable(doc, { 
                 startY: 40, 
                 head: [['Data', 'Descrição', 'Tipo', 'Valor']], 
                 body: filteredReportTransactions.map(t => {
                     const m = members.find(mem => mem.id === t.memberId);
                     const desc = m ? `${t.description} - ${m.name}` : t.description;
                     return [
                         new Date(t.date).toLocaleDateString('pt-BR'), 
                         desc, 
                         t.type, 
                         t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})
                     ];
                 }) 
             });
             const finalY = (doc as any).lastAutoTable.finalY + 10;
             doc.text(`Total Entradas: ${totalIn.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY); doc.text(`Total Saídas: ${totalOut.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY + 6); doc.text(`Saldo: ${repBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`, 14, finalY + 12);
        }
        doc.save(`Relatorio_Missoes_${periodText.replace(/\//g, '-')}.pdf`);
      };

      return (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-md flex flex-col gap-6 border border-gray-100">
                  <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                      <div><h2 className="text-2xl font-bold text-gray-800 flex items-center"><FileText className="mr-2 text-brand-orange"/> Relatórios</h2><p className="text-gray-500 text-sm">Unidade: <span className="font-semibold">{currentChurch?.name}</span></p></div>
                      <div className="flex bg-gray-100 p-1 rounded-lg"><button onClick={() => setReportViewMode('DETAILED')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'DETAILED' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}><FileText size={16} className="mr-2"/> Detalhado</button><button onClick={() => setReportViewMode('SUMMARY')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center ${reportViewMode === 'SUMMARY' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}><PieChart size={16} className="mr-2"/> Resumido</button></div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 w-full border-t pt-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 w-fit h-fit"><button onClick={() => setReportFilterType('MONTH')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${reportFilterType === 'MONTH' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Mensal</button><button onClick={() => setReportFilterType('PERIOD')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${reportFilterType === 'PERIOD' ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>Por Período</button></div>
                    <div className="flex flex-1 gap-2 items-center flex-wrap md:flex-nowrap">
                       {reportFilterType === 'MONTH' ? (<><select value={repMonth} onChange={e => setRepMonth(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>))}</select><select value={repYear} onChange={e => setRepYear(parseInt(e.target.value))} className="p-2 border rounded-lg bg-gray-50 focus:ring-brand-orange text-sm font-medium w-full md:w-auto h-[42px]"><option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select></>) : (<div className="flex items-center gap-2 w-full flex-wrap md:flex-nowrap"><div className="relative w-full md:w-auto flex-1"><span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">De</span><input type="date" className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]" value={repStartDate} onChange={e => setRepStartDate(e.target.value)}/></div><div className="relative w-full md:w-auto flex-1"><span className="absolute left-2 top-0.5 text-[9px] text-gray-500 font-bold uppercase">Até</span><input type="date" className="w-full pt-4 pb-1 px-2 border rounded-lg text-xs font-bold focus:ring-brand-orange h-[42px]" value={repEndDate} onChange={e => setRepEndDate(e.target.value)}/></div><button onClick={applyDateFilter} className="bg-brand-orange text-white px-4 h-[42px] rounded-lg font-bold text-sm hover:bg-brand-red flex items-center shadow-lg w-full md:w-auto justify-center"><Search size={16} className="mr-1"/> Pesquisar</button></div>)}
                       <button onClick={generatePDFReport} className="w-full md:w-auto ml-auto bg-brand-black text-white px-6 h-[42px] rounded-lg font-bold text-sm hover:bg-gray-800 flex items-center justify-center shadow-lg transition-transform hover:scale-105"><Download size={16} className="mr-2"/> Baixar PDF</button>
                    </div>
                  </div>
              </div>
              <div className="border-t-4 border-brand-orange rounded-t-xl bg-white shadow-lg p-6">
                  {reportViewMode === 'DETAILED' ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                              <div className="flex items-center mb-4 text-green-700 font-bold border-b pb-2 border-green-100"><TrendingUp className="mr-2"/> Entradas Detalhadas</div>
                              <div className="space-y-4">
                                  <div className="border rounded-lg overflow-hidden">
                                      <div className="bg-green-50 p-3 flex justify-between items-center border-b border-green-100"><span className="font-bold text-green-800 text-sm">Entradas</span><span className="text-xs font-bold text-green-600">Total: {formatCurrency(totalIn)}</span></div>
                                      <div className="bg-white">
                                          <table className="w-full text-left">
                                              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold"><tr><th className="p-2 w-20">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right w-24">Valor</th></tr></thead>
                                              <tbody className="divide-y divide-gray-100">
                                                  {inflows.map(t => {
                                                      const member = members.find(m => m.id === t.memberId);
                                                      return (
                                                      <tr key={t.id} className="text-xs hover:bg-gray-50">
                                                          <td className="p-2 text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                                          <td className="p-2 font-medium text-gray-800 uppercase text-xs">
                                                              {member ? `${t.description} - ${member.name}` : t.description}
                                                          </td>
                                                          <td className="p-2 text-right font-bold text-green-600">{formatCurrency(t.amount)}</td>
                                                      </tr>
                                                  )})}
                                                  {inflows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400 text-xs">Nenhum registro.</td></tr>}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div>
                              <div className="flex items-center mb-4 text-red-700 font-bold border-b pb-2 border-red-100"><TrendingDown className="mr-2"/> Saídas Detalhadas</div>
                              <div className="space-y-4">
                                  <div className="border rounded-lg overflow-hidden">
                                      <div className="bg-red-50 p-3 flex justify-between items-center border-b border-red-100"><span className="font-bold text-red-800 text-sm">Saídas</span><span className="text-xs font-bold text-red-600">Total: {formatCurrency(totalOut)}</span></div>
                                      <div className="bg-white">
                                          <table className="w-full text-left">
                                              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 font-bold"><tr><th className="p-2 w-20">Data</th><th className="p-2">Descrição</th><th className="p-2 text-right w-24">Valor</th></tr></thead>
                                              <tbody className="divide-y divide-gray-100">
                                                  {outflows.map(t => (
                                                      <tr key={t.id} className="text-xs hover:bg-gray-50">
                                                          <td className="p-2 text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                                          <td className="p-2 font-medium text-gray-800">{t.description}</td>
                                                          <td className="p-2 text-right font-bold text-red-600">{formatCurrency(t.amount)}</td>
                                                      </tr>
                                                  ))}
                                                  {outflows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400 text-xs">Nenhum registro.</td></tr>}
                                              </tbody>
                                          </table>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (<div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-green-50 p-6 rounded-lg border border-green-100"><p className="text-xs font-bold text-green-700 uppercase mb-2">Total de Entradas</p><p className="text-3xl font-black text-green-600">{formatCurrency(totalIn)}</p></div><div className="bg-red-50 p-6 rounded-lg border border-red-100"><p className="text-xs font-bold text-red-700 uppercase mb-2">Total de Saídas</p><p className="text-3xl font-black text-red-600">{formatCurrency(totalOut)}</p></div><div className="bg-gray-50 p-6 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-600 uppercase mb-2">Saldo Final</p><p className={`text-3xl font-black ${repBalance >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{formatCurrency(repBalance)}</p></div></div>)}
                  {reportViewMode === 'DETAILED' && (<div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="bg-green-100 p-4 rounded-lg flex justify-between items-center border border-green-200"><span className="font-bold text-green-800 text-sm uppercase">Total Entradas</span><span className="font-black text-green-900 text-lg">{formatCurrency(totalIn)}</span></div><div className="bg-red-100 p-4 rounded-lg flex justify-between items-center border border-red-200"><span className="font-bold text-red-800 text-sm uppercase">Total Saídas</span><span className="font-black text-red-900 text-lg">{formatCurrency(totalOut)}</span></div></div>)}
              </div>
          </div>
      );
  };

  const renderTeamTab = () => (
      <div className="bg-white p-6 rounded-xl shadow border">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700 flex items-center text-lg"><Users size={24} className="mr-2 text-teal-600"/> Equipe de Missões</h3>
              {teamFormMode === 'LIST' && (<button onClick={() => { setEditingUserId(null); setTeamFormData({ name: '', username: '', password: '', role: 'PRESIDENTE_MISSOES', cpf: '' }); setTeamFormMode('EDIT'); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow hover:bg-teal-700 transition-colors"><PlusCircle size={16} className="mr-2"/> Adicionar</button>)}
          </div>
          {teamFormMode === 'LIST' ? (
              <div className="space-y-3">
                {missionsUsers.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum membro na equipe.</p>}
                {missionsUsers.map(u => (
                  <div key={u.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                        <div className="h-10 w-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mr-3 font-bold"><UserIcon size={20}/></div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-500">@{u.username} • <span className="text-teal-600 font-semibold">{MISSIONS_ROLES.find(r => r.role === u.role)?.label}</span></p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleEditTeamMember(u)} className="p-2 text-gray-400 hover:text-teal-600 rounded-full"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteTeamMember(u.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
          ) : (
              <form onSubmit={handleSaveTeamMember} className="space-y-4 max-w-lg mx-auto bg-gray-50 p-6 rounded-xl border">
                  <h4 className="font-bold text-gray-700 border-b pb-2 mb-4">{editingUserId ? 'Editar Membro' : 'Novo Membro da Equipe'}</h4>
                  
                  <div className="relative" ref={wrapperRef}>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nome Completo</label>
                    <input 
                        required 
                        autoComplete="off"
                        className="w-full p-2.5 border rounded-lg uppercase text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                        value={teamFormData.name} 
                        onChange={e => {
                            setTeamFormData({...teamFormData, name: e.target.value.toUpperCase()});
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && teamFormData.name.length >= 2 && memberSuggestions.length > 0 && !editingUserId && (
                        <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                          {memberSuggestions.map((member) => (
                            <div 
                              key={member.id}
                              onClick={() => handleSelectMember(member)}
                              className="p-3 hover:bg-teal-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <p className="font-bold text-gray-800 text-xs">{member.name}</p>
                                <p className="text-[10px] text-gray-500">CPF: {member.cpf}</p>
                              </div>
                              <PlusCircle size={14} className="text-teal-600" />
                            </div>
                          ))}
                        </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Cargo</label>
                    <select 
                        className="w-full p-2.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        value={teamFormData.role}
                        onChange={e => setTeamFormData({...teamFormData, role: e.target.value as Role})}
                    >
                        {MISSIONS_ROLES.map(r => (
                            <option key={r.role} value={r.role}>{r.label}</option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Usuário (Login)</label>
                        <input 
                            required 
                            className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                            value={teamFormData.username} 
                            onChange={e => setTeamFormData({...teamFormData, username: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Senha {editingUserId && '(Opcional)'}</label>
                        <div className="relative">
                            <Key size={14} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                type="password" 
                                className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                                value={teamFormData.password} 
                                onChange={e => setTeamFormData({...teamFormData, password: e.target.value})}
                                required={!editingUserId}
                                placeholder={editingUserId ? "Manter atual" : ""}
                            />
                        </div>
                      </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">CPF (Opcional)</label>
                    <input 
                        className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
                        value={teamFormData.cpf} 
                        onChange={e => setTeamFormData({...teamFormData, cpf: e.target.value})}
                        maxLength={14}
                        placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setTeamFormMode('LIST')} className="flex-1 py-2.5 border rounded-lg text-sm font-bold text-gray-600 hover:bg-white transition-colors">Cancelar</button>
                      <button type="submit" className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-md">Salvar</button>
                  </div>
              </form>
          )}
      </div>
  );

  const renderTransactionTab = () => {
    // FILTRAR TRANSAÇÕES PARA REMOVER CARNÊS DA LISTA DE EXTRATO
    const generalTransactionsList = historyTransactions.filter(t => {
        const isNotCarnet = !t.description.includes('CARNÊ');
        const matchesType = historyFilterType === 'TODOS' ? true : t.type === historyFilterType;
        return isNotCarnet && matchesType;
    });

    const filteredMembersForTransaction = members.filter(m => m.churchId === currentChurch?.id && (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cpf.includes(searchTerm)));

    return (
    <div className="w-full space-y-3 md:space-y-6">
       <div className="flex flex-col md:flex-row gap-2 mb-2 md:mb-8"><div className="flex-1 flex gap-2"><button onClick={() => { handleCancelForm(); setSubTab('LISTA'); }} className={`flex-1 py-2 md:py-4 rounded-lg font-bold text-xs md:text-base transition-colors ${subTab === 'LISTA' ? 'bg-brand-black text-white' : 'bg-white text-gray-500 border'}`}>Extrato</button></div><div className="flex gap-2 flex-1"><button onClick={() => { setSubTab('ENTRADA'); setTransType('ENTRADA'); handleCancelForm(); setSubTab('ENTRADA'); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base transition-colors ${subTab === 'ENTRADA' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-200'}`}><PlusCircle size={14} /> Entrada</button><button onClick={() => { setSubTab('SAIDA'); setTransType('SAIDA'); handleCancelForm(); setSubTab('SAIDA'); }} className={`flex-1 py-2 md:py-4 rounded-lg flex justify-center items-center gap-1 font-bold text-xs md:text-base transition-colors ${subTab === 'SAIDA' ? 'bg-brand-red text-white' : 'bg-white text-brand-red border border-red-200'}`}><MinusCircle size={14} /> Saída</button></div></div>
       {subTab === 'LISTA' && (
           <div className="space-y-3 animate-fade-in">
               <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                       <button onClick={() => setShowHistoryFilters(!showHistoryFilters)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${showHistoryFilters || historyFilterType !== 'TODOS' ? 'bg-brand-black text-white border-brand-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                           <Filter size={14} /> <span>Filtros {historyFilterType !== 'TODOS' ? `(${historyFilterType === 'ENTRADA' ? 'Entradas' : 'Saídas'})` : ''}</span>
                       </button>
                   </div>
                   <div className="flex items-center bg-gray-50 rounded border border-gray-200 p-0.5"><select value={historyMonth} onChange={e => setHistoryMonth(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer outline-none">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</option>))}</select><select value={historyYear} onChange={e => setHistoryYear(parseInt(e.target.value))} className="bg-transparent border-none text-xs font-bold text-gray-700 py-1 pl-1 pr-6 cursor-pointer outline-none"><option value={2024}>2024</option><option value={2025}>2025</option><option value={2026}>2026</option></select></div>
               </div>
               
               {showHistoryFilters && (
                   <div className="w-full flex gap-2 overflow-x-auto pb-1 mt-2 border-t pt-2 animate-fade-in">
                       {[{ id: 'TODOS', label: 'Tudo' }, { id: 'ENTRADA', label: 'Entradas' }, { id: 'SAIDA', label: 'Saídas' }].map(f => (
                           <button key={f.id} onClick={() => { setHistoryFilterType(f.id as any); setShowHistoryFilters(false); }} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border whitespace-nowrap transition-colors ${historyFilterType === f.id ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{f.label}</button>
                       ))}
                   </div>
               )}

               <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Data</th><th className="px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Desc</th><th className="hidden md:table-cell px-2 py-2 text-left text-[9px] font-bold text-gray-500 uppercase">Cat</th><th className="px-2 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">Valor</th><th className="px-1 py-2 text-right text-[9px] font-bold text-gray-500 uppercase">.</th></tr></thead><tbody className="bg-white divide-y divide-gray-200">
               {generalTransactionsList.map(t => { 
                   const [year, month, day] = t.date.split('-').map(Number); 
                   const displayDate = new Date(year, month - 1, day).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}); 
                   // CORRECTION: Member lookup for list view
                   const member = members.find(m => m.id === t.memberId);
                   return (
                   <tr key={t.id} className="hover:bg-gray-50">
                       <td className="px-2 py-2 text-[10px] text-gray-600 whitespace-nowrap">{displayDate}</td>
                       <td className="px-2 py-2 text-[10px] font-medium text-gray-900 truncate max-w-[100px] md:max-w-none uppercase">
                           {member ? `${t.description} - ${member.name}` : t.description}
                       </td>
                       <td className="hidden md:table-cell px-2 py-2 text-xs"><span className={`px-1 rounded text-[10px] font-bold ${t.type === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.category}</span></td>
                       <td className={`px-2 py-2 text-[10px] font-bold text-right whitespace-nowrap ${t.type === 'ENTRADA' ? 'text-green-600' : 'text-brand-red'}`}>{t.type === 'ENTRADA' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                       <td className="px-1 py-2 text-right whitespace-nowrap"><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14}/></button></td>
                   </tr>
                   )})} 
               {generalTransactionsList.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400 text-xs">Sem lançamentos neste período.</td></tr>}</tbody></table></div></div>
           </div>
       )}
       {subTab === 'ENTRADA' && (<div className="bg-white rounded-xl shadow-md p-3 md:p-8 animate-fade-in-down"><h2 className="text-lg md:text-2xl font-bold mb-4 flex items-center">Nova Receita</h2><form onSubmit={handleTransactionSubmit} className="space-y-4"><div><label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Tipo de Entrada</label><div className="flex gap-2"><button type="button" className="flex-1 py-2 px-1 rounded border text-[10px] md:text-xs font-bold bg-green-600 text-white border-green-600">ENTRADA</button></div></div><div className="bg-orange-50 p-2 rounded-lg border border-orange-100"><label className="block text-xs font-bold text-gray-800 mb-1">Buscar Membro (Opcional)</label><div className="relative"><input type="text" placeholder="NOME..." className="w-full p-2 pl-8 border rounded-lg uppercase text-sm bg-white focus:ring-2 focus:ring-brand-orange outline-none" value={searchTerm} onChange={e => { setSearchTerm(e.target.value.toUpperCase()); if(selectedMemberId) setSelectedMemberId(''); }} /><Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>{searchTerm && <button type="button" onClick={() => {setSearchTerm(''); setSelectedMemberId('');}} className="absolute right-2 top-2.5 text-gray-400"><X size={16} /></button>}</div>{searchTerm && !selectedMemberId && (<div className="mt-1 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-10">{filteredMembersForTransaction.map(m => (<div key={m.id} onClick={() => handleMemberSelectForTransaction(m)} className="p-2 hover:bg-orange-100 cursor-pointer border-b text-xs"><span className="font-bold">{m.name}</span></div>))}</div>)}{selectedMemberId && (<div className="mt-1 text-green-700 text-xs font-bold flex items-center bg-green-50 p-1 rounded"><CheckCircle size={14} className="mr-2"/> {searchTerm}</div>)}</div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs md:text-sm font-medium text-gray-700">Valor (R$)</label><input type="number" step="0.01" required className="mt-1 w-full p-2 border rounded-lg font-bold" value={amount} onChange={e => setAmount(e.target.value)} /></div><div><label className="block text-xs md:text-sm font-medium text-gray-700">Data</label><input type="date" required className="mt-1 w-full p-2 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} /></div></div><div><label className="block text-xs md:text-sm font-medium text-gray-700">Comprovante</label><div className="mt-1 relative"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" id="entry-file-upload"/><label htmlFor="entry-file-upload" className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer ${selectedFile ? 'bg-orange-50 border-brand-orange' : 'border-gray-300'}`}>{selectedFile ? <span className="text-xs font-bold text-brand-orange truncate">{selectedFile.name}</span> : <span className="text-xs text-gray-500 flex items-center"><Upload size={14} className="mr-1"/> Anexar Arquivo</span>}</label></div></div><div className="flex gap-2 pt-2"><button type="button" onClick={handleCancelForm} className="flex-1 text-gray-500 font-bold py-2 border rounded-lg text-xs hover:bg-gray-50">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex-[2] py-2 rounded-lg font-bold text-white flex justify-center items-center text-sm bg-green-600 hover:bg-green-700 shadow-md">{isSubmitting ? <Loader className="animate-spin" size={16}/> : 'Salvar'}</button></div></form></div>)}
       {subTab === 'SAIDA' && (<div className="bg-white rounded-xl shadow-md p-3 md:p-8 animate-fade-in-down"><h2 className="text-lg md:text-2xl font-bold mb-4 flex items-center">Nova Despesa</h2><form onSubmit={handleTransactionSubmit} className="space-y-4"><div><label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Categoria da Saída</label><div className="w-full bg-brand-red text-white py-2 px-3 rounded text-xs font-bold text-center uppercase tracking-wider">DEPARTAMENTO DE MISSÕES</div></div><div><label className="block text-xs md:text-sm font-medium text-gray-700">Descrição / Motivo</label><input type="text" required placeholder="EX: AJUDA DE CUSTO MISSIONÁRIO" className="mt-1 w-full p-2 border rounded-lg uppercase text-sm focus:ring-brand-red focus:border-brand-red outline-none" value={desc} onChange={e => setDesc(e.target.value.toUpperCase())} /></div><div className="grid grid-cols-2 gap-3"><div><label className="block text-xs md:text-sm font-medium text-gray-700">Valor (R$)</label><input type="number" step="0.01" required className="mt-1 w-full p-2 border rounded-lg font-bold" value={amount} onChange={e => setAmount(e.target.value)} /></div><div><label className="block text-xs md:text-sm font-medium text-gray-700">Data</label><input type="date" required className="mt-1 w-full p-2 border rounded-lg" value={date} onChange={e => setDate(e.target.value)} /></div></div><div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg"><div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in"><input type="checkbox" name="toggle" id="recurring-toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300" style={{ right: isRecurring ? '0' : '50%', borderColor: isRecurring ? '#3b82f6' : '#9ca3af' }} checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} /><label htmlFor="recurring-toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${isRecurring ? 'bg-blue-500' : 'bg-gray-300'}`}></label></div><label htmlFor="recurring-toggle" className="text-xs font-bold text-gray-700 cursor-pointer flex items-center">Marcar como Gasto Fixo</label></div><div><label className="block text-xs md:text-sm font-medium text-gray-700">Comprovante</label><div className="mt-1 relative"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,.pdf" className="hidden" id="exit-file-upload"/><label htmlFor="exit-file-upload" className={`flex items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer ${selectedFile ? 'bg-orange-50 border-brand-orange' : 'border-gray-300'}`}>{selectedFile ? <span className="text-xs font-bold text-brand-orange truncate">{selectedFile.name}</span> : <span className="text-xs text-gray-500 flex items-center"><Upload size={14} className="mr-1"/> Anexar Arquivo</span>}</label></div></div><div className="flex gap-2 pt-2"><button type="button" onClick={handleCancelForm} className="flex-1 text-gray-500 font-bold py-2 border rounded-lg text-xs hover:bg-gray-50">Cancelar</button><button type="submit" disabled={isSubmitting} className="flex-[2] py-2 rounded-lg font-bold text-white flex justify-center items-center text-sm bg-brand-red hover:bg-red-700 shadow-md">{isSubmitting ? <Loader className="animate-spin" size={16}/> : 'Salvar'}</button></div></form></div>)}
    </div>
  );
  };

  const renderTeamModal = () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
             <button 
                onClick={() => setShowTeamModal(false)} 
                className="absolute top-4 right-4 z-50 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
            >
                <X size={20} className="text-gray-600"/>
            </button>
            {renderTeamTab()}
        </div>
    </div>
  );

  return (
    <>
        {modal.show && <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-xl text-white font-bold animate-fade-in-down ${modal.type === 'success' ? 'bg-green-600' : modal.type === 'info' ? 'bg-blue-600' : 'bg-red-600'}`}>{modal.msg}</div>}
        
        {showTeamModal && renderTeamModal()}
        
        {viewMode === 'SELECTION' ? renderSelectionView() : (
            <div className="space-y-6">
                {activeTab === 'DASHBOARD' && renderDashboard()}
                {activeTab === 'LANCAMENTOS' && renderTransactionTab()}
                {activeTab === 'CARNES' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow border">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center"><BookOpen className="mr-2"/> Gerador de Carnês</h3>
                            <div className="bg-blue-50 p-3 rounded text-blue-800 text-sm mb-4">Selecione um modelo visual e preencha os dados abaixo para gerar o PDF.</div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Selecione o Modelo de Impressão</label>
                                    <select 
                                        className="w-full p-2 border rounded bg-gray-50 text-sm"
                                        value={selectedGenTemplateId}
                                        onChange={e => setSelectedGenTemplateId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} {t.isDefault ? '(Padrão)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {templates.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum modelo cadastrado. Vá em "Config. Modelo" para criar.</p>}
                                </div>

                                <div className="relative">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Membro Contribuinte</label>
                                    <input type="text" className="w-full p-2 border rounded uppercase font-bold" placeholder="Digite o nome..." value={bookletSearchTerm} onChange={e => { setBookletSearchTerm(e.target.value.toUpperCase()); setBookletMemberId(''); }} />
                                    {bookletSearchTerm && !bookletMemberId && (<div className="absolute w-full bg-white shadow border mt-1 max-h-40 overflow-y-auto z-10">{filteredMembersForBooklet.map(m => (<div key={m.id} onClick={() => handleBookletMemberSelect(m)} className="p-2 hover:bg-gray-100 cursor-pointer text-xs font-bold">{m.name}</div>))}</div>)}
                                    {bookletMemberId && <div className="text-xs text-green-600 font-bold mt-1"><CheckCircle size={10} className="inline"/> {bookletSearchTerm}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-gray-500">Ano de Referência</label><input type="number" className="w-full p-2 border rounded" value={bookletYear} onChange={e => setBookletYear(parseInt(e.target.value))}/></div>
                                    <div><label className="text-xs font-bold text-gray-500">Valor Mensal (R$)</label><input type="number" step="0.01" className="w-full p-2 border rounded" value={bookletAmount} onChange={e => setBookletAmount(e.target.value)}/></div>
                                </div>
                            </div>
                            <button 
                                onClick={generateBookletPDF} 
                                disabled={isGenerating}
                                className="w-full py-3 mt-4 bg-brand-orange text-white rounded font-bold hover:bg-brand-red flex items-center justify-center disabled:opacity-70"
                            >
                                {isGenerating ? <Loader className="animate-spin mr-2" size={18}/> : <Download className="mr-2" />}
                                {isGenerating ? 'Gerando PDF...' : 'Gerar PDF do Carnê & Lançar'}
                            </button>
                        </div>
                        
                        {/* Histórico */}
                        <div className="bg-white p-6 rounded-xl shadow border">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4"><h3 className="font-bold text-gray-700 flex items-center"><History className="mr-2" /> Histórico de Carnês Gerados</h3><div className="flex gap-2"><div className="flex items-center bg-gray-50 border rounded p-1"><Calendar size={14} className="text-gray-400 ml-2 mr-1"/><select value={historyMonth} onChange={(e) => setHistoryMonth(Number(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 outline-none cursor-pointer">{Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', {month: 'short'}).toUpperCase()}</option>))}</select><select value={historyYear} onChange={(e) => setHistoryYear(Number(e.target.value))} className="bg-transparent text-sm font-bold text-gray-700 outline-none ml-2 border-l pl-2 cursor-pointer"><option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option></select></div></div></div><div className="relative mb-4"><input type="text" className="w-full p-2 pl-8 border rounded text-sm uppercase" placeholder="Filtrar por nome..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value.toUpperCase())} /><Search className="absolute left-2.5 top-2.5 text-gray-400" size={16}/></div><div className="overflow-x-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-300"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs sticky top-0"><tr><th className="px-3 py-2">Vencimento</th><th className="px-3 py-2">Membro / Descrição</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-center">Ações</th></tr></thead><tbody>{historyTransactions.map(t => { const tDate = new Date(t.date); const memberName = members.find(m => m.id === t.memberId)?.name || 'N/A'; return (<tr key={t.id} className="border-b last:border-0 hover:bg-gray-50"><td className="px-3 py-2 whitespace-nowrap text-gray-600">{tDate.getDate().toString().padStart(2, '0')}/{ (tDate.getMonth() + 1).toString().padStart(2, '0') }</td><td className="px-3 py-2"><div className="font-bold text-gray-800 text-xs">{memberName}</div><div className="text-[10px] text-gray-500">{t.description}</div></td><td className="px-3 py-2 text-right font-bold text-gray-700">R$ {t.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td><td className="px-3 py-2 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => handleReprintCarnet(t)} className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors" title="Baixar Carnê Completo"><Download size={14}/></button><button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Excluir Lançamento"><Trash2 size={14}/></button></div></td></tr>); })} {historyTransactions.length === 0 && (<tr><td colSpan={4} className="text-center py-6 text-gray-400 text-xs">Nenhum registro encontrado para este período.</td></tr>)}</tbody></table></div>
                        </div>
                    </div>
                )}
                {activeTab === 'CONFIG_MODELO' && renderVisualEditor()}
                {activeTab === 'RELATORIOS' && renderReports()}
                {activeTab === 'EQUIPE' && renderTeamTab()}
            </div>
        )}

        {/* CUSTOM CONFIRM MODAL (BLOCKING) */}
        {confirmModal.isOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
                <div className={`h-2 ${confirmModal.variant === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div className={`p-3 rounded-full mr-4 ${confirmModal.variant === 'danger' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-600'}`}>
                            <AlertTriangle size={24}/>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">{confirmModal.title}</h3>
                    </div>
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">{confirmModal.message}</p>
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancelar</button>
                        <button onClick={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); }} className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}>Confirmar</button>
                    </div>
                </div>
            </div>
            </div>
        )}
    </>
  );
};