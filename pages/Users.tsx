
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { User, Role, Member } from '../types';
import { Search, Plus, Trash2, Edit2, User as UserIcon, Save, X, ShieldCheck, Lock, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const formatCPF = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

export const Users: React.FC = () => {
  const { users, churches, members, user: currentUser, addUser, updateUser, deleteUser, availableChurches } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // State for Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- CUSTOM MODAL STATE ---
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

  const initialFormState = {
    name: '',
    username: '',
    cpf: '',
    birthDate: '',
    role: 'SECRETARIO' as Role,
    churchId: currentUser?.churchId || '', 
    password: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  // Close suggestions when clicking outside
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

  // Filter users for the main list
  const filteredUsers = users.filter(u => {
    // Se sou Super Admin, vejo todos. Senão, só da minha scope
    const isInMyScope = currentUser?.role === 'SUPER_ADM' || availableChurches.some(ac => ac.id === u.churchId);
    
    // Check search term
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.includes(searchTerm);
    
    return isInMyScope && matchesSearch;
  });

  // Autocomplete Logic
  const memberSuggestions = members.filter(m => {
    if (!formData.churchId) return false;
    if (m.churchId !== formData.churchId) return false;
    if (formData.name.length < 2) return false; 
    return m.name.toLowerCase().includes(formData.name.toLowerCase());
  });

  const handleSelectMember = (member: Member) => {
    setFormData({
      ...formData,
      name: member.name,
      cpf: formatCPF(member.cpf || ''),
      birthDate: member.birthDate,
    });
    setShowSuggestions(false);
  };

  const getAvailableRoles = () => {
    if (currentUser?.role === 'SUPER_ADM') {
      return [
        { value: 'SUPER_ADM', label: 'Super Administrador (Global)' },
        { value: 'PRESIDENTE', label: 'PR Presidente' },
        { value: 'VICE_PRESIDENTE', label: 'PR Vice-Presidente' },
      ];
    }

    const targetChurch = availableChurches.find(c => c.id === formData.churchId);
    
    if (targetChurch?.type === 'CONGREGACAO') {
        return [
            { value: 'DIRIGENTE', label: 'Dirigente da Congregação' },
            { value: 'TESOUREIRO', label: 'Tesoureiro Local' },
            { value: 'SECRETARIO', label: 'Secretário Local' },
        ];
    }

    return [
      { value: 'VICE_PRESIDENTE', label: 'PR Vice-Presidente' },
      { value: 'TESOUREIRO', label: 'Tesoureiro Sede' },
      { value: 'SECRETARIO', label: 'Secretário Sede' },
    ];
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      cpf: formatCPF(user.cpf || ''),
      birthDate: user.birthDate || '',
      role: user.role,
      churchId: user.churchId || '',
      password: '',
    });
    setView('FORM');
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingUserId(null);
    setShowSuggestions(false);
    setView('LIST');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUserId) {
      const exists = users.find(u => u.username === formData.username);
      if (exists) {
        showAlert("Erro", "Este nome de usuário já está em uso.", 'danger');
        return;
      }
    }

    // Se selecionar SUPER_ADM, pode não ter churchId
    const payload: User = {
      id: editingUserId || '',
      name: formData.name.toUpperCase(),
      username: formData.username,
      cpf: formData.cpf,
      birthDate: formData.birthDate,
      role: formData.role,
      churchId: formData.churchId || undefined, // Manda undefined se string vazia
      password: formData.password // CRITICAL FIX: Sending password to create user
    };

    if (editingUserId) {
      updateUser(editingUserId, payload);
      showAlert("Sucesso", "Usuário atualizado com sucesso!", 'success');
    } else {
      const res = await addUser(payload);
      if (!res.success) {
          showAlert("Erro", `Erro ao cadastrar: ${res.error}`, 'danger');
          return;
      }
      showAlert("Sucesso", "Usuário cadastrado com sucesso!", 'success');
    }
    
    handleCancel();
  };

  const getRoleBadge = (role: Role) => {
    const styles = {
      SUPER_ADM: 'bg-red-100 text-red-700',
      PRESIDENTE: 'bg-purple-100 text-purple-700',
      VICE_PRESIDENTE: 'bg-purple-50 text-purple-600',
      DIRIGENTE: 'bg-orange-100 text-brand-orange',
      TESOUREIRO: 'bg-green-100 text-green-700',
      SECRETARIO: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${styles[role] || 'bg-gray-100'} whitespace-nowrap`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Controle de Usuários</h2>
          <p className="text-xs md:text-sm text-gray-500">Gestão de Equipe ({availableChurches.length > 1 ? 'Campo' : 'Local'})</p>
        </div>
        <button onClick={() => setView('FORM')} className="bg-brand-black text-white px-3 py-2 md:px-4 rounded-lg flex items-center hover:bg-gray-800 transition-colors shadow-sm">
          <Plus size={18} className="md:mr-2"/> <span className="hidden md:inline">Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm border flex items-center">
        <Search className="text-gray-400 mr-2" size={18}/>
        <input 
          type="text" 
          placeholder="Buscar por nome ou login..." 
          className="flex-1 outline-none text-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* MOBILE LIST VIEW (Cards) */}
      <div className="md:hidden space-y-2">
        {filteredUsers.map((u) => (
          <div key={u.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-2 relative">
             <div className="flex items-start gap-3 pr-8">
                 <div className="h-10 w-10 bg-brand-black rounded-full flex items-center justify-center text-white shrink-0">
                    <UserIcon size={18}/>
                 </div>
                 <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 leading-tight truncate">{u.name}</div>
                    <div className="text-[10px] text-gray-500 font-medium">@{u.username}</div>
                    <div className="mt-1 flex items-center gap-2">
                       {getRoleBadge(u.role)}
                    </div>
                 </div>
             </div>
             
             {/* Unidade */}
             <div className="text-[10px] text-gray-400 border-t pt-2 mt-1 truncate">
                {u.churchId 
                    ? availableChurches.find(c => c.id === u.churchId)?.name || 'Desconhecida'
                    : <span className="text-brand-orange font-bold">ACESSO GLOBAL</span>
                }
             </div>

             {/* Actions Absolute Top Right */}
             <div className="absolute top-3 right-3 flex flex-col gap-2">
                {/* BOTÃO EDITAR: Aparece para o próprio usuário OU se o logado tiver permissão */}
                {(u.id === currentUser?.id || currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && (
                    <button onClick={() => handleEdit(u)} className="p-1 text-gray-400 hover:text-brand-orange rounded-full hover:bg-orange-50">
                        <Edit2 size={16}/>
                    </button>
                )}

                {/* BOTÃO EXCLUIR: Não pode excluir a si mesmo */}
                {u.id !== currentUser?.id && (currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && (
                    <button 
                        onClick={() => showConfirm('Excluir Usuário', 'Deseja excluir este acesso?', () => deleteUser(u.id), 'danger')}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                    >
                        <Trash2 size={16}/>
                    </button>
                )}
             </div>
          </div>
        ))}
        {filteredUsers.length === 0 && <div className="text-center text-xs text-gray-500 py-4">Nenhum usuário encontrado.</div>}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo / Nível</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-brand-black rounded-full flex items-center justify-center text-white">
                      <UserIcon size={20}/>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(u.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.churchId 
                    ? availableChurches.find(c => c.id === u.churchId)?.name || 'Desconhecida'
                    : <span className="text-brand-orange font-bold">ACESSO GLOBAL</span>
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-3">
                        {/* EDITAR: Permitido para si mesmo ou Admins */}
                        {(u.id === currentUser?.id || currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && (
                            <button onClick={() => handleEdit(u)} className="text-brand-orange hover:text-brand-red transition-colors" title="Editar Usuário">
                                <Edit2 size={18}/>
                            </button>
                        )}
                        
                        {/* EXCLUIR: Proibido para si mesmo */}
                        {u.id !== currentUser?.id && (currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && (
                            <button 
                                onClick={() => showConfirm('Excluir Usuário', 'Deseja excluir este acesso?', () => deleteUser(u.id), 'danger')}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Excluir Usuário"
                            >
                                <Trash2 size={18}/>
                            </button>
                        )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderForm = () => {
    // Se estiver editando o próprio usuário e NÃO for Super Admin, bloqueia mudança de Cargo e Unidade
    const isSelfEdit = editingUserId === currentUser?.id;
    const isRestrictedEdit = isSelfEdit && currentUser?.role !== 'SUPER_ADM';

    return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      <div className="bg-brand-black p-4 md:p-6 flex justify-between items-center text-white">
        <h2 className="text-lg md:text-xl font-bold flex items-center">
          <ShieldCheck className="mr-2" /> {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>
        <button onClick={handleCancel} className="hover:text-brand-orange transition-colors"><X/></button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-4 md:space-y-6">
        
        {isRestrictedEdit && (
            <div className="bg-yellow-50 text-yellow-700 p-3 rounded text-xs border border-yellow-200 flex items-center mb-2">
                <Info size={16} className="mr-2"/>
                Você está editando seu próprio perfil. Alterações de cargo e unidade estão bloqueadas por segurança.
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs md:text-sm font-medium text-gray-700">Unidade de Acesso</label>
            <select 
              required={formData.role !== 'SUPER_ADM'} // Obrigatório apenas se não for Super Admin
              disabled={isRestrictedEdit} // Bloqueia se for auto-edição
              className={`mt-1 block w-full p-2 border rounded-md text-sm ${isRestrictedEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-brand-orange focus:border-brand-orange'}`}
              value={formData.churchId}
              onChange={e => setFormData({...formData, churchId: e.target.value})}
            >
              <option value="">
                {currentUser?.role === 'SUPER_ADM' ? 'Sem Vínculo (Super Admin Global)' : 'Selecione a igreja...'}
              </option>
              {availableChurches.map(c => (
                  <option key={c.id} value={c.id}>
                      {c.name} {c.type === 'SEDE' ? '(SEDE)' : '(CONGREGAÇÃO)'}
                  </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2 relative" ref={wrapperRef}>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Nome Completo</label>
            <div className="relative">
              <input 
                type="text" 
                required 
                autoComplete="off"
                placeholder="NOME DO USUÁRIO..."
                className={`mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange uppercase text-sm`}
                value={formData.name}
                onChange={e => {
                  setFormData({...formData, name: e.target.value.toUpperCase()});
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && formData.name.length >= 2 && memberSuggestions.length > 0 && !editingUserId && (
                <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-40 md:max-h-60 overflow-y-auto">
                  {memberSuggestions.map((member) => (
                    <div 
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="p-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-xs md:text-sm">{member.name}</p>
                        <p className="text-[10px] text-gray-500">CPF: {member.cpf}</p>
                      </div>
                      <Plus size={16} className="text-brand-orange" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">CPF</label>
            <input 
              type="text" 
              required 
              className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange text-sm"
              placeholder="000.000.000-00"
              maxLength={14}
              value={formData.cpf}
              onChange={e => setFormData({...formData, cpf: formatCPF(e.target.value)})}
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700">Cargo / Nível</label>
            <select 
              required
              disabled={isRestrictedEdit} // Bloqueia se for auto-edição
              className={`mt-1 block w-full p-2 border rounded-md text-sm ${isRestrictedEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-brand-orange focus:border-brand-orange'}`}
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as Role})}
            >
              {getAvailableRoles().map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t col-span-1 md:col-span-2 pt-4 mt-2">
            <h3 className="text-xs md:text-sm font-bold text-gray-500 mb-4 flex items-center uppercase tracking-widest"><Lock size={14} className="mr-1"/> Credenciais</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700">Usuário (Login)</label>
                <input 
                  type="text" 
                  required 
                  className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange text-sm"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700">Senha {editingUserId && '(Opcional)'}</label>
                <input 
                  type="password" 
                  required={!editingUserId}
                  placeholder={editingUserId ? "Deixe em branco para manter" : ""}
                  className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange text-sm"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <button type="button" onClick={handleCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-xs font-bold">Cancelar</button>
          <button type="submit" className="px-6 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-red flex items-center shadow-lg text-xs font-bold">
            <Save size={16} className="mr-2"/> {editingUserId ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </form>
    </div>
    );
  };

  return (
    <div className="container mx-auto">
      {view === 'LIST' ? renderList() : renderForm()}

      {/* GLOBAL CONFIRM/ALERT MODAL */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
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
    </div>
  );
};
