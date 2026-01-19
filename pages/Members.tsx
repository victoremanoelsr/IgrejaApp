
import React, { useState, useRef } from 'react';
import { useApp } from '../context';
import { Member } from '../types';
import { 
  Search, Plus, Trash2, Edit2, User, Save, X, Building, ShieldAlert, MapPin, Loader, 
  Camera, Phone, Mail, ZoomIn, Calendar, Hash, CheckCircle, CreditCard, Heart,
  AlertTriangle, Info
} from 'lucide-react';

export const Members: React.FC = () => {
  const { members, churches, user, addMember, updateMember, deleteMember, uploadMemberPhoto, currentChurch } = useApp();
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

  const initialFormState = {
    name: '', cpf: '', birthDate: '', memberNumber: '', churchId: viewId || '', isTither: false, baptismDate: '', email: '', phone: '', maritalStatus: 'SOLTEIRO', 
    zipCode: '', street: '', number: '', neighborhood: '', city: '', state: '', country: 'BRASIL', photo: ''
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
    if(!canEdit) return;
    setEditingMemberId(member.id);
    setSelectedFile(null);
    setFormData({
      name: member.name, cpf: member.cpf, birthDate: member.birthDate, memberNumber: member.memberNumber || '', churchId: member.churchId, isTither: member.isTither,
      baptismDate: member.baptismDate || '', email: member.email || '', phone: member.phone || '', maritalStatus: member.maritalStatus || 'SOLTEIRO',
      street: member.address.street, number: member.address.number, neighborhood: member.address.neighborhood, city: member.address.city, state: member.address.state || '',
      zipCode: member.address.zipCode, country: member.address.country || 'BRASIL', photo: member.photo || ''
    });
    setView('FORM');
  };

  const handleCancel = () => {
    setFormData(initialFormState); setEditingMemberId(null); setSelectedFile(null); setIsSaving(false); setView('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!canEdit) return;
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
    setIsSaving(false);

    if (result.success) { showAlert('Sucesso', "Salvo com sucesso!", 'success'); handleCancel(); } 
    else { showAlert('Erro', result.error || 'Erro desconhecido', 'danger'); }
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative max-h-[90vh] overflow-y-auto">
          <div className="h-20 bg-brand-orange relative">
             <button onClick={() => setViewingMember(null)} className="absolute top-2 right-2 bg-black/20 text-white rounded-full p-1"><X size={18}/></button>
          </div>
          <div className="px-6 pb-6 -mt-10">
             <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full border-4 border-white bg-gray-200 overflow-hidden" onClick={() => viewingMember.photo && setEnlargedPhoto(viewingMember.photo)}>
                    {viewingMember.photo ? <img src={viewingMember.photo} className="h-full w-full object-cover"/> : <User size={32} className="m-auto mt-4 text-gray-400"/>}
                </div>
                <h2 className="text-lg font-bold text-center mt-2 leading-tight">{viewingMember.name}</h2>
                <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-gray-100 px-2 rounded-full text-gray-600 border">CPF: {viewingMember.cpf}</span>
                    {viewingMember.isTither && <span className="text-[10px] bg-green-100 px-2 rounded-full text-green-700 border border-green-200">Dizimista</span>}
                </div>
                {canEdit && <button onClick={() => { setViewingMember(null); handleEdit(viewingMember); }} className="mt-3 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded border">Editar</button>}
             </div>
             <div className="mt-6 space-y-3 text-sm">
                 <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Contato</p>
                    <p className="flex items-center"><Phone size={14} className="mr-2 text-blue-500"/> {viewingMember.phone || '-'}</p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Eclesiástico</p>
                    <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-xs text-gray-500">Nascimento:</span> <br/>{formatDate(viewingMember.birthDate)}</div>
                        <div><span className="text-xs text-gray-500">Batismo:</span> <br/>{formatDate(viewingMember.baptismDate)}</div>
                    </div>
                 </div>
                 <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Endereço</p>
                    <p className="text-xs">{viewingMember.address.street}, {viewingMember.address.number}</p>
                    <p className="text-xs text-gray-500">{viewingMember.address.neighborhood} - {viewingMember.address.city}</p>
                 </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-4 pl-10 md:pl-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Membros</h2>
          <p className="text-xs text-gray-500">{currentChurch?.name}</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditingMemberId(null); setSelectedFile(null); setFormData({...initialFormState, churchId: viewId}); setView('FORM'); }} className="bg-brand-black text-white p-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-gray-800 shadow-sm">
            <Plus size={18} className="md:mr-2"/> <span className="hidden md:inline">Novo Membro</span>
          </button>
        )}
      </div>

      <div className="bg-white p-2 rounded-lg shadow-sm border flex items-center">
        <Search className="text-gray-400 mr-2" size={18} />
        <input type="text" placeholder="BUSCAR..." className="flex-1 outline-none uppercase text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value.toUpperCase())} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            {filteredMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full overflow-hidden border cursor-zoom-in" onClick={(e) => { e.stopPropagation(); if(member.photo) setEnlargedPhoto(member.photo); }}>
                       {member.photo ? <img src={member.photo} className="h-full w-full object-cover"/> : <User size={16} className="m-auto mt-2 text-gray-400"/>}
                    </div>
                    <div className="ml-3 cursor-pointer" onClick={() => setViewingMember(member)}>
                      <div className="text-xs font-bold text-gray-900 truncate max-w-[140px] md:max-w-none">{member.name}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-2">
                          <span>{member.cpf}</span>
                          {member.isTither && <CheckCircle size={10} className="text-green-600"/>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-3">
                      {canEdit ? (
                        <>
                            <button onClick={() => handleEdit(member)} className="text-gray-400 hover:text-brand-orange"><Edit2 size={16}/></button>
                            <button onClick={() => handleConfirmDelete(member)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
                        </>
                      ) : (
                         <button onClick={() => setViewingMember(member)} className="text-gray-400"><ZoomIn size={16}/></button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-gray-500">Nenhum membro.</td></tr>}
          </tbody>
        </table>
      </div>
      
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-4">
             <h3 className="font-bold text-base mb-2">{modalState.title}</h3>
             <p className="text-xs text-gray-600 mb-4">{modalState.message}</p>
             <div className="flex justify-end gap-2">
                {modalState.showCancel && <button onClick={() => setModalState(prev => ({...prev, isOpen: false}))} className="px-3 py-1.5 border rounded text-xs">Cancelar</button>}
                <button onClick={() => { if (modalState.onConfirm) modalState.onConfirm(); else setModalState(prev => ({...prev, isOpen: false})); }} className={`px-4 py-1.5 rounded text-white text-xs font-bold ${modalState.variant === 'danger' ? 'bg-red-600' : 'bg-brand-black'}`}>OK</button>
             </div>
          </div>
        </div>
      )}

      {renderPhotoLightbox()}
      {renderDetailsModal()}
    </div>
  );

  const renderForm = () => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden pl-10 md:pl-0">
      <div className="bg-brand-black p-3 md:p-4 flex justify-between items-center text-white">
        <h2 className="text-sm md:text-lg font-bold">{editingMemberId ? 'Editar' : 'Novo'} Membro</h2>
        <button onClick={handleCancel}><X/></button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full border-2 border-gray-100 bg-gray-50 overflow-hidden relative cursor-pointer" onClick={triggerFileInput}>
                {selectedFile ? <img src={URL.createObjectURL(selectedFile)} className="h-full w-full object-cover" /> : formData.photo ? <img src={formData.photo} className="h-full w-full object-cover" /> : <User size={32} className="m-auto mt-4 text-gray-300" />}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white opacity-0 hover:opacity-100"><Camera size={16}/></div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <div className="space-y-3">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
               <div className="md:col-span-3">
                 <label className="text-xs font-medium text-gray-700 block">Nome</label>
                 <input type="text" required className="w-full p-1.5 border rounded uppercase text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}/>
               </div>
               <div>
                 <label className="text-xs font-medium text-gray-700 block">Nº (Opc)</label>
                 <input type="text" className="w-full p-1.5 border rounded uppercase text-sm" value={formData.memberNumber} onChange={e => setFormData({...formData, memberNumber: e.target.value.toUpperCase()})}/>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-medium text-gray-700 block">CPF</label>
                 <input type="text" required maxLength={14} className="w-full p-1.5 border rounded text-sm" value={formData.cpf} onChange={handleCpfChange}/>
               </div>
               <div>
                 <label className="text-xs font-medium text-gray-700 block">Nascimento</label>
                 <input type="date" required className="w-full p-1.5 border rounded text-sm" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})}/>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs font-medium text-gray-700 block">Telefone</label>
                 <input type="text" className="w-full p-1.5 border rounded text-sm" value={formData.phone} onChange={handlePhoneChange}/>
               </div>
               <div className="flex items-center h-full pt-4">
                  <input type="checkbox" id="isTither" className="h-4 w-4 text-brand-orange rounded" checked={formData.isTither} onChange={e => setFormData({...formData, isTither: e.target.checked})}/>
                  <label htmlFor="isTither" className="ml-2 text-xs font-bold text-gray-700">Dizimista?</label>
               </div>
             </div>

             <div className="border-t pt-2 mt-2">
               <label className="text-xs font-medium text-gray-700 block">CEP</label>
               <div className="relative">
                <input type="text" maxLength={9} className="w-full p-1.5 border rounded text-sm" value={formData.zipCode} onChange={handleCepChange} onBlur={handleCepBlur}/>
                {isLoadingCep && <Loader className="absolute right-2 top-1.5 animate-spin" size={14}/>}
               </div>
             </div>
             
             <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><input type="text" placeholder="RUA" className="w-full p-1.5 border rounded text-xs uppercase" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value.toUpperCase()})}/></div>
                <div><input type="text" placeholder="Nº" className="w-full p-1.5 border rounded text-xs uppercase" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value.toUpperCase()})}/></div>
                <div className="col-span-3"><input type="text" placeholder="BAIRRO" className="w-full p-1.5 border rounded text-xs uppercase" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value.toUpperCase()})}/></div>
             </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
           <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg text-xs font-bold">Cancelar</button>
           <button type="submit" disabled={isSaving} className="px-6 py-2 bg-brand-orange text-white rounded-lg text-xs font-bold flex items-center">
             {isSaving ? <Loader className="animate-spin mr-1" size={14}/> : <Save size={14} className="mr-1" />} Salvar
           </button>
        </div>
      </form>
    </div>
  );

  return view === 'LIST' ? renderList() : renderForm();
};
