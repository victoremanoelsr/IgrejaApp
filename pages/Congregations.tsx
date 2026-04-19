
import React, { useState } from 'react';
import { useApp } from '../context';
import { Church, User } from '../types';
import { Building, Plus, MapPin, User as UserIcon, X, UserPlus, Eye, Trash2, ShieldAlert, AlertTriangle, CheckCircle, Info, Edit2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanLimits } from '../hooks/usePlanLimits';

export const Congregations: React.FC = () => {
  const { currentChurch, churches, addCongregation, updateChurch, addUser, users, selectChurch, deleteChurch } = useApp();
  const navigate = useNavigate();
  const planLimits = usePlanLimits();

  // Modal State
  const [showCongregationForm, setShowCongregationForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newCongName, setNewCongName] = useState('');
  const [newCongAddress, setNewCongAddress] = useState('');
  
  // Dirigente Info
  const [newCongPastorName, setNewCongPastorName] = useState('');
  const [newCongDirigenteUser, setNewCongDirigenteUser] = useState('');
  const [newCongDirigentePass, setNewCongDirigentePass] = useState('');
  const [newCongDirigenteCpf, setNewCongDirigenteCpf] = useState('');

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

  // Filter child congregations
  const childCongregations = churches.filter(c => c.parentId === currentChurch?.id);

  // Access Function
  const handleAccess = (churchId: string) => {
    selectChurch(churchId);
    navigate('/dashboard');
  };

  const handleEdit = (cong: Church) => {
      setEditingId(cong.id);
      setNewCongName(cong.name);
      setNewCongAddress(cong.address);
      setNewCongPastorName(cong.pastorName);
      
      // Limpa campos de usuário (não editáveis aqui para simplificar)
      setNewCongDirigenteUser('');
      setNewCongDirigentePass('');
      setNewCongDirigenteCpf('');
      
      setShowCongregationForm(true);
  };

  const handleCloseForm = () => {
      setShowCongregationForm(false);
      setEditingId(null);
      setNewCongName('');
      setNewCongAddress('');
      setNewCongPastorName('');
      setNewCongDirigenteUser('');
      setNewCongDirigentePass('');
      setNewCongDirigenteCpf('');
  };

  const handleDelete = (id: string, name: string) => {
    showConfirm(
        'Excluir Congregação',
        `ATENÇÃO: Você está prestes a excluir a congregação "${name}".\n\nIsso excluirá:\n1. Todos os dados financeiros e de membros.\n2. O USUÁRIO DO DIRIGENTE vinculado.\n\nEsta ação é irreversível. Deseja continuar?`,
        () => deleteChurch(id),
        'danger'
    );
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChurch) return;

    // --- MODO EDIÇÃO ---
    if (editingId) {
        const res = await updateChurch(editingId, {
            name: newCongName.toUpperCase(),
            address: newCongAddress.toUpperCase(),
            pastorName: newCongPastorName.toUpperCase()
        });

        if (res.success) {
            showAlert("Sucesso", "Dados da congregação atualizados!", 'success');
            handleCloseForm();
        } else {
            showAlert("Erro", `Falha ao atualizar: ${res.error}`, 'danger');
        }
        return;
    }

    // --- MODO CRIAÇÃO ---
    if (planLimits.isAtCongLimit) {
      showAlert(
        '🔒 Limite do Plano Atingido',
        `Seu plano ${planLimits.limits.label} permite até ${planLimits.congLimit} congregação(ões).\n\nVocê já possui ${planLimits.currentCongCount} congregação(ões) cadastrada(s).\n\nPara adicionar mais congregações, solicite ao administrador o upgrade para um plano superior.`,
        'warning'
      );
      return;
    }

    const userExists = users.some(u => u.username === newCongDirigenteUser);
    if(userExists) {
        showAlert("Erro", "O nome de usuário escolhido para o dirigente já existe.", 'danger');
        return;
    }

    // 1. Cria a Congregação primeiro e espera o ID
    const newCong: Church = {
        id: '', // Banco vai gerar
        name: newCongName.toUpperCase(),
        address: newCongAddress.toUpperCase(),
        pastorName: newCongPastorName.toUpperCase(),
        active: true,
        type: 'CONGREGACAO',
        parentId: currentChurch.id
    };

    const createdCongId = await addCongregation(newCong);

    // 2. Se a congregação foi criada, cria o usuário vinculado a ela
    if (createdCongId) {
        const newDirigente: User = {
            id: '', 
            name: newCongPastorName.toUpperCase(), 
            username: newCongDirigenteUser,
            password: newCongDirigentePass,
            cpf: newCongDirigenteCpf,
            role: 'DIRIGENTE',
            churchId: createdCongId // Usa o ID retornado pelo banco
        };

        const res = await addUser(newDirigente);
        if (!res.success) {
            showAlert("Atenção", `Congregação criada, mas houve um erro ao criar o usuário dirigente: ${res.error}`, 'warning');
        } else {
            showAlert("Sucesso", `Congregação "${newCongName}" cadastrada com sucesso!`, 'success');
        }
        
        handleCloseForm();
    } else {
        showAlert("Erro", "Erro ao criar congregação. Tente novamente.", 'danger');
    }
  };

  if (currentChurch?.type !== 'SEDE') {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
        <ShieldAlert size={48} className="mb-4 text-brand-orange"/>
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p>Apenas a Sede pode gerenciar congregações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <Building className="mr-3 text-brand-orange" /> Rede de Congregações
          </h1>
          <p className="text-gray-500 mt-1">Gerenciamento das filiais vinculadas à <strong>{currentChurch.name}</strong></p>
        </div>
        <button 
          onClick={() => { handleCloseForm(); setShowCongregationForm(true); }}
          className="bg-brand-black text-white px-4 py-2 rounded-lg flex items-center hover:bg-gray-800 shadow-lg transform hover:scale-105 transition-all"
        >
          <Plus size={20} className="mr-2"/> Nova Congregação
        </button>
      </div>

      {showCongregationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-down overflow-hidden">
             <div className="bg-brand-black p-4 flex justify-between items-center text-white">
                <h3 className="text-lg font-bold flex items-center">
                    {editingId ? <Edit2 className="mr-2"/> : <Building className="mr-2"/>}
                    {editingId ? 'Editar Congregação' : 'Nova Congregação'}
                </h3>
                <button onClick={handleCloseForm} className="hover:text-brand-orange"><X/></button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-6">
                
                {/* BLOCO DE DADOS GERAIS */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b pb-1">Dados da Igreja</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Congregação</label>
                            <input required className="w-full p-2 border rounded uppercase focus:ring-brand-orange" placeholder="EX: CONGREGAÇÃO JARDIM DAS FLORES" value={newCongName} onChange={e => setNewCongName(e.target.value.toUpperCase())} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço Completo</label>
                            <div className="relative">
                                <MapPin className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                                <input required className="w-full pl-8 p-2 border rounded uppercase focus:ring-brand-orange" value={newCongAddress} onChange={e => setNewCongAddress(e.target.value.toUpperCase())} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Dirigente Responsável</label>
                            <input required className="w-full p-2 border rounded uppercase focus:ring-brand-orange" value={newCongPastorName} onChange={e => setNewCongPastorName(e.target.value.toUpperCase())} />
                        </div>
                    </div>
                </div>

                {/* BLOCO DE CRIAÇÃO DE USUÁRIO - SÓ APARECE SE NÃO ESTIVER EDITANDO */}
                {!editingId && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100 animate-fade-in">
                        <h4 className="text-sm font-bold text-brand-orange uppercase tracking-wider border-b pb-1 flex items-center"><UserPlus size={16} className="mr-2"/> Criar Acesso do Dirigente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                                <input required className="w-full p-2 border rounded focus:ring-brand-orange" placeholder="000.000.000-00" maxLength={14} value={newCongDirigenteCpf} onChange={e => setNewCongDirigenteCpf(formatCPF(e.target.value))} />
                            </div>
                            <div></div> {/* Spacer */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usuário de Acesso</label>
                                <input required className="w-full p-2 border rounded focus:ring-brand-orange" value={newCongDirigenteUser} onChange={e => setNewCongDirigenteUser(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha Inicial</label>
                                <input required type="text" className="w-full p-2 border rounded focus:ring-brand-orange" value={newCongDirigentePass} onChange={e => setNewCongDirigentePass(e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={handleCloseForm} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-brand-orange text-white rounded font-bold hover:bg-brand-red shadow-lg flex items-center">
                        <Save size={18} className="mr-2"/> {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                    </button>
                </div>
             </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {childCongregations.map(cong => (
             <div key={cong.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border border-gray-100 group">
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-brand-black group-hover:bg-brand-black group-hover:text-white transition-colors">
                            <Building size={24}/>
                        </div>
                        <div className="flex flex-col items-end">
                            {cong.active ? (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full mb-2">ATIVA</span>
                            ) : (
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full mb-2">INATIVA</span>
                            )}
                            <button 
                                onClick={() => handleEdit(cong)} 
                                className="text-brand-orange hover:text-brand-red p-1 rounded hover:bg-orange-50 transition-colors"
                                title="Editar Informações"
                            >
                                <Edit2 size={16}/>
                            </button>
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{cong.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 flex items-center"><MapPin size={14} className="mr-1"/> {cong.address}</p>
                    
                    <div className="bg-gray-50 p-3 rounded-lg flex items-center mb-4">
                        <UserIcon size={16} className="text-gray-400 mr-2"/>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Dirigente</p>
                            <p className="text-sm font-medium text-gray-800">{cong.pastorName}</p>
                        </div>
                    </div>
                 </div>
                 <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => handleDelete(cong.id, cong.name)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Excluir Congregação"
                    >
                        <Trash2 size={18}/>
                    </button>
                    <button 
                        onClick={() => handleAccess(cong.id)}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-brand-black hover:text-white hover:border-transparent transition-all flex items-center shadow-sm"
                    >
                        <Eye size={16} className="mr-2"/> Acessar Painel
                    </button>
                 </div>
             </div>
         ))}
         {childCongregations.length === 0 && (
             <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                 <Building size={48} className="mx-auto text-gray-300 mb-3"/>
                 <p className="text-gray-500 font-medium">Nenhuma congregação cadastrada.</p>
                 <button onClick={() => { handleCloseForm(); setShowCongregationForm(true); }} className="text-brand-orange font-bold text-sm mt-2 hover:underline">
                     Cadastrar a primeira
                 </button>
             </div>
         )}
      </div>

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
