
import React, { useState } from 'react';
import { useApp } from '../context';
import { useNavigate } from 'react-router-dom';
import { Building, Users, Eye, Power, Plus, UserPlus, Trash2, Edit2, User, AlertTriangle, CheckCircle, Info, CalendarClock, CreditCard, BadgeCheck, Crown } from 'lucide-react';
import { Church, User as UserType, Member, PlanType, PlanTier } from '../types';
import { PLAN_LIMITS } from '../hooks/usePlanLimits';

const PLAN_LABELS: Record<PlanType, string> = {
  isento: 'Isento',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

const PlanBadge: React.FC<{ plan?: PlanType }> = ({ plan = 'isento' }) => {
  const isIsentos = plan === 'isento';
  return (
    <span className={`px-1.5 py-0.5 text-[8px] md:text-[9px] rounded font-bold ${isIsentos ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
      {PLAN_LABELS[plan] ?? 'Isento'}
    </span>
  );
};

// Helper para gerar UUID v4 (mesma lógica do contexto para garantir consistência)
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const SuperAdminDashboard: React.FC = () => {
  const { churches, members, selectChurch, toggleChurchStatus, addChurch, addUser, addMember, deleteChurch, updateChurch, confirmChurchPayment, systemSettings } = useApp();
  const navigate = useNavigate();
  
  const [showUnifiedForm, setShowUnifiedForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Unified form state — 3 sections
  const [unifiedForm, setUnifiedForm] = useState({
    // Section 1: Church
    churchName: '',
    churchCnpj: '',
    churchAddress: '',
    // Section 2: Pastor
    pastorName: '',
    pastorCpf: '',
    pastorEmail: '',
    pastorPassword: '',
    // Section 3: Plan
    planType: 'isento' as PlanType,
    planTier: 'bronze' as PlanTier,
    dueDay: 10,
    gracePeriod: 5,
    pixKey: '',
  });

  // State for Edit Church Modal
  const [editingChurch, setEditingChurch] = useState<Church | null>(null);

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

  const resetUnifiedForm = () => setUnifiedForm({
    churchName: '', churchCnpj: '', churchAddress: '',
    pastorName: '', pastorCpf: '', pastorEmail: '', pastorPassword: '',
    planType: 'isento', planTier: 'bronze', dueDay: 10, gracePeriod: 5, pixKey: '',
  });

  const handleSaveUnified = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Passo 1: Criar a Igreja com todos os dados de plano já embutidos
    const churchResult = await addChurch({
      id: '',
      name: unifiedForm.churchName.toUpperCase(),
      address: unifiedForm.churchAddress.toUpperCase(),
      pastorName: unifiedForm.pastorName.toUpperCase(),
      cnpj: unifiedForm.churchCnpj,
      active: true,
      type: 'SEDE',
      planType: unifiedForm.planType,
      planTier: unifiedForm.planType !== 'isento' ? unifiedForm.planTier : undefined,
      dueDay: unifiedForm.planType !== 'isento' ? unifiedForm.dueDay : undefined,
      gracePeriod: unifiedForm.gracePeriod,
      pixKey: unifiedForm.pixKey || systemSettings.masterPixKey?.trim() || undefined,
    });

    if (!churchResult.success || !churchResult.id) {
      setIsSaving(false);
      showAlert('Erro ao criar Igreja', `Não foi possível cadastrar a sede: ${churchResult.error}`, 'danger');
      return;
    }

    const churchId = churchResult.id;

    // Passo 2: Criar o Usuário do Pastor (login)
    const sharedId = generateUUID();
    const userResult = await addUser({
      id: sharedId,
      name: unifiedForm.pastorName.toUpperCase(),
      username: unifiedForm.pastorEmail,
      cpf: unifiedForm.pastorCpf,
      password: unifiedForm.pastorPassword,
      churchId,
      role: 'PRESIDENTE',
    });

    if (!userResult.success) {
      setIsSaving(false);
      showAlert(
        'Igreja criada — Erro no Pastor',
        `A sede foi criada, mas houve erro ao criar o acesso do pastor:\n${userResult.error}\n\nAdicione o pastor manualmente pela opção "Cadastrar PR Presidente".`,
        'warning'
      );
      setShowUnifiedForm(false);
      resetUnifiedForm();
      return;
    }

    // Passo 3: Criar o Membro vinculado ao Pastor
    await addMember({
      id: sharedId,
      churchId,
      name: unifiedForm.pastorName.toUpperCase(),
      cpf: unifiedForm.pastorCpf,
      isTither: true,
      birthDate: '',
      address: { street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' },
    });

    setIsSaving(false);
    setShowUnifiedForm(false);
    resetUnifiedForm();
    showAlert('Igreja Criada com Sucesso!', `A sede "${unifiedForm.churchName.toUpperCase()}" foi cadastrada com plano, acesso e perfil do pastor configurados.`, 'success');
  };

  const handleUpdateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChurch) return;

    const res = await updateChurch(editingChurch.id, {
        name: editingChurch.name.toUpperCase(),
        address: editingChurch.address.toUpperCase(),
        pastorName: editingChurch.pastorName.toUpperCase(),
        cnpj: editingChurch.cnpj,
        planType: editingChurch.planType,
        planTier: editingChurch.planTier,
        dueDay: editingChurch.planType !== 'isento' ? editingChurch.dueDay : undefined,
        gracePeriod: editingChurch.gracePeriod,
        paymentPromiseDate: editingChurch.paymentPromiseDate,
        pixKey: editingChurch.pixKey,
    });
    
    if (res.success) {
        setEditingChurch(null);
        showAlert('Sucesso', 'Dados da Sede atualizados com sucesso!', 'success');
    } else {
        showAlert('Erro', `Erro ao atualizar: ${res.error}`, 'danger');
    }
  };

  const handleDeleteChurch = (id: string, name: string) => {
      showConfirm(
          'Excluir Sede',
          `Tem certeza que deseja EXCLUIR a Sede "${name}"?\n\nATENÇÃO: Isso excluirá também todas as congregações filhas e todos os dados vinculados (membros, financeiro, usuários).\n\nEssa ação não pode ser desfeita.`,
          () => deleteChurch(id),
          'danger'
      );
  };

  const PLAN_MONTHS: Record<string, number> = {
    mensal: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12,
  };

  const handleDarBaixa = (church: Church) => {
    showConfirm(
      'Dar Baixa no Pagamento',
      `Confirmar recebimento do pagamento de "${church.name}"?\n\nIsso reativará o acesso (status ON), registrará a data de hoje como último pagamento e atualizará o próximo vencimento conforme o ciclo do plano.`,
      async () => {
        const res = await confirmChurchPayment(church.id);
        if (res.success && res.nextDueDate) {
          const nice = new Date(res.nextDueDate + 'T00:00:00').toLocaleDateString('pt-BR');
          showAlert('Baixa Registrada!', `Pagamento de "${church.name}" confirmado e acesso liberado.\nPróximo vencimento: ${nice}.`, 'success');
        } else {
          showAlert('Erro', `Não foi possível registrar o pagamento: ${res.error ?? 'erro desconhecido'}`, 'danger');
        }
      },
      'warning'
    );
  };


  return (
    <div className="space-y-4">
      {/* Header Stats - COMPACTO */}
      <div className="bg-brand-black text-white p-4 md:p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="z-10">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">Painel Master</h1>
          <p className="text-gray-400 text-xs md:text-sm">Bem-vindo, Administrador Geral.</p>
          <button
            onClick={() => navigate('/admin/configuracoes-saas')}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Crown size={13} />
            Configurações Master do SaaS
          </button>
        </div>
        <div className="flex space-x-6 mt-4 md:mt-0 z-10">
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-brand-orange">{churches.length}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Unidades</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-bold text-brand-yellow">{totalMembers}</p>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">Membros</p>
          </div>
        </div>
        {/* Decorative BG */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-dark to-transparent opacity-50 pointer-events-none"></div>
      </div>

      {/* Action Button — Unified */}
      <div>
        <button
          onClick={() => { resetUnifiedForm(); setShowUnifiedForm(true); }}
          className="w-full p-4 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all group shadow-sm"
        >
          <div className="bg-brand-black text-white p-2 rounded-full mr-3 group-hover:scale-110 transition-transform">
            <Plus size={18}/>
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-gray-800">Cadastrar Nova Igreja Sede</h3>
            <p className="text-xs text-gray-500">Igreja + Pastor Presidente + Plano — tudo em um único formulário</p>
          </div>
        </button>
      </div>

      {/* Modal Unificado — Nova Igreja Sede */}
      {showUnifiedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-fade-in-down">
            <div className="h-1.5 bg-brand-orange rounded-t-xl"/>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Building size={20} className="text-brand-orange"/> Cadastrar Nova Igreja Sede
                </h3>
                <button onClick={() => setShowUnifiedForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveUnified} className="space-y-6">

                {/* SEÇÃO 1 — Dados da Igreja */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Dados da Igreja Sede</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Igreja *</label>
                      <input required className="w-full p-2 border rounded text-sm uppercase" placeholder="Ex: AD EM SÃO PAULO" value={unifiedForm.churchName} onChange={e => setUnifiedForm({...unifiedForm, churchName: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                      <input className="w-full p-2 border rounded text-sm" placeholder="00.000.000/0001-00" maxLength={18} value={unifiedForm.churchCnpj} onChange={e => setUnifiedForm({...unifiedForm, churchCnpj: formatCNPJ(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço *</label>
                      <input required className="w-full p-2 border rounded text-sm uppercase" placeholder="Rua, Nº — Cidade/UF" value={unifiedForm.churchAddress} onChange={e => setUnifiedForm({...unifiedForm, churchAddress: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100"/>

                {/* SEÇÃO 2 — Pastor Presidente */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Cadastro do Pastor Presidente</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Completo *</label>
                      <input required className="w-full p-2 border rounded text-sm uppercase" placeholder="NOME DO PASTOR" value={unifiedForm.pastorName} onChange={e => setUnifiedForm({...unifiedForm, pastorName: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CPF</label>
                      <input className="w-full p-2 border rounded text-sm" placeholder="000.000.000-00" maxLength={14} value={unifiedForm.pastorCpf} onChange={e => setUnifiedForm({...unifiedForm, pastorCpf: formatCPF(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail / Login *</label>
                      <input required type="email" className="w-full p-2 border rounded text-sm" placeholder="pastor@email.com" value={unifiedForm.pastorEmail} onChange={e => setUnifiedForm({...unifiedForm, pastorEmail: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha de Primeiro Acesso *</label>
                      <input required type="password" className="w-full p-2 border rounded text-sm" placeholder="Mínimo 6 caracteres" minLength={6} value={unifiedForm.pastorPassword} onChange={e => setUnifiedForm({...unifiedForm, pastorPassword: e.target.value})} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100"/>

                {/* SEÇÃO 3 — Plano */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Plano e Configurações de Cobrança</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ciclo de Cobrança *</label>
                      <select required className="w-full p-2 border rounded text-sm" value={unifiedForm.planType} onChange={e => setUnifiedForm({...unifiedForm, planType: e.target.value as PlanType})}>
                        <option value="isento">Isento</option>
                        <option value="mensal">Mensal</option>
                        <option value="bimestral">Bimestral</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tier do Plano</label>
                      <select className="w-full p-2 border rounded text-sm" value={unifiedForm.planTier} disabled={unifiedForm.planType === 'isento'} onChange={e => setUnifiedForm({...unifiedForm, planTier: e.target.value as PlanTier})}>
                        <option value="bronze">Bronze — até 100 membros, 2 cong.</option>
                        <option value="prata">Prata — até 300 membros, 5 cong.</option>
                        <option value="ouro">Ouro — até 700 membros, 10 cong.</option>
                        <option value="diamond">Diamond — ilimitado</option>
                      </select>
                      {unifiedForm.planType === 'isento' && <p className="text-[10px] text-gray-400 mt-1">Igrejas isentas têm acesso ilimitado.</p>}
                    </div>
                    {unifiedForm.planType !== 'isento' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia de Vencimento</label>
                        <input type="number" min={1} max={28} className="w-full p-2 border rounded text-sm" value={unifiedForm.dueDay} onChange={e => setUnifiedForm({...unifiedForm, dueDay: parseInt(e.target.value) || 10})} />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias de Carência</label>
                      <input type="number" min={0} max={30} className="w-full p-2 border rounded text-sm" value={unifiedForm.gracePeriod} onChange={e => setUnifiedForm({...unifiedForm, gracePeriod: parseInt(e.target.value) ?? 5})} />
                    </div>
                    <div className={unifiedForm.planType !== 'isento' ? '' : 'md:col-span-2'}>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave PIX</label>
                      <input type="text" className="w-full p-2 border rounded text-sm" placeholder="Chave PIX da igreja" value={unifiedForm.pixKey} onChange={e => setUnifiedForm({...unifiedForm, pixKey: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowUnifiedForm(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancelar</button>
                  <button
                    type="submit"
                    disabled={isSaving || !unifiedForm.churchName || !unifiedForm.churchAddress || !unifiedForm.pastorName || !unifiedForm.pastorEmail || !unifiedForm.pastorPassword}
                    className="px-6 py-2 bg-brand-orange text-white rounded-lg text-sm font-bold hover:bg-brand-red disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSaving ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"/><span>Salvando...</span></>
                    ) : (
                      <><Plus size={15}/><span>Salvar e Gerar Igreja</span></>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Church Modal */}
      {editingChurch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg animate-fade-in-down border-l-4 border-blue-500 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4 flex items-center"><Edit2 size={20} className="mr-2"/> Editar Sede</h3>
                <form onSubmit={handleUpdateChurch} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Igreja</label>
                            <input required className="w-full p-2 border rounded uppercase text-sm" value={editingChurch.name} onChange={e => setEditingChurch({...editingChurch, name: e.target.value.toUpperCase()})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ</label>
                            <input className="w-full p-2 border rounded text-sm" maxLength={18} value={editingChurch.cnpj || ''} onChange={e => setEditingChurch({...editingChurch, cnpj: formatCNPJ(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço</label>
                            <input required className="w-full p-2 border rounded uppercase text-sm" value={editingChurch.address} onChange={e => setEditingChurch({...editingChurch, address: e.target.value.toUpperCase()})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pastor Responsável</label>
                            <input required className="w-full p-2 border rounded uppercase text-sm" value={editingChurch.pastorName} onChange={e => setEditingChurch({...editingChurch, pastorName: e.target.value.toUpperCase()})} />
                        </div>
                    </div>

                    <hr className="border-gray-200"/>
                    <div className="flex items-center gap-2 mb-1">
                        <CreditCard size={15} className="text-blue-600"/>
                        <span className="text-xs font-bold text-gray-600 uppercase">Plano e Cobrança</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Plano</label>
                            <select
                                className="w-full p-2 border rounded text-sm"
                                value={editingChurch.planType || 'isento'}
                                onChange={e => setEditingChurch({...editingChurch, planType: e.target.value as PlanType})}
                            >
                                <option value="isento">Isento</option>
                                <option value="mensal">Mensal</option>
                                <option value="bimestral">Bimestral</option>
                                <option value="trimestral">Trimestral</option>
                                <option value="semestral">Semestral</option>
                                <option value="anual">Anual</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tier do Plano</label>
                            <select
                                className="w-full p-2 border rounded text-sm"
                                value={editingChurch.planTier || 'bronze'}
                                onChange={e => setEditingChurch({...editingChurch, planTier: e.target.value as PlanTier})}
                                disabled={editingChurch.planType === 'isento'}
                            >
                                <option value="bronze">Bronze — até 100 membros, 2 cong.</option>
                                <option value="prata">Prata — até 300 membros, 5 cong.</option>
                                <option value="ouro">Ouro — até 700 membros, 10 cong.</option>
                                <option value="diamond">Diamond — ilimitado</option>
                            </select>
                            {editingChurch.planType === 'isento' && (
                                <p className="text-[10px] text-gray-400 mt-1">Igrejas isentas têm acesso ilimitado independente do tier.</p>
                            )}
                        </div>

                        {editingChurch.planType && editingChurch.planType !== 'isento' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia de Vencimento</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={28}
                                    className="w-full p-2 border rounded text-sm"
                                    value={editingChurch.dueDay ?? 10}
                                    onChange={e => setEditingChurch({...editingChurch, dueDay: parseInt(e.target.value) || 10})}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dias de Carência</label>
                            <input
                                type="number"
                                min={0}
                                max={30}
                                className="w-full p-2 border rounded text-sm"
                                value={editingChurch.gracePeriod ?? 5}
                                onChange={e => setEditingChurch({...editingChurch, gracePeriod: parseInt(e.target.value) ?? 5})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave PIX</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded text-sm"
                                placeholder="Chave PIX"
                                value={editingChurch.pixKey || ''}
                                onChange={e => setEditingChurch({...editingChurch, pixKey: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <CalendarClock size={12}/> Promessa de Pagamento
                        </label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded text-sm"
                            value={editingChurch.paymentPromiseDate || ''}
                            onChange={e => setEditingChurch({...editingChurch, paymentPromiseDate: e.target.value || undefined})}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Se preenchida, o acesso fica liberado até esta data mesmo com pagamento em atraso.</p>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                        <button type="button" onClick={() => setEditingChurch(null)} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-bold">Atualizar</button>
                    </div>
                </form>
            </div>
        </div>
      )}


      {/* Super Vision Module - COMPACT LIST */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="p-3 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-sm md:text-base font-bold text-gray-800 flex items-center"><Eye className="mr-2 text-brand-black" size={18}/> Super Visão Global</h2>
          <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded border">{activeChurches} Igrejas Ativas</span>
        </div>
        <div className="w-full">
            <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-100">
                <tr>
                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase w-auto">Unidade / Detalhes</th>
                <th className="hidden md:table-cell px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase w-20">Tipo</th>
                <th className="hidden md:table-cell px-2 py-2 text-left text-[10px] font-bold text-gray-500 uppercase w-1/3">Pastor</th>
                <th className="hidden md:table-cell px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase w-20">Plano</th>
                <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase w-14">Status</th>
                <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-500 uppercase w-36">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {churches.filter(c => c.type === 'SEDE').map((church) => (
                <React.Fragment key={church.id}>
                    {/* SEDE ROW */}
                    <tr className="hover:bg-gray-50 bg-white">
                    <td className="px-2 py-2 overflow-hidden">
                        <div className="flex items-start">
                            <div className="h-8 w-8 bg-brand-black text-white rounded flex items-center justify-center mr-2 shrink-0 mt-1">
                                <Building size={16}/>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs md:text-sm text-gray-900 truncate uppercase">{church.name}</div>
                                <div className="text-[10px] text-gray-500 truncate">{church.address}</div>
                                
                                {/* Consumption bars */}
                                {church.planTier && church.planTier !== 'diamond' && church.planType !== 'isento' && (() => {
                                    const lim = PLAN_LIMITS[church.planTier!];
                                    const mCount = members.filter(m => m.churchId === church.id).length;
                                    const cCount = churches.filter(c => c.parentId === church.id).length;
                                    const mPct = Math.min(100, Math.round((mCount / lim.sedeMembers) * 100));
                                    const cPct = Math.min(100, Math.round((cCount / lim.maxCongs) * 100));
                                    const barColor = (pct: number) => pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-emerald-400';
                                    return (
                                        <div className="mt-1.5 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] text-gray-400 w-12 shrink-0">Membros</span>
                                                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColor(mPct)}`} style={{ width: `${mPct}%` }} />
                                                </div>
                                                <span className={`text-[8px] font-bold shrink-0 ${mPct >= 100 ? 'text-red-600' : 'text-gray-500'}`}>{mCount}/{lim.sedeMembers}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[8px] text-gray-400 w-12 shrink-0">Cong.</span>
                                                <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColor(cPct)}`} style={{ width: `${cPct}%` }} />
                                                </div>
                                                <span className={`text-[8px] font-bold shrink-0 ${cPct >= 100 ? 'text-red-600' : 'text-gray-500'}`}>{cCount}/{lim.maxCongs}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* MOBILE DATA VISIBLE HERE (Stacked) */}
                                <div className="md:hidden mt-1 flex flex-wrap gap-1 items-center">
                                    <span className="bg-blue-100 text-blue-800 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">SEDE</span>
                                    <span className="text-[9px] text-gray-700 flex items-center truncate">
                                        <User size={10} className="mr-1"/> {church.pastorName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="hidden md:table-cell px-2 py-2 text-[10px] font-bold text-gray-500">SEDE</td>
                    <td className="hidden md:table-cell px-2 py-2 text-xs text-gray-600 truncate">{church.pastorName}</td>
                    <td className="hidden md:table-cell px-2 py-2 text-center">
                        <PlanBadge plan={church.planType} />
                    </td>
                    <td className="px-2 py-2 text-center">
                        <span className={`px-1 py-0.5 text-[8px] md:text-[9px] rounded font-bold ${church.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {church.active ? 'ON' : 'OFF'}
                        </span>
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                        <div className="flex justify-end space-x-1">
                            <button 
                            onClick={() => handleEnterChurch(church.id)}
                            className="p-1.5 bg-brand-black text-white rounded hover:bg-gray-800 transition-colors"
                            title="Acessar Painel"
                            >
                            <Eye size={14}/>
                            </button>
                            <button 
                            onClick={() => setEditingChurch({
                              ...church,
                              planTier: church.planTier ?? 'bronze',
                              // Se a igreja ainda não possui PIX, abre com o PIX master pré-preenchido.
                              pixKey: church.pixKey?.trim() || systemSettings.masterPixKey?.trim() || '',
                            })}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                            title="Editar"
                            >
                            <Edit2 size={14} />
                            </button>
                            {church.planType && church.planType !== 'isento' && (
                            <button
                              onClick={() => handleDarBaixa(church)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-colors"
                              title="Dar Baixa no Pagamento"
                            >
                              <BadgeCheck size={14} />
                            </button>
                            )}
                            <button 
                            onClick={() => toggleChurchStatus(church.id)}
                            className={`p-1.5 rounded transition-colors ${church.active ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title="Status"
                            >
                            <Power size={14} />
                            </button>
                            <button 
                            onClick={() => handleDeleteChurch(church.id, church.name)}
                            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                            title="Excluir"
                            >
                            <Trash2 size={14} />
                            </button>
                        </div>
                    </td>
                    </tr>
                    {/* CONGREGATION ROWS (Nested) */}
                    {churches.filter(child => child.parentId === church.id).map(child => (
                    <tr key={child.id} className="hover:bg-gray-50 bg-gray-50/30">
                        <td className="px-2 py-2 pl-6 md:pl-12 relative overflow-hidden">
                            <div className="absolute left-4 md:left-8 top-1/2 w-2 h-[1px] bg-gray-300"></div>
                            <div className="flex items-start">
                                <div className="h-6 w-6 bg-gray-200 text-gray-500 rounded flex items-center justify-center mr-2 shrink-0 mt-0.5">
                                    <Users size={12}/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-[11px] md:text-xs text-gray-600 truncate uppercase">{child.name}</div>
                                    
                                    {/* MOBILE DATA VISIBLE HERE (Stacked) */}
                                    <div className="md:hidden mt-0.5 flex flex-wrap gap-1 items-center">
                                        <span className="bg-gray-200 text-gray-600 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase">CONG.</span>
                                        <span className="text-[9px] text-gray-500 flex items-center truncate">
                                            <User size={10} className="mr-1"/> {child.pastorName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td className="hidden md:table-cell px-2 py-2 text-[10px] text-gray-400">CONG.</td>
                        <td className="hidden md:table-cell px-2 py-2 text-xs text-gray-500 truncate">{child.pastorName}</td>
                        <td className="hidden md:table-cell px-2 py-2"></td>
                        <td className="px-2 py-2 text-center">
                        <span className={`px-1 py-0.5 text-[8px] md:text-[9px] rounded font-bold ${child.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {child.active ? 'ON' : 'OFF'}
                        </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                        <button 
                            onClick={() => handleEnterChurch(child.id)}
                            className="p-1 border border-gray-300 text-gray-600 rounded hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                            title="Ver"
                        >
                            <Eye size={12}/>
                        </button>
                        </td>
                    </tr>
                    ))}
                </React.Fragment>
                ))}
                {churches.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-4 text-xs text-gray-500">Nenhuma igreja cadastrada.</td>
                    </tr>
                )}
            </tbody>
            </table>
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
    </div>
  );
};
