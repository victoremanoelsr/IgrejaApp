import React, { useState } from 'react';
import { useApp } from '../context';
import { Building, Users, Plus, Shield } from 'lucide-react';
import { Church, Role, User } from '../types';

export const Admin: React.FC = () => {
  const { churches, users, addChurch, addUser } = useApp();
  const [activeTab, setActiveTab] = useState<'CHURCHES' | 'USERS'>('CHURCHES');

  // New Church Form
  const [churchName, setChurchName] = useState('');
  const [churchAddress, setChurchAddress] = useState('');
  const [churchPastor, setChurchPastor] = useState('');

  // New User Form
  const [userName, setUserName] = useState('');
  const [userLogin, setUserLogin] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [userRole, setUserRole] = useState<Role>('TESOUREIRO');
  const [userChurchId, setUserChurchId] = useState(churches[0]?.id || '');

  const handleAddChurch = (e: React.FormEvent) => {
    e.preventDefault();
    const newChurch: Church = {
      id: '',
      name: churchName,
      address: churchAddress,
      pastorName: churchPastor,
      active: true,
      type: 'SEDE' // Defaulting to SEDE as this is the admin creation entry point
    };
    addChurch(newChurch);
    alert('Nova congregação adicionada!');
    setChurchName('');
    setChurchAddress('');
    setChurchPastor('');
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: '',
      name: userName,
      username: userLogin,
      cpf: userCpf,
      role: userRole,
      churchId: userChurchId
    };
    const res = await addUser(newUser);
    if (!res.success) {
        alert(`Erro ao adicionar usuário: ${res.error}`);
        return;
    }
    
    alert('Novo usuário adicionado!');
    setUserName('');
    setUserLogin('');
    setUserCpf('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-brand-black text-white p-6 rounded-xl flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><Shield className="mr-3 text-brand-yellow"/> Painel Administrativo</h1>
          <p className="text-gray-400 mt-1">Gestão Global da Denominação</p>
        </div>
      </div>

      <div className="flex space-x-4">
        <button 
          onClick={() => setActiveTab('CHURCHES')} 
          className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center ${activeTab === 'CHURCHES' ? 'bg-brand-orange text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <Building className="mr-2"/> Igrejas / Congregações
        </button>
        <button 
          onClick={() => setActiveTab('USERS')} 
          className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center ${activeTab === 'USERS' ? 'bg-brand-orange text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
        >
          <Users className="mr-2"/> Usuários do Sistema
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md h-fit">
          <h3 className="text-xl font-bold mb-4 flex items-center"><Plus className="mr-2"/> {activeTab === 'CHURCHES' ? 'Nova Igreja' : 'Novo Usuário'}</h3>
          
          {activeTab === 'CHURCHES' ? (
             <form onSubmit={handleAddChurch} className="space-y-4">
               <input type="text" placeholder="Nome da Congregação" className="w-full p-2 border rounded" required value={churchName} onChange={e => setChurchName(e.target.value)} />
               <input type="text" placeholder="Endereço" className="w-full p-2 border rounded" required value={churchAddress} onChange={e => setChurchAddress(e.target.value)} />
               <input type="text" placeholder="Pastor Responsável" className="w-full p-2 border rounded" required value={churchPastor} onChange={e => setChurchPastor(e.target.value)} />
               <button type="submit" className="w-full bg-brand-black text-white py-2 rounded hover:bg-gray-800">Cadastrar Igreja</button>
             </form>
          ) : (
             <form onSubmit={handleAddUser} className="space-y-4">
               <input type="text" placeholder="Nome Completo" className="w-full p-2 border rounded" required value={userName} onChange={e => setUserName(e.target.value)} />
               <input type="text" placeholder="Login / Usuário" className="w-full p-2 border rounded" required value={userLogin} onChange={e => setUserLogin(e.target.value)} />
               <input type="text" placeholder="CPF" className="w-full p-2 border rounded" required value={userCpf} onChange={e => setUserCpf(e.target.value)} />
               
               <select className="w-full p-2 border rounded" value={userRole} onChange={e => setUserRole(e.target.value as Role)}>
                 <option value="TESOUREIRO">Tesoureiro</option>
                 <option value="SECRETARIO">Secretário</option>
                 <option value="PRESIDENTE">Presidente</option>
                 <option value="SUPER_ADM">Super Admin</option>
               </select>

               <select className="w-full p-2 border rounded" value={userChurchId} onChange={e => setUserChurchId(e.target.value)}>
                 {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>

               <button type="submit" className="w-full bg-brand-black text-white py-2 rounded hover:bg-gray-800">Cadastrar Usuário</button>
             </form>
          )}
        </div>

        {/* Right Side: List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden">
           <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
               <tr>
                 {activeTab === 'CHURCHES' ? (
                   <>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pastor</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endereço</th>
                   </>
                 ) : (
                   <>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome / Login</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Igreja</th>
                   </>
                 )}
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
               {activeTab === 'CHURCHES' ? (
                 churches.map(c => (
                   <tr key={c.id}>
                     <td className="px-6 py-4 font-medium">{c.name}</td>
                     <td className="px-6 py-4 text-gray-500">{c.pastorName}</td>
                     <td className="px-6 py-4 text-gray-500 text-sm truncate max-w-xs">{c.address}</td>
                   </tr>
                 ))
               ) : (
                 users.map(u => (
                   <tr key={u.id}>
                     <td className="px-6 py-4">
                       <div className="font-medium">{u.name}</div>
                       <div className="text-xs text-gray-400">@{u.username}</div>
                     </td>
                     <td className="px-6 py-4">
                       <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{u.role}</span>
                     </td>
                     <td className="px-6 py-4 text-gray-500 text-sm">
                       {churches.find(c => c.id === u.churchId)?.name || 'N/A'}
                     </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};