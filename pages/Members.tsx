
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { Member } from '../types';
import { 
  Search, Plus, Trash2, Edit2, User, Save, X, Phone, Mail, ZoomIn, 
  CheckCircle, Camera, Loader, MapPin, Calendar, Hash, Flag, Lock, Key, Info
} from 'lucide-react';

export const Members: React.FC = () => {
  const { members, churches, user, addMember, updateMember, deleteMember, uploadMemberPhoto, currentChurch, updateUserCredentials } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CUSTOM CONFIRM/ALERT MODAL STATE ---
  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'success' | 'info'; showCancel: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'info', showCancel: false, onConfirm: undefined });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: false, onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: true, onConfirm: () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } });
  };
  
  const canEdit = user?.role !== 'TESOUREIRO';
  const viewId = currentChurch?.id;

  // Estado adicional para mudança de senha
  const [newPassword, setNewPassword] = useState('');

  const initialFormState = {
    name: '', cpf: '', birthDate: '', memberNumber: '', churchId: viewId || '', isTither: false, baptismDate: '', email: '', phone: '', maritalStatus: 'SOLTEIRO', 
    zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '', country: '', photo: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const formatCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const formatPhone = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2");

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cpf: formatCPF(e.target.value) });
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: formatPhone(e.target.value) });

  const handleCepBlur = async () => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev, street: data.logradouro.toUpperCase(), neighborhood: data.bairro.toUpperCase(), city: data.localidade.toUpperCase(), state: data.uf.toUpperCase(), country: 'BRASIL'
          }));
        }
      } catch (error) {} finally { setIsLoadingCep(false); }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    setFormData({ ...formData, zipCode: v });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const triggerFileInput = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const filteredMembers = members
    .filter(m => m.churchId === viewId && (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cpf.includes(searchTerm)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleEdit = (member: Member) => {
    if(!canEdit && member.id !== user?.id) return; // Permite edição se for o próprio usuário
    
    setEditingMemberId(member.id);
    setSelectedFile(null);
    setNewPassword(''); // Reseta senha
    setFormData({
      name: member.name, cpf: member.cpf, birthDate: member.birthDate, memberNumber: member.memberNumber || '', churchId: member.churchId, isTither: member.isTither,
      baptismDate: member.baptismDate || '', email: member.email || '', phone: member.phone || '', maritalStatus: member.maritalStatus || 'SOLTEIRO',
      street: member.address.street, number: member.address.number, neighborhood: member.address.neighborhood, city: member.address.city, state: member.address.state || '',
      zipCode: member.address.zipCode, country: member.address.country || 'BRASIL', photo: member.photo || ''
    });
    setView('FORM');
  };

  const handleCancel = () => {
    setFormData(initialFormState); setEditingMemberId(null); setSelectedFile(null); setNewPassword(''); setIsSaving(false); setView('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canEdit && editingMemberId !== user?.id) return; // Segurança extra
    setIsSaving(true);
    
    if (!editingMemberId) {
      const exists = members.find(m => m.cpf === formData.cpf && m.churchId === formData.churchId);
      if (exists) { showAlert("Erro", "Já existe um membro com este CPF.", 'danger'); setIsSaving(false); return; }
    }

    let finalPhotoUrl = formData.photo;
    if (selectedFile) {
        const uploadedUrl = await uploadMemberPhoto(selectedFile);
        if (uploadedUrl) finalPhotoUrl = uploadedUrl;
    }

    const payload: Member = {
      id: editingMemberId || '', name: formData.name.toUpperCase(), cpf: formData.cpf, birthDate: formData.birthDate, memberNumber: formData.memberNumber.toUpperCase(),
      churchId: formData.churchId, isTither: formData.isTither, baptismDate: formData.baptismDate, photo: finalPhotoUrl, email: formData.email.toLowerCase(),
      phone: formData.phone, maritalStatus: formData.maritalStatus, address: {
        street: formData.street.toUpperCase(), number: formData.number.toUpperCase(), neighborhood: formData.neighborhood.toUpperCase(), city: formData.city.toUpperCase(),
        state: formData.state.toUpperCase(), zipCode: formData.zipCode, country: formData.country.toUpperCase()
      }
    };

    const result = editingMemberId ? await updateMember(editingMemberId, payload) : await addMember(payload);
    
    // Se for o próprio usuário e houver nova senha, atualiza a credencial
    if (editingMemberId && editingMemberId === user?.id && newPassword.trim() !== '') {
        await updateUserCredentials(user.id, undefined, newPassword.trim());
        showAlert('Atualizado', 'Seus dados e sua senha foram atualizados com sucesso!', 'success');
    } else if (result.success) {
        showAlert('Sucesso', "Salvo com sucesso!", 'success');
    } else {
        showAlert('Erro', result.error || 'Erro desconhecido', 'danger');
    }

    setIsSaving(false);
    if(result.success) handleCancel();
  };

  const handleConfirmDelete = (member: Member) => {
      showConfirm('Excluir', `Excluir membro "${member.name}"?`, () => deleteMember(member.id), 'danger');
  };

  if (!viewId) return <div>...</div>;

  const renderPhotoLightbox = () => {
      if (!enlargedPhoto) return null;
      return (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-pointer" onClick={() => setEnlargedPhoto(null)}>
             <button className="absolute top-4 right-4 text-white"><X size={32}/></button>
             <img src={enlargedPhoto} alt="Zoom" className="max-h-full max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
      );
  };

  const renderDetailsModal = () => {
    if (!viewingMember) return null;
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
    // Verifica se é o próprio usuário para permitir "Editar Perfil"
    const isSelf = viewingMember.id === user?.id;
    const canModify = canEdit || isSelf;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative max-h-[90vh] overflow-y-auto">
          {/* HEADER MAIS COMPACTO */}
          <div className="h-16 bg-brand-orange relative">
             <button onClick={() => setViewingMember(null)} className="absolute top-2 right-2 bg-black/20 text-white rounded-full p-1 z-20 hover:bg-black/40 transition-colors"><X size={18}/></button>
          </div>
          <div className="px-4 pb-6 -mt-8">
             <div className="flex flex-col items-center">
                {/* FOTO MENOR E COM Z-INDEX */}
                <div className="h-20 w-20 rounded-full border-4 border-white bg-gray-200 overflow-hidden relative z-10 shadow-md cursor-pointer" onClick={() => viewingMember.photo && setEnlargedPhoto(viewingMember.photo)}>
                    {viewingMember.photo ? <img src={viewingMember.photo} className="h-full w-full object-cover"/> : <User size={32} className="m-auto mt-4 text-gray-400"/>}
                </div>
                <h2 className="text-lg font-bold text-center mt-2 leading-tight text-gray-800">{viewingMember.name}</h2>
                <div className="flex gap-2 mt-1 flex-wrap justify-center">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-600 border font-medium">CPF: {viewingMember.cpf}</span>
                    {viewingMember.isTither && <span className="text-[10px] bg-green-100 px-2 py-0.5 rounded-full text-green-700 border border-green-200 font-bold">Dizimista</span>}
                </div>
                {canModify && <button onClick={() => { setViewingMember(null); handleEdit(viewingMember); }} className="mt-2 text-xs bg-white hover:bg-gray-50 border border-gray-300 px-3 py-1 rounded shadow-sm transition-colors text-gray-700 font-bold flex items-center"><Edit2 size={12} className="mr-1"/> {isSelf ? 'Editar Meu Perfil' : 'Editar Dados'}</button>}
             </div>
             
             {/* LISTA DE DADOS COMPACTA */}
             <div className="mt-4 space-y-2 text-xs">
                 <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Contato</p>
                    <div className="grid grid-cols-1 gap-1">
                        <p className="flex items-center text-gray-700 font-medium"><Phone size={12} className="mr-2 text-blue-500"/> {viewingMember.phone || '-'}</p>
                        {viewingMember.email && <p className="flex items-center text-gray-700 font-medium truncate"><Mail size={12} className="mr-2 text-gray-500"/> {viewingMember.email}</p>}
                    </div>
                 </div>
                 <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Pessoal / Eclesiástico</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-[10px] text-gray-500 block">Nascimento</span> <span className="font-medium text-gray-800">{formatDate(viewingMember.birthDate)}</span></div>
                        <div><span className="text-[10px] text-gray-500 block">Batismo</span> <span className="font-medium text-gray-800">{formatDate(viewingMember.baptismDate)}</span></div>
                        <div><span className="text-[10px] text-gray-500 block">Est. Civil</span> <span className="font-medium text-gray-800">{viewingMember.maritalStatus || '-'}</span></div>
                        {viewingMember.memberNumber && <div><span className="text-[10px] text-gray-500 block">Nº Membro</span> <span className="font-medium text-gray-800">{viewingMember.memberNumber}</span></div>}
                    </div>
                 </div>
                 <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Endereço</p>
                    <p className="font-medium text-gray-800 leading-tight">{viewingMember.address.street}, {viewingMember.address.number}</p>
                    <p className="text-gray-500 mt-0.5">
                       {viewingMember.address.neighborhood} - {viewingMember.address.city}/{viewingMember.address.state}
                       {viewingMember.address.country && viewingMember.address.country !== 'BRASIL' ? ` (${viewingMember.address.country})` : ''}
                    </p>
                 </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Membros</h2>
          <p className="text-xs text-gray-500">{currentChurch?.name}</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditingMemberId(null); setSelectedFile(null); setFormData({...initialFormState, churchId: viewId}); setView('FORM'); }} className="bg-brand-black text-white px-3 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow-md transition-colors text-xs md:text-sm">
            <Plus size={16} className="mr-1 md:mr-2"/> <span className="hidden md:inline">Novo Membro</span><span className="md:hidden">Novo</span>
          </button>
        )}
      </div>

      <div className="bg-white p-2 rounded-lg shadow-sm border flex items-center">
        <Search className="text-gray-400 mr-2" size={18} />
        <input type="text" placeholder="BUSCAR POR NOME OU CPF..." className="flex-1 outline-none text-sm uppercase" value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setViewingMember(member)}>
                <td className="px-3 py-2 text-left">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-9 w-9 bg-gray-200 rounded-full overflow-hidden border cursor-zoom-in relative" onClick={(e) => { e.stopPropagation(); if(member.photo) setEnlargedPhoto(member.photo); }}>
                       {member.photo ? <img src={member.photo} className="h-full w-full object-cover"/> : <User size={18} className="m-auto mt-2 text-gray-400"/>}
                       {member.id === user?.id && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-orange rounded-full border border-white"></div>}
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <div className="text-sm font-bold text-gray-900 leading-tight whitespace-normal flex items-center">
                          {member.name}
                          {member.id === user?.id && <span className="ml-2 text-[8px] bg-brand-black text-white px-1 rounded uppercase">Eu</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="truncate">CPF: {member.cpf}</span>
                          {member.isTither && <span className="bg-green-100 text-green-800 px-1.5 rounded text-[9px] font-bold">DIZIMISTA</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium w-16">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit || member.id === user?.id ? (
                        <>
                            <button onClick={() => handleEdit(member)} className="text-gray-400 hover:text-brand-orange p-1.5 rounded-full hover:bg-orange-50 transition-colors"><Edit2 size={16}/></button>
                            {/* Somente tesoureiro deleta, exceto o próprio usuário não pode se deletar aqui */}
                            {canEdit && <button onClick={() => handleConfirmDelete(member)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>}
                        </>
                      ) : (
                         <button onClick={() => setViewingMember(member)} className="text-gray-400 hover:text-gray-600 p-1"><ZoomIn size={16}/></button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500 text-xs">Nenhum membro encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-4">
             <h3 className="font-bold text-base mb-2">{modalState.title}</h3>
             <p className="text-xs text-gray-600 mb-4">{modalState.message}</p>
             <div className="flex justify-end gap-2">
                {modalState.showCancel && <button onClick={() => setModalState(prev => ({...prev, isOpen: false}))} className="px-3 py-1.5 border rounded text-xs font-medium hover:bg-gray-50">Cancelar</button>}
                <button onClick={() => { if (modalState.onConfirm) modalState.onConfirm(); else setModalState(prev => ({...prev, isOpen: false})); }} className={`px-4 py-1.5 rounded text-white text-xs font-bold shadow ${modalState.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-black hover:bg-gray-800'}`}>OK</button>
             </div>
          </div>
        </div>
      )}

      {renderPhotoLightbox()}
      {renderDetailsModal()}
    </div>
  );

  const renderForm = () => (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      <div className="bg-brand-black p-4 flex justify-between items-center text-white">
        <h2 className="text-lg font-bold flex items-center">
            {editingMemberId ? <Edit2 className="mr-2" size={20}/> : <Plus className="mr-2" size={20}/>}
            {editingMemberId ? (editingMemberId === user?.id ? 'Editar Meu Perfil' : 'Editar Membro') : 'Novo Cadastro'}
        </h2>
        <button onClick={handleCancel} className="hover:text-gray-300 transition-colors bg-white/10 p-1 rounded-full"><X size={20}/></button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
        
        {/* FOTO E CABEÇALHO */}
        <div className="flex flex-col items-center mb-6">
            <div className="relative group">
                <div 
                    className="h-28 w-28 rounded-full border-4 border-gray-100 bg-gray-50 overflow-hidden shadow-md cursor-pointer hover:border-brand-orange transition-colors" 
                    onClick={triggerFileInput}
                >
                    {selectedFile ? <img src={URL.createObjectURL(selectedFile)} className="h-full w-full object-cover" /> : formData.photo ? <img src={formData.photo} className="h-full w-full object-cover" /> : <User size={48} className="m-auto mt-6 text-gray-300" />}
                </div>
                <div className="absolute bottom-0 right-0 bg-brand-orange text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-brand-red transition-colors" onClick={triggerFileInput}>
                    <Camera size={16}/>
                </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <p className="text-xs text-gray-400 mt-2 font-medium">Toque para alterar a foto</p>
        </div>

        {/* ÁREA DE SEGURANÇA (VISÍVEL APENAS PARA O PRÓPRIO USUÁRIO) */}
        {editingMemberId === user?.id && (
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 animate-fade-in-down mb-6">
                <h3 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b border-orange-200 pb-2 mb-4 flex items-center">
                    <Lock size={16} className="mr-2"/> Segurança e Acesso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nova Senha</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                            <input 
                                type="password" 
                                placeholder="Digite para alterar..." 
                                className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all bg-white"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Deixe em branco para manter a senha atual.</p>
                    </div>
                    <div className="flex items-center">
                        <div className="text-xs text-orange-800 bg-orange-100 p-2 rounded flex items-center">
                            <Info size={14} className="mr-2 shrink-0"/>
                            Você está editando seus próprios dados. Mantenha seu CPF e telefone atualizados.
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* SEÇÃO DADOS PESSOAIS */}
        <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
            <h3 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center">
                <User size={16} className="mr-2"/> Dados Pessoais
            </h3>
            
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nome Completo *</label>
                        <input type="text" required className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}/>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nº Membro</label>
                        <div className="relative">
                             <Hash className="absolute left-2.5 top-2.5 text-gray-400" size={16}/>
                             <input type="text" className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.memberNumber} onChange={e => setFormData({...formData, memberNumber: e.target.value.toUpperCase()})}/>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">CPF *</label>
                        <input type="text" required maxLength={14} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.cpf} onChange={handleCpfChange}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nascimento</label>
                        <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Batismo</label>
                        <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.baptismDate} onChange={e => setFormData({...formData, baptismDate: e.target.value})}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Estado Civil</label>
                        <select className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all bg-white" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                            <option value="SOLTEIRO">SOLTEIRO(A)</option>
                            <option value="CASADO">CASADO(A)</option>
                            <option value="VIUVO">VIÚVO(A)</option>
                            <option value="DIVORCIADO">DIVORCIADO(A)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* SEÇÃO CONTATO */}
        <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
             <h3 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center">
                <Phone size={16} className="mr-2"/> Contato & Vínculo
            </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Telefone / WhatsApp</label>
                 <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.phone} onChange={handlePhoneChange}/>
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Email</label>
                 <input type="email" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm lowercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})}/>
               </div>
               <div className="flex items-end">
                  <label className={`flex items-center justify-center w-full p-2.5 border rounded-lg cursor-pointer transition-all ${formData.isTither ? 'bg-green-50 border-green-200' : 'bg-white border-gray-300'}`}>
                    <input type="checkbox" className="h-4 w-4 text-brand-orange rounded focus:ring-brand-orange" checked={formData.isTither} onChange={e => setFormData({...formData, isTither: e.target.checked})}/>
                    <span className={`ml-2 text-sm font-bold ${formData.isTither ? 'text-green-700' : 'text-gray-500'}`}>Membro Dizimista</span>
                  </label>
               </div>
             </div>
        </div>

        {/* SEÇÃO ENDEREÇO */}
        <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100">
           <h3 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b border-gray-200 pb-2 mb-4 flex items-center">
                <MapPin size={16} className="mr-2"/> Endereço
            </h3>
           
           <div className="space-y-4">
                {/* Linha 1: CEP, Rua, Número */}
               <div className="flex flex-col md:flex-row gap-4">
                   <div className="w-full md:w-40">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">CEP</label>
                      <div className="relative">
                        <input type="text" maxLength={9} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.zipCode} onChange={handleCepChange} onBlur={handleCepBlur}/>
                        {isLoadingCep && <Loader className="absolute right-3 top-2.5 animate-spin text-brand-orange" size={16}/>}
                      </div>
                   </div>
                   <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Rua / Logradouro</label>
                      <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value.toUpperCase()})}/>
                   </div>
                   <div className="w-full md:w-24">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Número</label>
                      <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})}/>
                   </div>
               </div>
               
               {/* Linha 2: Bairro, Cidade, UF, País */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Bairro</label>
                      <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="md:col-span-1">
                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Cidade</label>
                       <input type="text" className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value.toUpperCase()})}/>
                  </div>
                   <div className="md:col-span-1">
                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">UF</label>
                       <input type="text" maxLength={2} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}/>
                  </div>
                  <div className="md:col-span-1">
                       <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">País</label>
                       <div className="relative">
                            <Flag className="absolute left-2.5 top-2.5 text-gray-400" size={16}/>
                            <input type="text" className="w-full pl-9 p-2.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-brand-orange focus:border-transparent outline-none transition-all" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value.toUpperCase()})}/>
                       </div>
                  </div>
               </div>
             </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
           <button type="button" onClick={handleCancel} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 text-gray-700 transition-colors">Cancelar</button>
           <button type="submit" disabled={isSaving} className="px-8 py-2.5 bg-brand-orange text-white rounded-lg text-sm font-bold flex items-center hover:bg-brand-red shadow-lg transition-all transform hover:scale-105">
             {isSaving ? <Loader className="animate-spin mr-2" size={18}/> : <Save size={18} className="mr-2" />} Salvar
           </button>
        </div>
      </form>
    </div>
  );

  return view === 'LIST' ? renderList() : renderForm();
};
