import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context';
import { User, Role, Member } from '../types';
import { Search, Plus, Trash2, Edit2, User as UserIcon, Save, X, ShieldCheck, Lock, CheckCircle } from 'lucide-react';

export const Users: React.FC = () => {
  const { users, churches, members, user: currentUser, addUser, updateUser, deleteUser, availableChurches } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // State for Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      cpf: member.cpf,
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
      cpf: user.cpf,
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
        alert("Erro: Este nome de usuário já está em uso.");
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
      alert("Usuário atualizado com sucesso!");
    } else {
      const res = await addUser(payload);
      if (!res.success) {
          alert(`Erro ao cadastrar: ${res.error}`);
          return;
      }
      alert("Usuário cadastrado com sucesso!");
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
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[role] || 'bg-gray-100'}`}>
        {role.replace('_', ' ')}
      </span>
    );
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Controle de Usuários</h2>
          <p className="text-sm text-gray-500">Gestão de Equipe ({availableChurches.length > 1 ? 'Campo' : 'Local'})</p>
        </div>
        <button onClick={() => setView('FORM')} className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 transition-colors">
          <Plus size={20} className="mr-2"/> Novo Usuário
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center">
        <Search className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou login..." 
          className="flex-1 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  {/* Prevents deleting yourself or Super Admins if you're not one */}
                  {u.id !== currentUser?.id && (currentUser?.role === 'SUPER_ADM' || u.role !== 'SUPER_ADM') && (
                    <>
                      <button onClick={() => handleEdit(u)} className="text-brand-orange hover:text-brand-red mr-4 transition-colors">
                        <Edit2 size={18}/>
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('Excluir este acesso?')) deleteUser(u.id); }}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-brand-black p-6 flex justify-between items-center text-white">
        <h2 className="text-xl font-bold flex items-center">
          <ShieldCheck className="mr-2" /> {editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
        </h2>
        <button onClick={handleCancel} className="hover:text-brand-orange transition-colors"><X/></button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Unidade de Acesso</label>
            <select 
              required={formData.role !== 'SUPER_ADM'} // Obrigatório apenas se não for Super Admin
              className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
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

          <div className="col-span-2 relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <div className="relative">
              <input 
                type="text" 
                required 
                autoComplete="off"
                placeholder="NOME DO USUÁRIO..."
                className={`mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange uppercase`}
                value={formData.name}
                onChange={e => {
                  setFormData({...formData, name: e.target.value.toUpperCase()});
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && formData.name.length >= 2 && memberSuggestions.length > 0 && !editingUserId && (
                <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {memberSuggestions.map((member) => (
                    <div 
                      key={member.id}
                      onClick={() => handleSelectMember(member)}
                      className="p-3 hover:bg-orange-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">CPF: {member.cpf}</p>
                      </div>
                      <Plus size={16} className="text-brand-orange" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input 
              type="text" 
              required 
              className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
              value={formData.cpf}
              onChange={e => setFormData({...formData, cpf: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Cargo / Nível de Acesso</label>
            <select 
              required
              className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as Role})}
            >
              {getAvailableRoles().map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="border-t col-span-2 pt-4 mt-2">
            <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center uppercase tracking-widest"><Lock size={14} className="mr-1"/> Credenciais de Acesso</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm font-medium text-gray-700">Usuário de Login</label>
                <input 
                  type="text" 
                  required 
                  className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha {editingUserId && '(Vazio = Manter)'}</label>
                <input 
                  type="password" 
                  required={!editingUserId}
                  className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={handleCancel} className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">Cancelar</button>
          <button type="submit" className="px-8 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-red flex items-center shadow-lg transform hover:scale-105 transition-all">
            <Save size={18} className="mr-2"/> {editingUserId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="container mx-auto">
      {view === 'LIST' ? renderList() : renderForm()}
    </div>
  );
};