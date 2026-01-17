
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { Member } from '../types';
import { 
  Search, Plus, Trash2, Edit2, User, Save, X, Building, ShieldAlert, MapPin, Loader, 
  Camera, Image, Phone, Mail, Eye, ZoomIn, Calendar, Hash, CheckCircle, CreditCard, Heart,
  AlertTriangle, Info
} from 'lucide-react';

export const Members: React.FC = () => {
  const { members, churches, user, addMember, updateMember, deleteMember, uploadMemberPhoto, currentChurch } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para visualização (Modal de Detalhes)
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  
  // Estado para Foto em Tamanho Grande (Lightbox)
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  
  // Estado para armazenar o arquivo selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CUSTOM CONFIRM/ALERT MODAL STATE ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
    showCancel: boolean;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    showCancel: false,
    onConfirm: undefined
  });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: false,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
    setModalState({
      isOpen: true,
      title,
      message,
      variant,
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  const canEdit = user?.role !== 'TESOUREIRO';
  const viewId = currentChurch?.id;

  // Form State
  const initialFormState = {
    name: '',
    cpf: '',
    birthDate: '',
    memberNumber: '',
    churchId: viewId || '', // Default to current viewed church
    isTither: false,
    baptismDate: '',
    email: '',
    phone: '',
    maritalStatus: 'SOLTEIRO', 
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '', // Novo campo Estado
    country: 'BRASIL',
    photo: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Helper: Mask CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  
  // Helper: Mask Phone (Celular e Fixo)
  // (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  const formatPhone = (value: string) => {
    let v = value.replace(/\D/g, "");
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
    v = v.replace(/(\d)(\d{4})$/, "$1-$2");
    return v;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  // Helper: ViaCEP Integration
  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro.toUpperCase(),
            neighborhood: data.bairro.toUpperCase(),
            city: data.localidade.toUpperCase(),
            state: data.uf.toUpperCase(), // Preenche o Estado (UF)
            country: 'BRASIL' // Garante que o país seja Brasil
          }));
        } else {
            showAlert("Atenção", "CEP não encontrado.", 'warning');
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic mask for CEP 00000-000
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    setFormData({ ...formData, zipCode: v });
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  // FILTER: Use ViewId & SORT ALPHABETICALLY
  const filteredMembers = members
    .filter(m => {
      const belongsToChurch = m.churchId === viewId;
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.cpf.includes(searchTerm) ||
        (m.memberNumber && m.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      return belongsToChurch && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleEdit = (member: Member) => {
    if(!canEdit) return;
    setEditingMemberId(member.id);
    setSelectedFile(null); // Reset file
    setFormData({
      name: member.name,
      cpf: member.cpf,
      birthDate: member.birthDate,
      memberNumber: member.memberNumber || '',
      churchId: member.churchId,
      isTither: member.isTither,
      baptismDate: member.baptismDate || '',
      email: member.email || '',
      phone: member.phone || '',
      maritalStatus: member.maritalStatus || 'SOLTEIRO',
      street: member.address.street,
      number: member.address.number,
      neighborhood: member.address.neighborhood,
      city: member.address.city,
      state: member.address.state || '', // Carrega o estado
      zipCode: member.address.zipCode,
      country: member.address.country || 'BRASIL',
      photo: member.photo || ''
    });
    setView('FORM');
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingMemberId(null);
    setSelectedFile(null);
    setIsSaving(false);
    setView('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canEdit) return;
    setIsSaving(true);
    
    // Validar duplicidade de CPF apenas na criação
    if (!editingMemberId) {
      const exists = members.find(m => m.cpf === formData.cpf && m.churchId === formData.churchId);
      if (exists) {
        showAlert("Erro de Cadastro", "Já existe um membro cadastrado com este CPF nesta unidade.", 'danger');
        setIsSaving(false);
        return;
      }
    }

    // 1. UPLOAD PHOTO IF SELECTED
    let finalPhotoUrl = formData.photo;
    
    if (selectedFile) {
        const uploadedUrl = await uploadMemberPhoto(selectedFile);
        if (uploadedUrl) {
            finalPhotoUrl = uploadedUrl;
        } else {
            showAlert("Aviso", "Não foi possível fazer o upload da foto. O membro será salvo sem a nova imagem.", 'warning');
        }
    }

    const memberPayload: Member = {
      id: editingMemberId || '', 
      name: formData.name.toUpperCase(),
      cpf: formData.cpf,
      birthDate: formData.birthDate,
      memberNumber: formData.memberNumber.toUpperCase(),
      churchId: formData.churchId,
      isTither: formData.isTither,
      baptismDate: formData.baptismDate,
      photo: finalPhotoUrl,
      email: formData.email.toLowerCase(),
      phone: formData.phone,
      maritalStatus: formData.maritalStatus,
      address: {
        street: formData.street.toUpperCase(),
        number: formData.number.toUpperCase(),
        neighborhood: formData.neighborhood.toUpperCase(),
        city: formData.city.toUpperCase(),
        state: formData.state.toUpperCase(), // Salva o estado
        zipCode: formData.zipCode,
        country: formData.country.toUpperCase()
      }
    };

    let result;

    if (editingMemberId) {
      result = await updateMember(editingMemberId, memberPayload);
    } else {
      result = await addMember(memberPayload);
    }

    setIsSaving(false);

    if (result.success) {
        showAlert('Sucesso', editingMemberId ? "Membro atualizado com sucesso!" : "Membro cadastrado com sucesso!", 'success');
        handleCancel();
    } else {
        showAlert('Erro', `Erro ao salvar membro: ${result.error || 'Verifique sua conexão ou contate o suporte.'}`, 'danger');
    }
  };

  const handleConfirmDelete = (member: Member) => {
      showConfirm(
          'Excluir Membro',
          `Tem certeza que deseja excluir o membro "${member.name}"?\n\nEsta ação é irreversível.`,
          () => deleteMember(member.id),
          'danger'
      );
  };

  if (!viewId) return <div>Carregando unidade...</div>;

  // RENDER: Lightbox de Foto (Zoom)
  const renderPhotoLightbox = () => {
      if (!enlargedPhoto) return null;
      return (
          <div 
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setEnlargedPhoto(null)}
          >
             <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                 <X size={32}/>
             </button>
             <img 
               src={enlargedPhoto} 
               alt="Zoom" 
               className="max-h-full max-w-full rounded-lg shadow-2xl object-contain animate-fade-in-down"
               onClick={(e) => e.stopPropagation()} // Impede fechar se clicar na imagem
             />
          </div>
      );
  };

  // RENDER: Modal de Visualização de Detalhes
  const renderDetailsModal = () => {
    if (!viewingMember) return null;
    
    // Helper para formatar data
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : 'Não informado';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in-down overflow-y-auto">
        {/* LARGURA AUMENTADA PARA max-w-4xl */}
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col relative my-8">
          
          {/* Header com Capa Colorida */}
          <div className="h-32 bg-gradient-to-r from-brand-orange via-red-500 to-brand-red relative shrink-0">
             <button onClick={() => setViewingMember(null)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-colors">
               <X size={20}/>
             </button>
          </div>
          
          <div className="px-8 pb-8">
             <div className="flex flex-col md:flex-row items-start mb-8">
                {/* Foto (Sobrepondo o Header) */}
                <div 
                   className="-mt-12 h-32 w-32 rounded-full border-4 border-white bg-gray-100 shadow-lg overflow-hidden cursor-zoom-in group relative shrink-0 z-10"
                   onClick={() => viewingMember.photo && setEnlargedPhoto(viewingMember.photo)}
                >
                    {viewingMember.photo ? (
                        <img src={viewingMember.photo} alt={viewingMember.name} className="h-full w-full object-cover"/>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400"><User size={48}/></div>
                    )}
                    {viewingMember.photo && (
                       <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="text-white" size={24}/>
                       </div>
                    )}
                </div>

                {/* Nome e Badges */}
                <div className="mt-4 md:mt-0 md:ml-6 flex-1 min-w-0">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight mb-2 uppercase break-words">
                        {viewingMember.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 items-center">
                         <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                            CPF: {viewingMember.cpf}
                         </span>
                         {viewingMember.isTither ? (
                             <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center">
                                 <CheckCircle size={12} className="mr-1"/> Dizimista Ativo
                             </span>
                         ) : (
                             <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                                 Membro Comum
                             </span>
                         )}
                    </div>
                </div>

                {/* Botão Editar */}
                {canEdit && (
                   <button 
                     onClick={() => { setViewingMember(null); handleEdit(viewingMember); }}
                     className="mt-4 md:mt-0 md:ml-6 bg-brand-orange hover:bg-brand-red text-white px-4 py-2 rounded-lg flex items-center text-sm font-bold shadow-md transition-colors shrink-0"
                   >
                     <Edit2 size={16} className="mr-2"/> Editar Dados
                   </button>
                )}
             </div>

             {/* GRID DE INFORMAÇÕES (2 Colunas) */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
                
                {/* COLUNA ESQUERDA: Dados Pessoais e Contato */}
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 h-full">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                            <User size={16} className="mr-2"/> Dados Pessoais & Contato
                        </h3>
                        <div className="space-y-4">
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Calendar size={18} className="text-brand-orange mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Data de Nascimento</p>
                                    <p className="text-gray-800 font-medium">{formatDate(viewingMember.birthDate)}</p>
                                </div>
                             </div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Heart size={18} className="text-brand-orange mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Estado Civil</p>
                                    <p className="text-gray-800 font-medium">{viewingMember.maritalStatus || 'Não Informado'}</p>
                                </div>
                             </div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Hash size={18} className="text-brand-orange mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Nº de Membro</p>
                                    <p className="text-gray-800 font-medium">{viewingMember.memberNumber || 'Não Registrado'}</p>
                                </div>
                             </div>
                             <div className="border-t border-gray-200 my-2"></div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Phone size={18} className="text-blue-500 mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Telefone / Celular</p>
                                    <p className="text-gray-800 font-medium">{viewingMember.phone || '-'}</p>
                                </div>
                             </div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Mail size={18} className="text-blue-500 mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Email</p>
                                    <p className="text-gray-800 font-medium lowercase">{viewingMember.email || '-'}</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: Eclesiástico e Endereço */}
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                            <Building size={16} className="mr-2"/> Dados Eclesiásticos
                        </h3>
                        <div className="space-y-4">
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><CreditCard size={18} className="text-green-600 mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Situação</p>
                                    <p className={`font-medium ${viewingMember.isTither ? 'text-green-600' : 'text-gray-600'}`}>
                                        {viewingMember.isTither ? 'Dizimista Fiel' : 'Membro Comum'}
                                    </p>
                                </div>
                             </div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Building size={18} className="text-purple-600 mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Data de Batismo</p>
                                    <p className="text-gray-800 font-medium">{formatDate(viewingMember.baptismDate)}</p>
                                </div>
                             </div>
                             <div className="flex items-start">
                                <div className="min-w-[30px]"><Building size={18} className="text-purple-600 mt-0.5"/></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Unidade Vinculada</p>
                                    <p className="text-gray-800 font-medium">{currentChurch?.name}</p>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                            <MapPin size={16} className="mr-2"/> Endereço
                        </h3>
                        <div className="flex items-start">
                            <div className="min-w-[30px]"><MapPin size={18} className="text-red-500 mt-0.5"/></div>
                            <div className="w-full">
                                <p className="text-gray-800 font-bold">
                                    {viewingMember.address.street}, {viewingMember.address.number}
                                </p>
                                <p className="text-gray-600 text-sm">
                                    {viewingMember.address.neighborhood}
                                </p>
                                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Cidade / UF</p>
                                        <p className="text-gray-800 text-sm">
                                            {viewingMember.address.city} 
                                            {viewingMember.address.state ? ` / ${viewingMember.address.state}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">CEP</p>
                                        <p className="text-gray-800 text-sm">{viewingMember.address.zipCode || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-4 md:space-y-6 pl-10 md:pl-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Membros</h2>
          <p className="text-gray-500 text-xs md:text-sm">{currentChurch?.name}</p>
          {!canEdit && (
            <div className="flex items-center text-[10px] md:text-xs font-bold text-brand-orange uppercase bg-orange-50 px-2 py-1 rounded border border-orange-200 mt-1 w-fit">
              <ShieldAlert size={14} className="mr-1"/> Apenas Visualização
            </div>
          )}
        </div>
        {canEdit && (
          <button onClick={() => { setEditingMemberId(null); setSelectedFile(null); setFormData({...initialFormState, churchId: viewId}); setView('FORM'); }} className="bg-brand-black text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-gray-800 transition-colors text-sm w-full md:w-auto justify-center">
            <Plus size={18} className="mr-2"/> Novo Membro
          </button>
        )}
      </div>

      <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border flex items-center">
        <Search className="text-gray-400 mr-2" size={20} />
        <input 
          type="text" 
          placeholder="BUSCAR NOME, CPF..." 
          className="flex-1 outline-none uppercase text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value.toUpperCase())}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome / CPF</th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dizimista?</th>
              <th className="px-3 py-2 md:px-6 md:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {member.memberNumber || '-'}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {/* FOTO CLICÁVEL -> LIGHTBOX */}
                    <div 
                        className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-300 cursor-zoom-in hover:ring-2 hover:ring-brand-orange transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            if(member.photo) setEnlargedPhoto(member.photo);
                        }}
                    >
                       {member.photo ? (
                           <img src={member.photo} alt={member.name} className="h-full w-full object-cover"/>
                       ) : (
                           <User size={16} className="text-gray-500 md:w-5 md:h-5"/>
                       )}
                    </div>
                    
                    {/* NOME CLICÁVEL -> DETALHES */}
                    <div className="ml-3 md:ml-4 cursor-pointer group" onClick={() => setViewingMember(member)}>
                      <div className="text-sm font-medium text-gray-900 group-hover:text-brand-orange group-hover:underline">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.cpf}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                   {member.phone ? (
                       <span className="text-xs text-gray-600 flex items-center"><Phone size={12} className="mr-1"/>{member.phone}</span>
                   ) : <span className="text-gray-300 text-xs">-</span>}
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                  {member.isTither ? (
                    <span className="text-green-600 font-bold text-sm flex items-center"><span className="w-2 h-2 rounded-full bg-green-600 mr-2"></span>Sim</span>
                  ) : (
                    <span className="text-gray-400 text-sm">Não</span>
                  )}
                </td>
                <td className="px-3 py-3 md:px-6 md:py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canEdit ? (
                    <div className="flex justify-end items-center">
                      <button onClick={() => handleEdit(member)} className="text-brand-orange hover:text-brand-red mr-3 md:mr-4 transition-colors p-1" title="Editar">
                        <Edit2 size={18}/>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleConfirmDelete(member);
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors cursor-pointer p-1 rounded hover:bg-red-50" 
                        title="Excluir"
                      >
                        <Trash2 size={18} className="pointer-events-none"/>
                      </button>
                    </div>
                  ) : (
                     <button onClick={() => setViewingMember(member)} className="text-gray-400 hover:text-gray-800 p-1" title="Ver Detalhes">
                         <Eye size={18}/>
                     </button>
                  )}
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum membro encontrado.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* GLOBAL CONFIRM/ALERT MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
             {/* Header Colorido baseado no tipo */}
             <div className={`h-2 ${
               modalState.variant === 'danger' ? 'bg-red-500' : 
               modalState.variant === 'warning' ? 'bg-yellow-500' : 
               modalState.variant === 'success' ? 'bg-green-500' : 
               'bg-blue-500'
             }`}></div>

             <div className="p-6">
                <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-full mr-4 ${
                         modalState.variant === 'danger' ? 'bg-red-100 text-red-500' : 
                         modalState.variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : 
                         modalState.variant === 'success' ? 'bg-green-100 text-green-600' : 
                         'bg-blue-100 text-blue-600'
                    }`}>
                        {modalState.variant === 'danger' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'warning' && <AlertTriangle size={24}/>}
                        {modalState.variant === 'success' && <CheckCircle size={24}/>}
                        {modalState.variant === 'info' && <Info size={24}/>}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{modalState.title}</h3>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-line pl-[3.5rem] -mt-2">
                    {modalState.message}
                </p>

                <div className="flex justify-end space-x-3">
                    {modalState.showCancel && (
                        <button 
                            onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (modalState.onConfirm) modalState.onConfirm();
                            else setModalState(prev => ({ ...prev, isOpen: false }));
                        }}
                        className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${
                            modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                            modalState.variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                            modalState.variant === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                            'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {modalState.showCancel ? 'Confirmar' : 'OK'}
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Lightbox e Modal Renderizados aqui */}
      {renderPhotoLightbox()}
      {renderDetailsModal()}
    </div>
  );

  const renderForm = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden pl-10 md:pl-0">
      <div className="bg-brand-black p-4 md:p-6 flex justify-between items-center">
        <h2 className="text-lg md:text-xl font-bold text-white">
          {editingMemberId ? 'Editar Membro' : 'Cadastro de Membro'}
        </h2>
        <button onClick={handleCancel} className="text-gray-400 hover:text-white transition-colors"><X/></button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6 md:space-y-8">
        
        {/* BLOCO 0: FOTO DO PERFIL (UPLOAD) */}
        <div className="flex flex-col items-center justify-center mb-6">
            <div 
                className="h-32 w-32 rounded-full border-4 border-gray-100 shadow-md bg-gray-50 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                onClick={triggerFileInput}
            >
                {/* Mostra a foto: Ou a nova selecionada (blob) ou a antiga (URL) ou placeholder */}
                {selectedFile ? (
                     <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-cover" />
                ) : formData.photo ? (
                    <img src={formData.photo} alt="Current" className="h-full w-full object-cover" />
                ) : (
                    <User size={48} className="text-gray-300" />
                )}

                {/* Overlay de Câmera */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="mb-1"/>
                    <span className="text-[10px] font-bold uppercase">Alterar</span>
                </div>
            </div>
            
            {/* Hidden Input File */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
            />
            
            <button type="button" onClick={triggerFileInput} className="mt-3 text-brand-orange text-sm font-bold hover:underline">
                {formData.photo || selectedFile ? 'Trocar Foto' : 'Adicionar Foto'}
            </button>
        </div>

        {/* BLOCO 1: DADOS PESSOAIS */}
        <div>
           <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center"><User size={20} className="mr-2 text-brand-orange"/> Dados Pessoais</h3>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
             <div className="md:col-span-3">
               <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
               <input 
                 type="text" 
                 required 
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange uppercase"
                 value={formData.name}
                 onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Nº Membro (Opcional)</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange bg-gray-50 uppercase"
                 placeholder="Auto/Manual"
                 value={formData.memberNumber}
                 onChange={e => setFormData({...formData, memberNumber: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700">CPF</label>
               <input 
                 type="text" 
                 required 
                 placeholder="000.000.000-00"
                 maxLength={14}
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                 value={formData.cpf}
                 onChange={handleCpfChange}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
               <input 
                 type="date" 
                 required 
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                 value={formData.birthDate}
                 onChange={e => setFormData({...formData, birthDate: e.target.value})}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Estado Civil</label>
               <select
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange bg-white"
                 value={formData.maritalStatus}
                 onChange={e => setFormData({...formData, maritalStatus: e.target.value})}
               >
                 <option value="SOLTEIRO">SOLTEIRO(A)</option>
                 <option value="CASADO">CASADO(A)</option>
                 <option value="VIUVO">VIÚVO(A)</option>
                 <option value="DIVORCIADO">DIVORCIADO(A)</option>
                 <option value="SEPARADO">SEPARADO(A)</option>
               </select>
             </div>
           </div>
        </div>
        
        {/* BLOCO 2: CONTATOS (NOVO) */}
        <div>
           <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center"><Phone size={20} className="mr-2 text-brand-orange"/> Contato</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-700">Telefone / Celular</label>
               <input 
                 type="text" 
                 placeholder="(XX) XXXXX-XXXX"
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                 value={formData.phone}
                 onChange={handlePhoneChange}
                 maxLength={15}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700">Email</label>
               <input 
                 type="email" 
                 placeholder="exemplo@email.com"
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange lowercase"
                 value={formData.email}
                 onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}
               />
             </div>
           </div>
        </div>

        {/* BLOCO 3: VÍNCULO INSTITUCIONAL */}
        <div>
           <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center"><Building size={20} className="mr-2 text-brand-orange"/> Vínculo Institucional</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-700">Igreja / Congregação</label>
               <div className="mt-1 relative rounded-md shadow-sm">
                 <select 
                   required
                   disabled
                   className="block w-full p-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 sm:text-sm"
                   value={formData.churchId}
                   onChange={e => setFormData({...formData, churchId: e.target.value})}
                 >
                   {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Data de Batismo (Opcional)</label>
                <input 
                 type="date" 
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                 value={formData.baptismDate}
                 onChange={e => setFormData({...formData, baptismDate: e.target.value})}
               />
             </div>
             <div className="flex items-center space-x-4">
                <div className="flex items-center bg-orange-50 p-3 rounded-lg border border-orange-100 w-full">
                  <input 
                    type="checkbox" 
                    id="isTither"
                    className="h-5 w-5 text-brand-orange focus:ring-brand-orange border-gray-300 rounded cursor-pointer"
                    checked={formData.isTither}
                    onChange={e => setFormData({...formData, isTither: e.target.checked})}
                  />
                  <label htmlFor="isTither" className="ml-3 block text-sm text-gray-900 font-bold cursor-pointer">Membro Dizimista?</label>
                </div>
             </div>
           </div>
        </div>

        {/* BLOCO 4: ENDEREÇO */}
        <div>
           <h3 className="text-base md:text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center"><MapPin size={20} className="mr-2 text-brand-orange"/> Endereço</h3>
           <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
             <div className="md:col-span-2 relative">
               <label className="block text-sm font-medium text-gray-700">CEP</label>
               <div className="relative">
                <input 
                    type="text"
                    maxLength={9}
                    placeholder="00000-000" 
                    className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                    value={formData.zipCode}
                    onChange={handleCepChange}
                    onBlur={handleCepBlur}
                />
                {isLoadingCep && <div className="absolute right-2 top-2"><Loader className="animate-spin text-brand-orange" size={20}/></div>}
               </div>
             </div>
             <div className="md:col-span-4">
               <label className="block text-sm font-medium text-gray-700">Rua / Logradouro</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md bg-gray-50 uppercase"
                 value={formData.street}
                 onChange={e => setFormData({...formData, street: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Número</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md uppercase"
                 value={formData.number}
                 onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700">Bairro</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md bg-gray-50 uppercase"
                 value={formData.neighborhood}
                 onChange={e => setFormData({...formData, neighborhood: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700">Cidade</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md bg-gray-50 uppercase"
                 value={formData.city}
                 onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">Estado (UF)</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md bg-gray-50 uppercase"
                 value={formData.state}
                 maxLength={2}
                 placeholder="UF"
                 onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
               />
             </div>
             <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700">País</label>
               <input 
                 type="text" 
                 className="mt-1 block w-full p-2 border rounded-md uppercase"
                 value={formData.country}
                 onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})}
               />
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row justify-end pt-4 space-y-2 md:space-y-0 md:space-x-4 border-t">
           <button type="button" onClick={handleCancel} disabled={isSaving} className="px-6 py-2 border rounded-lg hover:bg-gray-50 w-full md:w-auto">Cancelar</button>
           <button type="submit" disabled={isSaving} className={`px-6 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-red shadow-lg transition-transform hover:scale-105 w-full md:w-auto flex items-center justify-center ${isSaving ? 'opacity-70 cursor-wait' : ''}`}>
             {isSaving ? <Loader className="animate-spin mr-2" size={20}/> : <Save size={20} className="mr-2 inline" />} 
             {isSaving ? 'Salvando...' : 'Salvar Membro'}
           </button>
        </div>
      </form>
    </div>
  );

  return view === 'LIST' ? renderList() : renderForm();
};
