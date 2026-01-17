
import React, { useState } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Eye, Power, Plus, UserPlus, Trash2, Edit2 } from 'lucide-react';
import { Church, User } from '../types';

export const SuperAdminDashboard: React.FC = () => {
  const { churches, members, selectChurch, toggleChurchStatus, addChurch, addUser, deleteChurch, updateChurch } = useApp();
  const navigate = useNavigate();
  
  const [showChurchForm, setShowChurchForm] = useState(false);
  const [showPresidentForm, setShowPresidentForm] = useState(false);
  
  // State for Edit Church Modal
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);

  // Forms State
  const [newChurch, setNewChurch] = useState({ name: '', address: '', pastorName: '', cnpj: '' });
  const [newPresident, setNewPresident] = useState({ name: '', username: '', cpf: '', churchId: '', password: '' });

  const totalMembers = members.length;
  const activeChurches = churches.filter(c => c.active).length;

  // Helper to format CNPJ
  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Helper to format CPF
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleEnterChurch = (churchId: string) => {
    selectChurch(churchId);
    navigate('/dashboard'); 
  };

  const handleAddChurch = (e: React.FormEvent) => {
    e.preventDefault();
    const church: Church = {
      id: '',
      ...newChurch,
      name: newChurch.name.toUpperCase(),
      address: newChurch.address.toUpperCase(),
      pastorName: newChurch.pastorName.toUpperCase(),
      active: true,
      type: 'SEDE', 
    };
    addChurch(church);
    setShowChurchForm(false);
    setNewChurch({ name: '', address: '', pastorName: '', cnpj: '' });
    alert('Igreja Sede cadastrada com sucesso!');
  };

  const handleUpdateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChurch) return;

    const res = await updateChurch(editingChurch.id, {
        name: editingChurch.name.toUpperCase(),
        address: editingChurch.address.toUpperCase(),
        pastorName: editingChurch.pastorName.toUpperCase(),
        cnpj: editingChurch.cnpj
    });
    
    if (res.success) {
        setEditingChurch(null);
        alert('Dados da Sede atualizados com sucesso!');
    } else {
        alert(`Erro ao atualizar: ${res.error}`);
    }
  };

  const handleDeleteChurch = (id: string, name: string) => {
      if (window.confirm(`Tem certeza que deseja EXCLUIR a Sede "${name}"?\n\nATENÇÃO: Isso pode deixar congregações e usuários sem vínculo. Essa ação não pode ser desfeita.`)) {
          deleteChurch(id);
      }
  };

  const handleAddPresident = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPresident.churchId) {
        alert("Erro: É obrigatório selecionar a Igreja para vincular o Presidente.");
        return;
    }
    
    // 1. Criar o Usuário de Login na tabela 'profiles'
    const user: User = {
      id: '',
      ...newPresident,
      name: newPresident.name.toUpperCase(),
      role: 'PRESIDENTE' 
    };

    // CORREÇÃO CRÍTICA: Verificar se o usuário foi realmente criado
    const result = await addUser(user);
    
    if (!result.success) {
        alert(`ERRO AO CRIAR USUÁRIO: ${result.error}\n\nVerifique se o login já existe.`);
        return; // Para aqui e não atualiza a igreja falsamente
    }

    // 2. Se chegou aqui, o usuário foi criado. Agora atualiza o nome do pastor na igreja.
    if (newPresident.churchId) {
        const churchToUpdate = churches.find(c => c.id === newPresident.churchId);
        if (churchToUpdate) {
            await updateChurch(churchToUpdate.id, {
                pastorName: newPresident.name.toUpperCase()
            });
        }
    }

    setShowPresidentForm(false);
    setNewPresident({ name: '', username: '', cpf: '', churchId: '', password: '' });
    alert('Pastor Presidente cadastrado e vinculado à igreja com sucesso!');
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="bg-brand-black text-white p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-4xl font-black tracking-tight mb-2">Painel Master</h1>
          <p className="text-gray-400">Bem-vindo, Administrador Geral.</p>
        </div>
        <div className="flex space-x-8 mt-6 md:mt-0 z-10">
          <div className="text-center">
            <p className="text-4xl font-bold text-brand-orange">{churches.length}</p>
            <p className="text-xs uppercase tracking-widest text-gray-500">Unidades na Rede</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-brand-yellow">{totalMembers}</p>
            <p className="text-xs uppercase tracking-widest text-gray-500">Total de Membros</p>
          </div>
        </div>
        {/* Decorative BG */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-dark to-transparent opacity-50 pointer-events-none"></div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setShowChurchForm(true)}
          className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all group"
        >
          <div className="bg-brand-black text-white p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
            <Plus size={24}/>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-gray-800">Cadastrar Nova Igreja Sede</h3>
            <p className="text-sm text-gray-500">Adicionar nova sede à rede</p>
          </div>
        </button>

        <button 
          onClick={() => setShowPresidentForm(true)}
          className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all group"
        >
          <div className="bg-brand-black text-white p-3 rounded-full mr-4 group-hover:scale-110 transition-transform">
            <UserPlus size={24}/>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-gray-800">Cadastrar PR Presidente</h3>
            <p className="text-sm text-gray-500">Criar acesso principal</p>
          </div>
        </button>
      </div>

      {/* Forms Modals */}
      {showChurchForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-brand-orange animate-fade-in-down">
          <h3 className="text-lg font-bold mb-4">Nova Igreja Sede</h3>
          <form onSubmit={handleAddChurch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="NOME DA IGREJA" className="p-2 border rounded uppercase" value={newChurch.name} onChange={e => setNewChurch({...newChurch, name: e.target.value.toUpperCase()})} />
            <input 
              placeholder="CNPJ (00.000.000/0000-00)" 
              className="p-2 border rounded" 
              value={newChurch.cnpj} 
              maxLength={18}
              onChange={e => setNewChurch({...newChurch, cnpj: formatCNPJ(e.target.value)})} 
            />
            <input required placeholder="ENDEREÇO" className="p-2 border rounded uppercase" value={newChurch.address} onChange={e => setNewChurch({...newChurch, address: e.target.value.toUpperCase()})} />
            <input required placeholder="NOME DO PASTOR RESPONSÁVEL" className="p-2 border rounded uppercase" value={newChurch.pastorName} onChange={e => setNewChurch({...newChurch, pastorName: e.target.value.toUpperCase()})} />
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setShowChurchForm(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-orange text-white rounded">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Church Modal */}
      {editingChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg animate-fade-in-down border-l-4 border-blue-500">
                <h3 className="text-lg font-bold mb-4 flex items-center"><Edit2 size={20} className="mr-2"/> Editar Sede</h3>
                <form onSubmit={handleUpdateChurch} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nome da Igreja</label>
                        <input required className="w-full p-2 border rounded uppercase" value={editingChurch.name} onChange={e => setEditingChurch({...editingChurch, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                        <input className="w-full p-2 border rounded" maxLength={18} value={editingChurch.cnpj || ''} onChange={e => setEditingChurch({...editingChurch, cnpj: formatCNPJ(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Endereço</label>
                        <input required className="w-full p-2 border rounded uppercase" value={editingChurch.address} onChange={e => setEditingChurch({...editingChurch, address: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Pastor Responsável</label>
                        <input required className="w-full p-2 border rounded uppercase" value={editingChurch.pastorName} onChange={e => setEditingChurch({...editingChurch, pastorName: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setEditingChurch(null)} className="px-4 py-2 text-gray-500">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Atualizar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showPresidentForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-brand-orange animate-fade-in-down">
          <h3 className="text-lg font-bold mb-4">Novo Presidente</h3>
          <form onSubmit={handleAddPresident} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="NOME COMPLETO" className="p-2 border rounded uppercase" value={newPresident.name} onChange={e => setNewPresident({...newPresident, name: e.target.value.toUpperCase()})} />
            <input 
              required 
              placeholder="CPF (000.000.000-00)" 
              className="p-2 border rounded" 
              value={newPresident.cpf} 
              maxLength={14}
              onChange={e => setNewPresident({...newPresident, cpf: formatCPF(e.target.value)})} 
            />
            <input required placeholder="Login de Acesso" className="p-2 border rounded" value={newPresident.username} onChange={e => setNewPresident({...newPresident, username: e.target.value})} />
            
            <input 
              required 
              type="text" 
              placeholder="Senha de Acesso" 
              className="p-2 border rounded" 
              value={newPresident.password} 
              onChange={e => setNewPresident({...newPresident, password: e.target.value})} 
            />

            <select required className="p-2 border rounded md:col-span-2" value={newPresident.churchId} onChange={e => setNewPresident({...newPresident, churchId: e.target.value})}>
              <option value="">Selecione a Igreja</option>
              {churches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button type="button" onClick={() => setShowPresidentForm(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-orange text-white rounded">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Super Vision Module - LIST AND ACCESS ONLY */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center"><Eye className="mr-2 text-brand-black"/> Super Visão Global</h2>
          <span className="text-sm text-gray-500">{activeChurches} Igrejas Ativas</span>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Igreja</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pastor</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {churches.filter(c => c.type === 'SEDE').map((church) => (
              <React.Fragment key={church.id}>
                {/* SEDE ROW */}
                <tr className="hover:bg-gray-50 bg-white">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-brand-black text-white rounded-lg flex items-center justify-center mr-3">
                        <Building size={20}/>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{church.name}</div>
                        <div className="text-xs text-gray-500">{church.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-500">SEDE</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{church.pastorName}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full font-bold ${church.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {church.active ? 'ATIVA' : 'SUSPENSA'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end space-x-2">
                    <button 
                      onClick={() => handleEnterChurch(church.id)}
                      className="flex items-center px-3 py-1 bg-brand-black text-white text-xs rounded hover:bg-gray-800 transition-colors"
                      title="Acessar Painel como Presidente"
                    >
                      <Eye size={14} className="mr-1"/>
                    </button>
                    <button 
                      onClick={() => setEditingChurch(church)}
                      className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      title="Editar Dados da Sede"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => toggleChurchStatus(church.id)}
                      className={`p-1.5 rounded transition-colors ${church.active ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      title={church.active ? "Suspender Acesso" : "Ativar Acesso"}
                    >
                      <Power size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteChurch(church.id, church.name)}
                      className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      title="Excluir Sede"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                {/* CONGREGATION ROWS (Nested) */}
                {churches.filter(child => child.parentId === church.id).map(child => (
                   <tr key={child.id} className="hover:bg-gray-50 bg-gray-50/50">
                    <td className="px-6 py-3 pl-16 relative">
                      <div className="absolute left-10 top-1/2 w-4 h-[1px] bg-gray-300"></div>
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-200 text-gray-500 rounded flex items-center justify-center mr-3">
                          <Users size={16}/>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-gray-700">{child.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">CONGREGAÇÃO</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{child.pastorName}</td>
                    <td className="px-6 py-3 text-center">
                       <span className={`px-2 py-1 text-xs rounded-full font-bold ${child.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {child.active ? 'ATIVA' : 'SUSPENSA'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right flex justify-end space-x-3">
                      <button 
                        onClick={() => handleEnterChurch(child.id)}
                        className="flex items-center px-2 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                      >
                        <Eye size={12} className="mr-1"/> Ver
                      </button>
                    </td>
                   </tr>
                ))}
              </React.Fragment>
            ))}
            {churches.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma igreja cadastrada. Use os botões acima para começar.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
