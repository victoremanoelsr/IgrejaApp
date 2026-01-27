
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { User, Role, Member } from '../types';
import { maskSensitiveData } from '../services/encryption';
import { Search, Plus, Trash2, Edit2, User as UserIcon, Save, X, ShieldCheck, Lock, CheckCircle, AlertTriangle, Info, Shield } from 'lucide-react';

export const Users: React.FC = () => {
  const { users, churches, members, user: currentUser, addUser, updateUser, deleteUser, availableChurches } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; title: string; message: string; variant: 'danger' | 'warning' | 'success' | 'info'; showCancel: boolean; onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'info', showCancel: false, onConfirm: undefined });

  const showAlert = (title: string, message: string, variant: 'success' | 'info' | 'danger' | 'warning' = 'info') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: false, onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' = 'warning') => {
    setModalState({ isOpen: true, title, message, variant, showCancel: true, onConfirm: () => { onConfirm(); setModalState(prev => ({ ...prev, isOpen: false })); } });
  };

  const initialFormState = { name: '', username: '', cpf: '', birthDate: '', role: 'SECRETARIO' as Role, churchId: currentUser?.churchId || '', password: '' };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredUsers = users.filter(u => {
    const isInMyScope = currentUser?.role === 'SUPER_ADM' || availableChurches.some(ac => ac.id === u.churchId);
    return isInMyScope && (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.includes(searchTerm));
  });

  const memberSuggestions = members.filter(m => {
    if (!formData.churchId || m.churchId !== formData.churchId || formData.name.length < 2) return false; 
    return m.name.toLowerCase().includes(formData.name.toLowerCase());
  });

  const handleSelectMember = (member: Member) => {
    setFormData({ ...formData, name: member.name, cpf: member.cpf, birthDate: member.birthDate });
    setShowSuggestions(false);
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'SUPER_ADM') return [ { value: 'SUPER_ADM', label: 'Super Administrador (Global)' }, { value: 'PRESIDENTE', label: 'PR Presidente' }, { value: 'VICE_PRESIDENTE', label: 'PR Vice-Presidente' } ];
    const targetChurch = availableChurches.find(c => c.id === formData.churchId);
    if (targetChurch?.type === 'CONGREGACAO') return [ { value: 'DIRIGENTE', label: 'Dirigente da Congregação' }, { value: 'TESOUREIRO', label: 'Tesoureiro Local' }, { value: 'SECRETARIO', label: 'Secretário Local' } ];
    return [ { value: 'VICE_PRESIDENTE', label: 'PR Vice-Presidente' }, { value: 'TESOUREIRO', label: 'Tesoureiro Sede' }, { value: 'SECRETARIO', label: 'Secretário Sede' } ];
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({ name: user.name, username: user.username, cpf: user.cpf, birthDate: user.birthDate || '', role: user.role, churchId: user.churchId || '', password: '' });
    setView('FORM');
  };

  const handleCancel = () => { setFormData(initialFormState); setEditingUserId(null); setView('LIST'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId && users.find(u => u.username === formData.username)) { showAlert("Erro", "Este nome de usuário já está em uso.", 'danger'); return; }
    const payload: User = { id: editingUserId || '', name: formData.name.toUpperCase(), username: formData.username, cpf: formData.cpf, birthDate: formData.birthDate, role: formData.role, churchId: formData.churchId || undefined, password: formData.password };
    if (editingUserId) updateUser(editingUserId, payload);
    else await addUser(payload);
    showAlert("Sucesso", editingUserId ? "Usuário atualizado!" : "Usuário cadastrado com hash SHA-256.", 'success');
    handleCancel();
  };

  const getRoleBadge = (role: Role) => {
    const styles = { SUPER_ADM: 'bg-red-100 text-red-700', PRESIDENTE: 'bg-purple-100 text-purple-700', VICE_PRESIDENTE: 'bg-purple-50 text-purple-600', DIRIGENTE: 'bg-orange-100 text-brand-orange', TESOUREIRO: 'bg-green-100 text-green-700', SECRETARIO: 'bg-blue-100 text-blue-700' };
    return <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${styles[role] || 'bg-gray-100'} whitespace-nowrap`}>{role.replace('_', ' ')}</span>;
  };

  return (
    <div className="container mx-auto">
      {view === 'LIST' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div><h2 className="text-xl md:text-2xl font-bold text-gray-800">Controle de Usuários</h2><p className="text-xs text-gray-500">Gestão de Equipe e Acessos</p></div>
            <button onClick={() => setView('FORM')} className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow-sm"><Plus size={18} className="mr-2"/> Novo Usuário</button>
          </div>
          <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border flex items-center">
            <Search className="text-gray-400 mr-2" size={18}/><input type="text" placeholder="Buscar por nome ou login..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Usuário / CPF</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Cargo</th><th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Ações</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-10 w-10 bg-brand-black rounded-full flex items-center justify-center text-white"><UserIcon size={20}/></div><div className="ml-4"><div className="text-sm font-bold text-gray-900">{u.name}</div><div className="text-xs text-gray-500">@{u.username} • {maskSensitiveData(u.cpf, 'CPF')}</div></div></div></td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(u.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end space-x-3">{(u.id === currentUser?.id || currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && <button onClick={() => handleEdit(u)} className="text-brand-orange hover:text-brand-red"><Edit2 size={18}/></button>}{u.id !== currentUser?.id && <button onClick={() => showConfirm('Excluir', 'Deseja excluir este acesso?', () => deleteUser(u.id), 'danger')} className="text-red-600 hover:text-red-900"><Trash2 size={18}/></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="bg-brand-black p-4 md:p-6 flex justify-between items-center text-white"><h2 className="text-lg md:text-xl font-bold flex items-center"><ShieldCheck className="mr-2" /> {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h2><button onClick={handleCancel} className="hover:text-brand-orange"><X/></button></div>
          <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2"><label className="block text-xs md:text-sm font-bold text-gray-700 uppercase">Unidade de Acesso</label><select required={formData.role !== 'SUPER_ADM'} disabled={editingUserId === currentUser?.id && currentUser?.role !== 'SUPER_ADM'} className="mt-1 block w-full p-2.5 border rounded-lg text-sm" value={formData.churchId} onChange={e => setFormData({...formData, churchId: e.target.value})}><option value="">{currentUser?.role === 'SUPER_ADM' ? 'Sem Vínculo (Super Admin Global)' : 'Selecione...'}</option>{availableChurches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="col-span-2 relative" ref={wrapperRef}><label className="block text-xs md:text-sm font-bold text-gray-700 uppercase">Nome Completo</label><input type="text" required placeholder="NOME DO USUÁRIO..." className="mt-1 block w-full p-2.5 border rounded-lg uppercase text-sm" value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value.toUpperCase()}); setShowSuggestions(true); }}/>{showSuggestions && formData.name.length >= 2 && memberSuggestions.length > 0 && !editingUserId && <div className="absolute z-10 w-full bg-white mt-1 border rounded-lg shadow-lg overflow-hidden">{memberSuggestions.map(m => <div key={m.id} onClick={() => handleSelectMember(m)} className="p-3 hover:bg-orange-50 cursor-pointer flex justify-between border-b last:border-0"><div><p className="font-medium text-sm">{m.name}</p><p className="text-[10px] text-gray-500">CPF: {maskSensitiveData(m.cpf, 'CPF')}</p></div><Plus size={16} className="text-brand-orange" /></div>)}</div>}</div>
              <div><label className="block text-xs font-bold text-gray-700 uppercase">CPF</label><input type="text" required className="mt-1 block w-full p-2.5 border rounded-lg text-sm" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})}/></div>
              <div><label className="block text-xs font-bold text-gray-700 uppercase">Cargo / Nível</label><select required disabled={editingUserId === currentUser?.id && currentUser?.role !== 'SUPER_ADM'} className="mt-1 block w-full p-2.5 border rounded-lg text-sm" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>{getAvailableRoles().map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
              <div className="col-span-2 border-t pt-4 bg-gray-50 -mx-8 px-8 pb-8">
                <h3 className="text-xs font-bold text-gray-500 mb-4 flex items-center uppercase tracking-widest"><Shield size={14} className="mr-2 text-green-600"/> Camada de Criptografia Ativa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 uppercase">Usuário (Login)</label><input type="text" required className="mt-1 block w-full p-2.5 border rounded-lg text-sm bg-white" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})}/></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase">Senha {editingUserId && '(Nova)'}</label><input type="password" required={!editingUserId} placeholder={editingUserId ? "Manter atual" : "Mínimo 6 chars"} className="mt-1 block w-full p-2.5 border rounded-lg text-sm bg-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/></div>
                </div>
                <p className="text-[10px] text-gray-400 mt-4 italic flex items-center"><Lock size={10} className="mr-1"/> As senhas são protegidas por hash SHA-256 de 256 bits no servidor.</p>
              </div>
            </div>
            <div className="flex justify-end space-x-4 pt-4"><button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg font-bold text-xs">Cancelar</button><button type="submit" className="px-6 py-2 bg-brand-orange text-white rounded-lg font-bold shadow-lg text-xs flex items-center"><Save size={16} className="mr-2"/> {editingUserId ? 'Salvar Alterações' : 'Cadastrar Seguro'}</button></div>
          </form>
        </div>
      )}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"><div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100"><div className={`h-2 ${modalState.variant === 'danger' ? 'bg-red-500' : modalState.variant === 'warning' ? 'bg-yellow-500' : modalState.variant === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div><div className="p-6"><div className="flex items-center mb-4"><div className={`p-3 rounded-full mr-4 ${modalState.variant === 'danger' ? 'bg-red-100 text-red-500' : modalState.variant === 'warning' ? 'bg-yellow-100 text-yellow-600' : modalState.variant === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>{modalState.variant === 'danger' && <AlertTriangle size={24}/>}{modalState.variant === 'warning' && <AlertTriangle size={24}/>}{modalState.variant === 'success' && <CheckCircle size={24}/>}{modalState.variant === 'info' && <Info size={24}/>}</div><h3 className="text-xl font-bold text-gray-800">{modalState.title}</h3></div><p className="text-gray-600 mb-6 text-sm leading-relaxed whitespace-pre-line pl-[3.5rem] -mt-2">{modalState.message}</p><div className="flex justify-end space-x-3">{modalState.showCancel && <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium">Cancelar</button>}<button onClick={() => { if (modalState.onConfirm) modalState.onConfirm(); else setModalState(prev => ({ ...prev, isOpen: false })); }} className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-transform active:scale-95 ${modalState.variant === 'danger' ? 'bg-red-600' : modalState.variant === 'warning' ? 'bg-yellow-600' : modalState.variant === 'success' ? 'bg-green-600' : 'bg-blue-600'}`}>{modalState.showCancel ? 'Confirmar' : 'OK'}</button></div></div></div></div>
      )}
    </div>
  );
};
