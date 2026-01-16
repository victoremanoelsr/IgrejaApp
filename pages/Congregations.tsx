import React, { useState } from 'react';
import { useApp } from '../context';
import { Church, User } from '../types';
import { Building, Plus, MapPin, User as UserIcon, X, UserPlus, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Congregations: React.FC = () => {
  const { currentChurch, churches, addCongregation, addUser, users, selectChurch, deleteChurch } = useApp();
  const navigate = useNavigate();

  // Modal State
  const [showCongregationForm, setShowCongregationForm] = useState(false);
  const [newCongName, setNewCongName] = useState('');
  const [newCongAddress, setNewCongAddress] = useState('');
  
  // Dirigente Info
  const [newCongPastorName, setNewCongPastorName] = useState('');
  const [newCongDirigenteUser, setNewCongDirigenteUser] = useState('');
  const [newCongDirigentePass, setNewCongDirigentePass] = useState('');
  const [newCongDirigenteCpf, setNewCongDirigenteCpf] = useState('');

  // Filter child congregations
  const childCongregations = churches.filter(c => c.parentId === currentChurch?.id);

  // Access Function
  const handleAccess = (churchId: string) => {
    selectChurch(churchId);
    navigate('/dashboard');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR a congregação "${name}"?\n\nEsta ação é irreversível e pode deixar usuários/dados órfãos.`)) {
        deleteChurch(id);
    }
  };

  // Helper: Mask CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleAddCongregation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChurch) return;

    const userExists = users.some(u => u.username === newCongDirigenteUser);
    if(userExists) {
        alert("Erro: O nome de usuário escolhido para o dirigente já existe.");
        return;
    }

    const newCongId = Math.random().toString(36).substr(2, 9);

    const newCong: Church = {
        id: newCongId,
        name: newCongName.toUpperCase(),
        address: newCongAddress.toUpperCase(),
        pastorName: newCongPastorName.toUpperCase(),
        active: true,
        type: 'CONGREGACAO',
        parentId: currentChurch.id
    };

    const newDirigente: User = {
        id: '', 
        name: newCongPastorName.toUpperCase(), 
        username: newCongDirigenteUser,
        password: newCongDirigentePass,
        cpf: newCongDirigenteCpf,
        role: 'DIRIGENTE',
        churchId: newCongId
    };

    addCongregation(newCong);
    addUser(newDirigente);

    setShowCongregationForm(false);
    setNewCongName('');
    setNewCongAddress('');
    setNewCongPastorName('');
    setNewCongDirigenteUser('');
    setNewCongDirigentePass('');
    setNewCongDirigenteCpf('');
    
    alert(`Congregação "${newCongName}" cadastrada com sucesso!`);
  };

  if (currentChurch?.type !== 'SEDE') {
    return <div className="p-4 text-center text-gray-500">Apenas a Sede pode gerenciar congregações.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-gray-800 flex items-center">
             <Building className="mr-3 text-brand-orange" /> Congregações
           </h1>
           <p className="text-gray-500">Gerencie as filiais vinculadas à {currentChurch.name}</p>
        </div>
        <button 
          onClick={() => setShowCongregationForm(true)}
          className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow-lg transition-transform hover:scale-105"
        >
          <Plus size={20} className="mr-2"/> Nova Congregação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {childCongregations.map(cong => (
           <div key={cong.id} className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-gray-400 hover:border-brand-orange transition-colors relative group">
              {/* Delete Button (Visible on Hover) */}
              <button 
                onClick={() => handleDelete(cong.id, cong.name)}
                className="absolute top-2 right-2 p-1.5 bg-white text-gray-300 hover:text-red-600 rounded-full shadow-sm hover:shadow-md transition-all z-10"
                title="Excluir Congregação"
              >
                <Trash2 size={16}/>
              </button>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-1 pr-6">{cong.name}</h3>
                <span className="text-xs font-bold text-brand-orange bg-orange-50 px-2 py-1 rounded uppercase tracking-wider">Congregação</span>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin size={16} className="mr-2 mt-0.5 text-gray-400 shrink-0"/>
                    <span>{cong.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <UserIcon size={16} className="mr-2 text-gray-400 shrink-0"/>
                    <span>Dir: {cong.pastorName}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
                 <button 
                   onClick={() => handleAccess(cong.id)}
                   className="flex items-center text-sm font-bold text-gray-700 hover:text-brand-orange transition-colors"
                 >
                   <Eye size={18} className="mr-2"/> Acessar Painel
                 </button>
              </div>
           </div>
         ))}
         
         {childCongregations.length === 0 && (
           <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
             <Building size={48} className="mx-auto text-gray-300 mb-4"/>
             <h3 className="text-lg font-medium text-gray-900">Nenhuma congregação cadastrada</h3>
             <p className="text-gray-500">Comece adicionando uma filial usando o botão acima.</p>
           </div>
         )}
      </div>

      {/* MODAL */}
      {showCongregationForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg animate-fade-in-down max-h-[90vh] overflow-y-auto border-t-8 border-brand-orange">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold flex items-center text-gray-800"><Building className="mr-2"/> Nova Congregação</h3>
                 <button onClick={() => setShowCongregationForm(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
               </div>
               
               <p className="text-sm bg-orange-50 text-brand-orange p-3 rounded mb-6 border border-orange-100">
                  Ao criar, você definirá o <strong>Dirigente</strong> que terá acesso administrativo a esta unidade.
               </p>
  
               <form onSubmit={handleAddCongregation} className="space-y-6">
                 
                 {/* Church Data */}
                 <div className="space-y-4">
                   <h4 className="font-bold text-gray-700 border-b pb-1">Dados da Igreja</h4>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Nome da Congregação</label>
                     <input required className="w-full p-2 border rounded uppercase" value={newCongName} onChange={e => setNewCongName(e.target.value.toUpperCase())} placeholder="EX: CONGREGAÇÃO VALE DA BÊNÇÃO"/>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Endereço</label>
                     <input required className="w-full p-2 border rounded uppercase" value={newCongAddress} onChange={e => setNewCongAddress(e.target.value.toUpperCase())} />
                   </div>
                 </div>
  
                 {/* Leader User Data */}
                 <div className="space-y-4 pt-2">
                   <h4 className="font-bold text-gray-700 border-b pb-1 flex items-center"><UserPlus size={18} className="mr-2"/> Dados do Dirigente</h4>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">Nome Completo do Dirigente</label>
                     <input required className="w-full p-2 border rounded uppercase" value={newCongPastorName} onChange={e => setNewCongPastorName(e.target.value.toUpperCase())} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700">CPF</label>
                     <input 
                        required 
                        className="w-full p-2 border rounded" 
                        placeholder="000.000.000-00" 
                        value={newCongDirigenteCpf} 
                        maxLength={14}
                        onChange={e => setNewCongDirigenteCpf(formatCPF(e.target.value))} 
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Login</label>
                          <input required className="w-full p-2 border rounded bg-gray-50" placeholder="ex: pr.joao" value={newCongDirigenteUser} onChange={e => setNewCongDirigenteUser(e.target.value)} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Senha</label>
                          <input required type="text" className="w-full p-2 border rounded bg-gray-50" value={newCongDirigentePass} onChange={e => setNewCongDirigentePass(e.target.value)} />
                      </div>
                   </div>
                 </div>
  
                 <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                   <button type="button" onClick={() => setShowCongregationForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-800">Cancelar</button>
                   <button type="submit" className="px-6 py-2 bg-brand-orange text-white rounded font-bold hover:bg-brand-red shadow">Cadastrar</button>
                 </div>
               </form>
            </div>
          </div>
      )}
    </div>
  );
};