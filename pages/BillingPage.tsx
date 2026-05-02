import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, ShieldCheck, Receipt, CheckCircle, Clock, AlertCircle,
  Zap, ChevronRight, X, Copy, RefreshCw, Gift, Users, Building2,
  Star, Crown, Gem, TrendingUp, Info, MessageCircle, Home
} from 'lucide-react';
import { useApp } from '../context';
import { PlanType, PlanTier } from '../types';
import {
  usePlanLimits, PLAN_LIMITS, CYCLE_DISCOUNTS, CYCLE_MONTHS, CYCLE_LABELS,
  calcPrice, calcSavings, TierLimits
} from '../hooks/usePlanLimits';

// RBAC: apenas estes cargos podem visualizar/interagir com a janela na SEDE.
const BILLING_ROLES = ['PRESIDENTE', 'VICE_PRESIDENTE', 'TESOUREIRO', 'SECRETARIO'];

type InvoiceStatus = 'PAGO' | 'PENDENTE' | 'VENCIDO';

interface Invoice {
  id: string;
  month: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidDate?: string;
}

const MONTH_NAMES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const formatPeriodLabel = (date: Date, months: number) => {
  if (months <= 1) return `${MONTH_NAMES_PT[date.getMonth()]} ${date.getFullYear()}`;
  const end = new Date(date);
  const start = new Date(date);
  start.setMonth(start.getMonth() - (months - 1));
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${MONTH_NAMES_PT[start.getMonth()].slice(0,3)}–${MONTH_NAMES_PT[end.getMonth()].slice(0,3)} ${end.getFullYear()}`;
  }
  return `${MONTH_NAMES_PT[start.getMonth()].slice(0,3)}/${start.getFullYear()} – ${MONTH_NAMES_PT[end.getMonth()].slice(0,3)}/${end.getFullYear()}`;
};

const toIsoDate = (d: Date) => d.toISOString().split('T')[0];

const TIER_META: Record<string, { icon: React.FC<{size?: number; className?: string}>, color: string, border: string, bg: string, badge?: string }> = {
  bronze:  { icon: TrendingUp, color: 'text-amber-600',   border: 'border-amber-500/40',  bg: 'from-amber-500/8' },
  prata:   { icon: Star,       color: 'text-slate-400',   border: 'border-slate-400/40',  bg: 'from-slate-400/8', badge: 'Popular' },
  ouro:    { icon: Crown,      color: 'text-yellow-400',  border: 'border-yellow-500/40', bg: 'from-yellow-500/8' },
  diamond: { icon: Gem,        color: 'text-cyan-400',    border: 'border-cyan-500/40',   bg: 'from-cyan-500/8',  badge: 'Melhor valor' },
};

const CYCLES: PlanType[] = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'];
const TIERS = ['bronze', 'prata', 'ouro', 'diamond'] as const;

export const BillingPage: React.FC = () => {
  const { user, currentChurch, systemSettings } = useApp();
  const planLimits = usePlanLimits();
  const isIsento    = currentChurch?.planType === 'isento';
  // PIX exibido na cobrança do SaaS: por padrão usa o PIX master do dono do sistema;
  // fallback para o PIX cadastrado na própria igreja apenas se o master não estiver configurado.
  const billingPix  = (systemSettings.masterPixKey?.trim() || currentChurch?.pixKey?.trim() || '');
  const [isLoading, setIsLoading]       = useState(true);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [copied, setCopied]             = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<PlanType>(
    (currentChurch?.planType && currentChurch.planType !== 'isento') ? currentChurch.planType : 'mensal'
  );
  const [selectedTier, setSelectedTier] = useState<PlanTier>(
    (currentChurch?.planTier as PlanTier) || 'bronze'
  );

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  // ---- Cálculo do próximo vencimento real (baseado no dueDay, não na promessa) ----
  const billingStatus = React.useMemo(() => {
    if (!currentChurch || !currentChurch.planType || currentChurch.planType === 'isento') {
      return { nextDueDate: null, isOnTime: true, isInGrace: false, isLate: false, hasActivePromise: false, promiseDate: null };
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDay = currentChurch.dueDay ?? 10;
    const months = CYCLE_MONTHS[currentChurch.planType as PlanType] ?? 1;
    const gracePeriod = currentChurch.gracePeriod ?? 5;

    // Próximo vencimento calculado a partir do último pagamento + ciclo, usando o dueDay original
    let nextDue: Date;
    if (currentChurch.lastPaymentDate) {
      const last = new Date(currentChurch.lastPaymentDate + 'T00:00:00');
      nextDue = new Date(last.getFullYear(), last.getMonth() + months, dueDay);
    } else {
      nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (nextDue < today) nextDue = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }

    const graceDate = new Date(nextDue);
    graceDate.setDate(graceDate.getDate() + gracePeriod);

    const promiseDate = currentChurch.paymentPromiseDate
      ? new Date(currentChurch.paymentPromiseDate + 'T00:00:00')
      : null;
    const hasActivePromise = promiseDate ? promiseDate >= today : false;

    const isOnTime  = today <= nextDue;
    const isInGrace = !isOnTime && today <= graceDate;
    const isLate    = !isOnTime && !isInGrace;

    return { nextDueDate: nextDue, isOnTime, isInGrace, isLate, hasActivePromise, promiseDate };
  }, [currentChurch?.dueDay, currentChurch?.gracePeriod, currentChurch?.planType, currentChurch?.lastPaymentDate, currentChurch?.paymentPromiseDate]);

  // ---- Histórico de faturas DERIVADO do plano cadastrado da igreja ----
  const invoices: Invoice[] = React.useMemo(() => {
    if (!currentChurch || !currentChurch.planType || currentChurch.planType === 'isento') {
      return [];
    }
    const tierKey = currentChurch.planTier || 'bronze'; // fallback se tier não cadastrado
    const cycle   = currentChurch.planType;
    const months  = CYCLE_MONTHS[cycle] ?? 1;
    const dueDay  = currentChurch.dueDay ?? 10;
    const basePrice = PLAN_LIMITS[tierKey]?.basePrice ?? 0;
    const cyclePrice = calcPrice(basePrice, cycle, months);

    // Âncora de vencimento: sempre calculada pelo dueDay original, nunca pela promessa
    let nextDue: Date;
    if (currentChurch.lastPaymentDate) {
      const last = new Date(currentChurch.lastPaymentDate + 'T00:00:00');
      nextDue = new Date(last.getFullYear(), last.getMonth() + months, dueDay);
    } else {
      const now = new Date();
      nextDue = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    }

    const lastPaid = currentChurch.lastPaymentDate
      ? new Date(currentChurch.lastPaymentDate + 'T00:00:00')
      : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const HISTORY_LENGTH = 5;
    const list: Invoice[] = [];

    for (let i = 0; i < HISTORY_LENGTH; i++) {
      const due = new Date(nextDue.getFullYear(), nextDue.getMonth() - i * months, dueDay);

      const isCurrent = i === 0;
      let status: InvoiceStatus;
      let paidDate: string | undefined;

      if (isCurrent) {
        status = (currentChurch.active === false || due < today) ? 'VENCIDO' : 'PENDENTE';
      } else {
        status = 'PAGO';
        if (lastPaid && i === 1) {
          paidDate = toIsoDate(lastPaid);
        } else {
          const estimated = new Date(due);
          estimated.setDate(estimated.getDate() - 3);
          paidDate = toIsoDate(estimated);
        }
      }

      list.push({
        id: `${tierKey}-${cycle}-${i}`,
        month: formatPeriodLabel(due, months),
        amount: cyclePrice,
        status,
        dueDate: toIsoDate(due),
        paidDate,
      });
    }

    return list;
  }, [currentChurch?.planTier, currentChurch?.planType, currentChurch?.dueDay, currentChurch?.lastPaymentDate, currentChurch?.active]);

  // Visibilidade estrita: somente no painel da SEDE.
  if (currentChurch && currentChurch.type !== 'SEDE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Home size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Disponível apenas na Sede</h2>
        <p className="text-slate-400 max-w-md">
          A janela "Pagamentos do Sistema" só pode ser acessada a partir do painel da igreja Sede.
          Selecione a sua sede no seletor de igreja para gerenciar a assinatura.
        </p>
      </div>
    );
  }

  if (!user || !BILLING_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <ShieldCheck size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-slate-400">Apenas Pastor Presidente, Vice-Presidente e Tesoureiro podem acessar esta área.</p>
      </div>
    );
  }

  const handleCopyPix = () => {
    if (!billingPix) return;
    navigator.clipboard.writeText(billingPix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Botão "Contratar Novo Plano": abre WhatsApp do dono do sistema com mensagem pré-definida.
  const openWhatsAppCheckout = (tierId: PlanTier, cycle: PlanType) => {
    const tierLabel = PLAN_LIMITS[tierId]?.label ?? tierId;
    const cycleLabel = CYCLE_LABELS[cycle] ?? cycle;
    const churchName = currentChurch?.name ?? 'minha igreja';
    const msg = `Olá! Quero contratar o plano ${tierLabel} no ciclo ${cycleLabel} para a minha igreja (${churchName}).`;
    const phone = (systemSettings.salesPhone || '').replace(/\D+/g, '');
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
    const map = {
      PAGO:     { label: 'Pago',     icon: CheckCircle, cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
      PENDENTE: { label: 'Pendente', icon: Clock,        cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
      VENCIDO:  { label: 'Vencido',  icon: AlertCircle,  cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
    };
    const { label, icon: Icon, cls } = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cls}`}>
        <Icon size={11} />
        {label}
      </span>
    );
  };

  const SkeletonRow = () => (
    <div className="flex items-center justify-between py-4 px-5 border-b border-slate-800 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-slate-700" />
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-slate-700 rounded" />
          <div className="h-3 w-20 bg-slate-800 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-6 w-20 bg-slate-700 rounded-full" />
        <div className="h-4 w-16 bg-slate-800 rounded" />
      </div>
    </div>
  );

  const UsageBar: React.FC<{
    label: string;
    icon: React.FC<{size?: number; className?: string}>;
    current: number;
    limit: number;
    percent: number;
    isUnlimited: boolean;
  }> = ({ label, icon: Icon, current, limit, percent, isUnlimited }) => {
    const color = percent >= 100
      ? 'bg-red-500'
      : percent >= 80
      ? 'bg-yellow-500'
      : 'bg-emerald-500';

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Icon size={13} />
            {label}
          </span>
          <span className={`font-bold ${isUnlimited ? 'text-emerald-400' : percent >= 100 ? 'text-red-400' : percent >= 80 ? 'text-yellow-400' : 'text-white'}`}>
            {isUnlimited ? 'Ilimitado' : `${current} / ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${color}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  const currentTierKey = planLimits.tier;
  const currentTierLimits = planLimits.limits;
  const isUnlimitedTier = currentTierKey === 'diamond' || currentTierKey === 'isento';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <CreditCard size={26} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pagamentos do Sistema</h1>
          <p className="text-slate-400 text-sm">Gerencie sua assinatura e histórico de faturas</p>
        </div>
      </div>

      {/* Plan Status Card */}
      {isIsento ? (
        <div className="relative bg-slate-900 rounded-2xl border border-purple-500/30 overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-transparent to-transparent pointer-events-none" />
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/25 shrink-0">
                  <Gift size={28} className="text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Atual</p>
                  <h2 className="text-xl font-bold text-white">Isento de Cobrança</h2>
                  <p className="text-slate-400 text-sm mt-0.5">Esta igreja não está sujeita a cobranças mensais.</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-full font-extrabold text-lg shrink-0">
                <Gift size={16} /> Isento
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
          <div className={`absolute inset-0 bg-gradient-to-br ${TIER_META[currentTierKey]?.bg ?? 'from-emerald-500/5'} via-transparent to-transparent pointer-events-none`} />
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl border shrink-0 ${TIER_META[currentTierKey]?.border ?? 'border-emerald-500/25'} bg-white/5`}>
                  {(() => { const Icon = TIER_META[currentTierKey]?.icon ?? ShieldCheck; return <Icon size={28} className={TIER_META[currentTierKey]?.color ?? 'text-emerald-400'} />; })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Atual</p>
                  <h2 className="text-xl font-bold text-white capitalize">
                    {currentTierLimits.label} · {CYCLE_LABELS[currentChurch?.planType as PlanType] ?? 'Mensal'}
                  </h2>
                  {billingStatus.nextDueDate ? (
                    <p className="text-slate-400 text-sm mt-0.5">
                      Próximo vencimento:{' '}
                      <span className={`font-semibold ${billingStatus.isOnTime ? 'text-emerald-400' : billingStatus.isInGrace ? 'text-yellow-400' : 'text-red-400'}`}>
                        {billingStatus.nextDueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm mt-0.5">Sem vencimento registrado</p>
                  )}
                  {billingStatus.hasActivePromise && billingStatus.promiseDate && (billingStatus.isInGrace || billingStatus.isLate) && (
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={11} className="text-yellow-500" />
                      Acesso liberado por promessa até:{' '}
                      <span className="text-yellow-400 font-semibold">
                        {billingStatus.promiseDate.toLocaleDateString('pt-BR')}
                      </span>
                    </p>
                  )}
                  {currentChurch?.lastPaymentDate && (
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                      <CheckCircle size={11} className="text-emerald-500" />
                      Último pagamento:{' '}
                      {new Date(currentChurch.lastPaymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {billingStatus.isOnTime ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold">
                    <CheckCircle size={12} /> Em dia
                  </span>
                ) : billingStatus.isInGrace ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-bold">
                    <Clock size={12} /> Em atraso
                  </span>
                ) : billingStatus.hasActivePromise ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-bold">
                    <Clock size={12} /> Acesso prometido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-full text-xs font-bold">
                    <AlertCircle size={12} /> Bloqueado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resource Usage */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
          <TrendingUp size={16} className="text-slate-400" />
          <h3 className="text-white font-bold text-sm">Uso dos Recursos</h3>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-500">
            <Info size={10} />
            Baseado no plano {currentTierLimits.label}
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <UsageBar
            label="Membros"
            icon={Users}
            current={planLimits.currentMemberCount}
            limit={planLimits.memberLimit}
            percent={planLimits.memberPercent}
            isUnlimited={isUnlimitedTier}
          />
          <UsageBar
            label="Congregações"
            icon={Building2}
            current={planLimits.currentCongCount}
            limit={planLimits.congLimit}
            percent={planLimits.congPercent}
            isUnlimited={isUnlimitedTier}
          />
        </div>
        {!isUnlimitedTier && (planLimits.memberPercent >= 80 || planLimits.congPercent >= 80) && (
          <div className="px-5 pb-4">
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl text-xs text-yellow-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Você está se aproximando do limite do seu plano. Considere fazer upgrade para continuar crescendo.</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isIsento && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* PIX copy card */}
          <button
            onClick={handleCopyPix}
            disabled={!billingPix}
            className={`flex items-center justify-between gap-3 bg-slate-900 border rounded-xl p-5 transition-all group shadow-lg text-left
              ${billingPix
                ? copied
                  ? 'border-emerald-500/60 bg-emerald-500/5 cursor-pointer'
                  : 'border-slate-700 hover:bg-slate-800 hover:border-emerald-500/40 cursor-pointer'
                : 'border-slate-800 opacity-50 cursor-not-allowed'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-lg border transition-colors ${copied ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20'}`}>
                {copied ? <CheckCircle size={22} className="text-emerald-400" /> : <Copy size={22} className="text-emerald-400" />}
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {copied ? 'Chave PIX copiada!' : 'Copiar Chave PIX'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {billingPix
                    ? copied
                      ? 'Cole no seu app de pagamento'
                      : billingPix.length > 30 ? billingPix.slice(0, 30) + '…' : billingPix
                    : 'Nenhuma chave PIX cadastrada'}
                </p>
              </div>
            </div>
            {!copied && billingPix && (
              <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
            )}
          </button>

          {/* View plans */}
          <button
            onClick={() => setShowPlansModal(true)}
            className="flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/40 rounded-xl p-5 transition-all group shadow-lg text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <Zap size={22} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Ver Planos Disponíveis</p>
                <p className="text-slate-500 text-xs mt-0.5">Compare tiers e ciclos de cobrança</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
          </button>
        </div>
      )}

      {/* Invoice History */}
      {isIsento ? (
        <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
            <Receipt size={18} className="text-slate-400" />
            <h3 className="text-white font-bold">Histórico de Faturas</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4">
              <Gift size={32} className="text-purple-400" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Sem cobranças</p>
            <p className="text-slate-500 text-sm">Esta igreja está cadastrada como isenta e não possui faturas geradas.</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <Receipt size={18} className="text-slate-400" />
              <h3 className="text-white font-bold">Histórico de Faturas</h3>
            </div>
            <button onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <RefreshCw size={12} />
              Atualizar
            </button>
          </div>
          <div>
            {isLoading ? (
              <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : (
              invoices.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Nenhuma fatura disponível para o plano atual.
                </div>
              ) : (
              invoices.map((inv, idx) => (
                <div key={inv.id} className={`flex items-center justify-between py-4 px-5 ${idx < invoices.length - 1 ? 'border-b border-slate-800' : ''} hover:bg-slate-800/40 transition-colors`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${inv.status === 'PAGO' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                      {inv.status === 'PAGO' ? <CheckCircle size={16} className="text-emerald-400" /> : <Clock size={16} className="text-yellow-400" />}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{inv.month}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {inv.status === 'PAGO' && inv.paidDate
                          ? `Pago em ${new Date(inv.paidDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : `Vence em ${new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <StatusBadge status={inv.status} />
                    <p className="text-white font-bold text-sm hidden sm:block">
                      R$ {inv.amount.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              ))
              )
            )}
          </div>
        </div>
      )}

      {/* Plans Modal */}
      {showPlansModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Zap size={18} className="text-blue-400" />
                <h3 className="text-white font-bold text-lg">Planos Disponíveis</h3>
              </div>
              <button onClick={() => setShowPlansModal(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            {/* Cycle Selector */}
            <div className="px-6 pt-5 shrink-0">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">Ciclo de Cobrança</p>
              <div className="flex flex-wrap gap-2">
                {CYCLES.map(cycle => {
                  const disc = CYCLE_DISCOUNTS[cycle];
                  const isActive = selectedCycle === cycle;
                  return (
                    <button
                      key={cycle}
                      onClick={() => setSelectedCycle(cycle)}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="capitalize">{CYCLE_LABELS[cycle]}</span>
                      {disc > 0 && (
                        <span className={`text-[9px] mt-0.5 font-extrabold ${isActive ? 'text-emerald-400' : 'text-emerald-500/70'}`}>
                          -{Math.round(disc * 100)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {CYCLE_DISCOUNTS[selectedCycle] > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <CheckCircle size={12} />
                  Desconto de {Math.round(CYCLE_DISCOUNTS[selectedCycle] * 100)}% aplicado no ciclo {CYCLE_LABELS[selectedCycle].toLowerCase()} ({CYCLE_MONTHS[selectedCycle]} meses)
                </div>
              )}
            </div>

            {/* Tier Cards */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto">
              {TIERS.map(tierId => {
                const limits = PLAN_LIMITS[tierId];
                const meta   = TIER_META[tierId];
                const Icon   = meta.icon;
                const baseP  = limits.basePrice;
                const months = CYCLE_MONTHS[selectedCycle];
                const totalP = calcPrice(baseP, selectedCycle, months);
                const perMth = baseP * (1 - CYCLE_DISCOUNTS[selectedCycle]);
                const saved  = calcSavings(baseP, selectedCycle);
                const isCurrent = currentChurch?.planTier === tierId;
                const isUnlim   = tierId === 'diamond';

                const isSelected = selectedTier === tierId;
                return (
                  <motion.button
                    type="button"
                    key={tierId}
                    onClick={() => setSelectedTier(tierId)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all text-left cursor-pointer ${meta.border}
                      ${isSelected ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50' : 'hover:border-blue-500/40'}
                      ${isCurrent && !isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500/60' : ''}`}
                  >
                    {meta.badge && (
                      <div className={`absolute top-0 left-0 right-0 text-center text-[10px] font-extrabold uppercase py-1 ${tierId === 'diamond' ? 'bg-cyan-500 text-white' : 'bg-slate-600 text-white'}`}>
                        {meta.badge}
                      </div>
                    )}

                    <div className={`bg-gradient-to-br ${meta.bg} via-transparent to-transparent bg-slate-800/60 p-5 ${meta.badge ? 'pt-7' : ''} flex-1`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon size={18} className={meta.color} />
                        <h4 className={`font-extrabold text-base ${meta.color}`}>{limits.label}</h4>
                        {isCurrent && (
                          <span className="ml-auto text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-bold">Atual</span>
                        )}
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-white font-extrabold text-xl">
                            R$ {perMth.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-slate-500 text-xs">/mês</span>
                        </div>
                        {months > 1 && (
                          <p className="text-slate-500 text-[10px] mt-0.5">
                            R$ {totalP.toFixed(2).replace('.', ',')} cobrado a cada {months} meses
                          </p>
                        )}
                        {saved > 0 && (
                          <p className="text-emerald-400 text-[10px] font-bold mt-0.5">
                            Economia de R$ {saved.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                      </div>

                      <ul className="space-y-1.5 text-xs text-slate-400">
                        <li className="flex items-center gap-1.5">
                          <Users size={10} className="text-slate-500 shrink-0" />
                          {isUnlim ? 'Membros ilimitados' : `Até ${limits.sedeMembers} membros na Sede`}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Building2 size={10} className="text-slate-500 shrink-0" />
                          {isUnlim ? 'Congregações ilimitadas' : `Até ${limits.maxCongs} congregação(ões)`}
                        </li>
                        {!isUnlim && (
                          <li className="flex items-center gap-1.5">
                            <Users size={10} className="text-slate-500 shrink-0" />
                            Até {limits.congMembers} membros/cong.
                          </li>
                        )}
                        {isUnlim && (
                          <li className="flex items-center gap-1.5">
                            <Star size={10} className="text-cyan-400 shrink-0" />
                            <span className="text-cyan-400 font-bold">Suporte prioritário</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="px-6 pb-5 shrink-0 space-y-3">
              <motion.button
                type="button"
                onClick={() => openWhatsAppCheckout(selectedTier, selectedCycle)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-green-900/30"
              >
                <MessageCircle size={18} />
                Contratar Novo Plano
              </motion.button>
              <p className="text-[11px] text-slate-600 text-center">
                Você será direcionado ao WhatsApp do administrador IgrejaApp para finalizar a contratação.
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
