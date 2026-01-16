import React, { useState } from 'react';
import { useApp } from '../context';
import { Member } from '../types';
import { Search, Plus, Trash2, Edit2, User, Save, X, Building, ShieldAlert, MapPin, Loader } from 'lucide-react';

export const Members: React.FC = () => {
  const { members, churches, user, addMember, updateMember, deleteMember, currentChurch } = useApp();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  
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
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    country: 'BRASIL'
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

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, cpf: formatCPF(e.target.value) });
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
            // Estado (UF) could be added if type supported it, but City covers nicely
          }));
        } else {
            alert("CEP não encontrado.");
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

  // FILTER: Use ViewId
  const filteredMembers = members.filter(m => {
    const belongsToChurch = m.churchId === viewId;
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.cpf.includes(searchTerm) ||
      (m.memberNumber && m.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return belongsToChurch && matchesSearch;
  });

  const handleEdit = (member: Member) => {
    if(!canEdit) return;
    setEditingMemberId(member.id);
    setFormData({
      name: member.name,
      cpf: member.cpf,
      birthDate: member.birthDate,
      memberNumber: member.memberNumber || '',
      churchId: member.churchId,
      isTither: member.isTither,
      baptismDate: member.baptismDate || '',
      street: member.address.street,
      number: member.address.number,
      neighborhood: member.address.neighborhood,
      city: member.address.city,
      zipCode: member.address.zipCode,
      country: member.address.country || 'BRASIL'
    });
    setView('FORM');
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingMemberId(null);
    setView('LIST');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!canEdit) return;
    
    if (!editingMemberId) {
      const exists = members.find(m => m.cpf === formData.cpf && m.churchId === formData.churchId);
      if (exists) {
        alert("Erro: Já existe um membro cadastrado com este CPF nesta unidade.");
        return;
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
      address: {
        street: formData.street.toUpperCase(),
        number: formData.number.toUpperCase(),
        neighborhood: formData.neighborhood.toUpperCase(),
        city: formData.city.toUpperCase(),
        zipCode: formData.zipCode,
        country: formData.country.toUpperCase()
      }
    };

    if (editingMemberId) {
      updateMember(editingMemberId, memberPayload);
      alert("Membro atualizado com sucesso!");
    } else {
      addMember(memberPayload);
      alert("Membro cadastrado com sucesso!");
    }
    
    handleCancel();
  };

  if (!viewId) return <div>Carregando unidade...</div>;

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
          <button onClick={() => { setEditingMemberId(null); setFormData({...initialFormState, churchId: viewId}); setView('FORM'); }} className="bg-brand-black text-white px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center hover:bg-gray-800 transition-colors text-sm w-full md:w-auto justify-center">
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
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidade</th>
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
                    <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={16} className="text-gray-500 md:w-5 md:h-5"/>
                    </div>
                    <div className="ml-3 md:ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.cpf}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-brand-orange">
                    {churches.find(c => c.id === member.churchId)?.name || 'N/A'}
                  </span>
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
                      <button onClick={() => handleEdit(member)} className="text-brand-orange hover:text-brand-red mr-3 md:mr-4 transition-colors p-1">
                        <Edit2 size={18}/>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (window.confirm(`Excluir ${member.name}?`)) deleteMember(member.id);
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors cursor-pointer p-1 rounded hover:bg-red-50" 
                      >
                        <Trash2 size={18} className="pointer-events-none"/>
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-300 italic text-xs">Leitura</span>
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
             <div className="md:col-span-2">
               <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
               <input 
                 type="date" 
                 required 
                 className="mt-1 block w-full p-2 border rounded-md focus:ring-brand-orange focus:border-brand-orange"
                 value={formData.birthDate}
                 onChange={e => setFormData({...formData, birthDate: e.target.value})}
               />
             </div>
           </div>
        </div>

        {/* BLOCO 2: VÍNCULO INSTITUCIONAL */}
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

        {/* BLOCO 3: ENDEREÇO */}
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
             <div className="md:col-span-3">
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
             <div className="md:col-span-2">
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
           <button type="button" onClick={handleCancel} className="px-6 py-2 border rounded-lg hover:bg-gray-50 w-full md:w-auto">Cancelar</button>
           <button type="submit" className="px-6 py-2 bg-brand-orange text-white rounded-lg hover:bg-brand-red shadow-lg transition-transform hover:scale-105 w-full md:w-auto flex items-center justify-center">
             <Save size={20} className="mr-2 inline" /> Salvar Membro
           </button>
        </div>
      </form>
    </div>
  );

  return view === 'LIST' ? renderList() : renderForm();
};