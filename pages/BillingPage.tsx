import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, ShieldCheck, Receipt, CheckCircle, Clock, AlertCircle,
  Zap, ChevronRight, X, Copy, RefreshCw, Gift, Users, Building2,
  Star, Crown, Gem, TrendingUp, Info, MessageCircle, Home, QrCode
} from 'lucide-react';
import { useApp } from '../context';
import { PlanType, PlanTier } from '../types';
import {
  usePlanLimits, PLAN_LIMITS, CYCLE_DISCOUNTS, CYCLE_MONTHS, CYCLE_LABELS,
  calcPrice, calcSavings
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

const TIER_META: Record<string, { icon: React.FC<{size?: number; className?: string}>, color: string, badgeBg: string, badgeText: string, border: string, bg: string, badge?: string }> = {
  bronze:  { icon: TrendingUp, color: 'text-amber-600', badgeBg: 'bg-amber-100 dark:bg-amber-950/40', badgeText: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700/50', bg: 'from-amber-500/10' },
  prata:   { icon: Star,       color: 'text-slate-600 dark:text-slate-300', badgeBg: 'bg-slate-100 dark:bg-slate-800', badgeText: 'text-slate-700 dark:text-slate-200', border: 'border-slate-300 dark:border-slate-700', bg: 'from-slate-500/10', badge: 'Popular' },
  ouro:    { icon: Crown,      color: 'text-yellow-600 dark:text-yellow-400', badgeBg: 'bg-yellow-100 dark:bg-yellow-950/40', badgeText: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700/50', bg: 'from-yellow-500/10' },
  diamond: { icon: Gem,        color: 'text-cyan-600 dark:text-cyan-400', badgeBg: 'bg-cyan-100 dark:bg-cyan-950/40', badgeText: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700/50', bg: 'from-cyan-500/10', badge: 'Melhor valor' },
};

const CYCLES: PlanType[] = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'];
const TIERS = ['bronze', 'prata', 'ouro', 'diamond'] as const;

export const BillingPage: React.FC = () => {
  const { user, currentChurch, systemSettings } = useApp();
  const planLimits = usePlanLimits();
  const isIsento    = currentChurch?.planType === 'isento';
  // PIX exclusivo para pagamento da mensalidade do SaaS: usa unicamente a Chave PIX Master
  const billingPix  = (systemSettings.masterPixKey?.trim() || '');
  const [isLoading, setIsLoading]       = useState(true);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showQrModal, setShowQrModal]   = useState(false);
  const [copied, setCopied]             = useState(false);
  const [invoicePage, setInvoicePage]   = useState(0);
  const INVOICES_PER_PAGE = 6;
  const [selectedCycle, setSelectedCycle] = useState<PlanType>(
    (currentChurch?.planType && currentChurch.planType !== 'isento') ? currentChurch.planType : 'mensal'
  );
  const [selectedTier, setSelectedTier] = useState<PlanTier>(
    (currentChurch?.planTier as PlanTier) || 'bronze'
  );

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // ---- Cálculo do próximo vencimento real (baseado no dueDay) ----
  const billingStatus = React.useMemo(() => {
    if (!currentChurch || !currentChurch.planType || currentChurch.planType === 'isento') {
      return { nextDueDate: null, isOnTime: true, isInGrace: false, isLate: false, hasActivePromise: false, promiseDate: null, daysUntilDue: null, daysInGrace: null };
    }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dueDay = currentChurch.dueDay ?? 10;
    const months = CYCLE_MONTHS[currentChurch.planType as PlanType] ?? 1;
    const gracePeriod = currentChurch.gracePeriod ?? 5;

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

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilDue = isOnTime ? Math.ceil((nextDue.getTime() - today.getTime()) / msPerDay) : null;
    const daysInGrace  = isInGrace ? Math.ceil((graceDate.getTime() - today.getTime()) / msPerDay) : null;

    return { nextDueDate: nextDue, isOnTime, isInGrace, isLate, hasActivePromise, promiseDate, daysUntilDue, daysInGrace };
  }, [currentChurch?.dueDay, currentChurch?.gracePeriod, currentChurch?.planType, currentChurch?.lastPaymentDate, currentChurch?.paymentPromiseDate]);

  // ---- Histórico de faturas DERIVADO do plano cadastrado da igreja ----
  const invoices: Invoice[] = React.useMemo(() => {
    if (!currentChurch || !currentChurch.planType || currentChurch.planType === 'isento') {
      return [];
    }
    const tierKey = currentChurch.planTier || 'bronze';
    const cycle   = currentChurch.planType;
    const months  = CYCLE_MONTHS[cycle] ?? 1;
    const dueDay  = currentChurch.dueDay ?? 10;
    const basePrice = PLAN_LIMITS[tierKey]?.basePrice ?? 0;
    const cyclePrice = calcPrice(basePrice, cycle, months);

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

    const HISTORY_LENGTH = 18;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 m-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 mb-4">
          <Home size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Disponível Apenas na Sede</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm leading-relaxed">
          A janela <b>"Pagamentos do Sistema"</b> é exclusiva da administração da igreja SEDE.
          Selecione a sede no seletor de congregações para gerenciar a assinatura do software.
        </p>
      </div>
    );
  }

  if (!user || !BILLING_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 m-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Apenas Pastor Presidente, Vice-Presidente e Tesoureiro podem acessar os pagamentos do sistema.
        </p>
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
      PAGO:     { label: 'Pago',     icon: CheckCircle, cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
      PENDENTE: { label: 'Pendente', icon: Clock,        cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
      VENCIDO:  { label: 'Vencido',  icon: AlertCircle,  cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
    };
    const { label, icon: Icon, cls } = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
        <Icon size={12} />
        {label}
      </span>
    );
  };

  const SkeletonRow = () => (
    <div className="flex items-center justify-between py-4 px-5 border-b border-gray-100 dark:border-gray-700 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-3.5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
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
      ? 'from-red-500 to-rose-600'
      : percent >= 80
      ? 'from-amber-500 to-orange-500'
      : 'from-emerald-500 to-teal-600';

    return (
      <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold">
            <Icon size={15} className="text-brand-orange" />
            {label}
          </span>
          <span className={`font-black text-xs ${isUnlimited ? 'text-emerald-600 dark:text-emerald-400' : percent >= 100 ? 'text-red-600' : percent >= 80 ? 'text-amber-600' : 'text-gray-800 dark:text-gray-100'}`}>
            {isUnlimited ? 'Ilimitado' : `${current} de ${limit}`}
          </span>
        </div>
        {!isUnlimited && (
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${color}`}
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      {/* Header Premium do Sistema */}
      <div className="bg-gradient-to-r from-gray-900 via-brand-black to-gray-900 text-white rounded-2xl p-6 shadow-lg border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="z-10 flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-md text-white">
            <CreditCard size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Pagamentos do Sistema</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-orange-300 border border-white/15">
                SaaS IgrejaApp
              </span>
            </div>
            <p className="text-gray-300 text-xs mt-1">
              Gerencie a assinatura da sua sede, visualize faturas e acesse a Chave PIX oficial
            </p>
          </div>
        </div>

        <div className="z-10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPlansModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Zap size={14} /> Planos e Upgrades
          </button>
        </div>

        {/* Efeito decorativo de fundo */}
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Banner de Aviso de Vencimento / Carência / Atraso */}
      {!isIsento && currentChurch?.planType && currentChurch.planType !== 'isento' && (() => {
        const { isOnTime, isInGrace, isLate, daysUntilDue, daysInGrace, hasActivePromise } = billingStatus;
        if (isLate && !hasActivePromise) {
          return (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl px-5 py-4 text-red-700 dark:text-red-300 shadow-sm animate-fade-in">
              <AlertCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Assinatura em atraso — acesso sujeito a bloqueio</p>
                <p className="text-xs mt-0.5 opacity-90">
                  O período de carência encerrou. Realize o pagamento via PIX abaixo para manter ou restabelecer seu acesso completo.
                </p>
              </div>
            </div>
          );
        }
        if (isInGrace) {
          return (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 text-amber-800 dark:text-amber-200 shadow-sm animate-fade-in">
              <Clock size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">
                  Pagamento vencido — {daysInGrace != null ? `${daysInGrace} dia${daysInGrace !== 1 ? 's' : ''} de carência restante${daysInGrace !== 1 ? 's' : ''}` : 'carência ativa'}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  Efetue o pagamento via PIX para evitar a suspensão temporária do sistema.
                </p>
              </div>
            </div>
          );
        }
        if (isOnTime && daysUntilDue != null && daysUntilDue <= 5) {
          return (
            <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl px-5 py-4 text-yellow-800 dark:text-yellow-200 shadow-sm animate-fade-in">
              <Info size={22} className="text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">
                  Vencimento próximo em {daysUntilDue} dia{daysUntilDue !== 1 ? 's' : ''}
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  Realize o pagamento via PIX para manter sua igreja conectada sem interrupções.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Grid Principal: Card do Plano Atual + Card do PIX Oficial */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Card do Plano Atual */}
        <div className="md:col-span-7 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border ${TIER_META[currentTierKey]?.border ?? 'border-gray-300'} ${TIER_META[currentTierKey]?.badgeBg ?? 'bg-gray-100'}`}>
                  {(() => {
                    const Icon = TIER_META[currentTierKey]?.icon ?? ShieldCheck;
                    return <Icon size={24} className={TIER_META[currentTierKey]?.color ?? 'text-gray-700'} />;
                  })()}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Plano Ativo
                  </span>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white capitalize">
                    {isIsento ? 'Isento de Cobrança' : `${currentTierLimits.label} · ${CYCLE_LABELS[currentChurch?.planType as PlanType] ?? 'Mensal'}`}
                  </h2>
                </div>
              </div>

              <div>
                {isIsento ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-bold">
                    <Gift size={12} /> Isento
                  </span>
                ) : billingStatus.isOnTime ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">
                    <CheckCircle size={12} /> Em dia
                  </span>
                ) : billingStatus.isInGrace ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">
                    <Clock size={12} /> Em carência
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full text-xs font-bold">
                    <AlertCircle size={12} /> Vencido
                  </span>
                )}
              </div>
            </div>

            {/* Detalhes do vencimento */}
            <div className="py-4 space-y-2 text-xs">
              {!isIsento && billingStatus.nextDueDate && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Próximo Vencimento:</span>
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {billingStatus.nextDueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              )}

              {currentChurch?.lastPaymentDate && (
                <div className="flex items-center justify-between px-3 py-1 text-gray-500 text-[11px]">
                  <span>Último pagamento confirmado:</span>
                  <span className="font-bold text-emerald-600">
                    {new Date(currentChurch.lastPaymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              {billingStatus.hasActivePromise && billingStatus.promiseDate && (
                <div className="flex items-center justify-between px-3 py-1 text-amber-600 text-[11px] font-bold">
                  <span>Acesso garantido por promessa até:</span>
                  <span>{billingStatus.promiseDate.toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Precisa de mais membros ou filiais?
            </span>
            <button
              type="button"
              onClick={() => setShowPlansModal(true)}
              className="text-xs font-bold text-brand-orange hover:text-orange-600 flex items-center gap-1"
            >
              Fazer Upgrade <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Card de Pagamento PIX Master */}
        <div className="md:col-span-5 bg-gradient-to-br from-emerald-500/5 via-white to-white dark:from-emerald-950/20 dark:via-gray-800 dark:to-gray-800 rounded-2xl border border-emerald-500/30 dark:border-emerald-600/30 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center font-bold">
                  PIX
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white">Pagamento via PIX</h3>
                  <p className="text-[10px] text-gray-400">Mensalidade oficial do IgrejaApp</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                Oficial
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Chave PIX do Administrador
                </label>
                {systemSettings.masterPixKeyType && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                    {systemSettings.masterPixKeyType}
                  </span>
                )}
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-gray-800 dark:text-gray-100 break-all select-all">
                  {billingPix || 'Nenhuma chave PIX configurada pelo administrador'}
                </span>
              </div>

              {(systemSettings.masterPixHolderName || systemSettings.masterPixBank) && (
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60 text-xs space-y-1">
                  {systemSettings.masterPixHolderName && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Nome / Favorecido:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{systemSettings.masterPixHolderName}</span>
                    </div>
                  )}
                  {systemSettings.masterPixBank && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Banco / Instituição:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{systemSettings.masterPixBank}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyPix}
                  disabled={!billingPix}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                  } disabled:opacity-50`}
                >
                  {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
                  {copied ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}
                </button>

                {billingPix && (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-gray-700 dark:text-white transition"
                    title="Exibir QR Code para pagamento"
                  >
                    <QrCode size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 leading-tight pt-3 border-t border-gray-100 dark:border-gray-700">
            Após a transferência, envie o comprovante pelo WhatsApp comercial para baixa imediata.
          </p>
        </div>
      </div>

      {/* Uso de Recursos (Capacidade do Plano) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-orange" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Uso dos Recursos</h3>
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Capacidade contratada no plano <b>{currentTierLimits.label}</b>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UsageBar
            label="Membros Cadastrados (Sede)"
            icon={Users}
            current={planLimits.currentMemberCount}
            limit={planLimits.memberLimit}
            percent={planLimits.memberPercent}
            isUnlimited={isUnlimitedTier}
          />
          <UsageBar
            label="Congregações Filhas Ativas"
            icon={Building2}
            current={planLimits.currentCongCount}
            limit={planLimits.congLimit}
            percent={planLimits.congPercent}
            isUnlimited={isUnlimitedTier}
          />
        </div>

        {!isUnlimitedTier && (planLimits.memberPercent >= 80 || planLimits.congPercent >= 80) && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Sua igreja está se aproximando do limite contratado. Faça um upgrade de plano para adicionar novas congregações ou membros sem restrições.
            </span>
          </div>
        )}
      </div>

      {/* Histórico de Faturas */}
      {isIsento ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Gift size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sem Cobranças Registradas</h3>
          <p className="text-gray-500 dark:text-gray-400 text-xs max-w-sm mx-auto">
            Esta igreja está cadastrada como isenta no sistema e não possui faturas financeiras pendentes.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Receipt size={18} className="text-gray-500" />
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Histórico de Faturas</h3>
                <p className="text-xs text-gray-400">Ciclos de cobrança e pagamentos anteriores</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : invoices.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Nenhuma fatura registrada para este plano.
              </div>
            ) : (() => {
              const totalPages = Math.ceil(invoices.length / INVOICES_PER_PAGE);
              const pageInvoices = invoices.slice(invoicePage * INVOICES_PER_PAGE, (invoicePage + 1) * INVOICES_PER_PAGE);
              return (
                <>
                  {pageInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          inv.status === 'PAGO'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600'
                        }`}>
                          {inv.status === 'PAGO' ? <CheckCircle size={18} /> : <Clock size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-800 dark:text-white">{inv.month}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {inv.status === 'PAGO' && inv.paidDate
                              ? `Quitado em ${new Date(inv.paidDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                              : `Vencimento em ${new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6">
                        <StatusBadge status={inv.status} />
                        <span className="font-black text-sm text-gray-900 dark:text-white min-w-[90px] text-right">
                          R$ {inv.amount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-400">
                        Página <b>{invoicePage + 1}</b> de <b>{totalPages}</b>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInvoicePage((p) => Math.max(0, p - 1))}
                          disabled={invoicePage === 0}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 transition"
                        >
                          ← Anterior
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={invoicePage >= totalPages - 1}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 disabled:opacity-40 transition"
                        >
                          Próxima →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de Planos e Upgrade */}
      {showPlansModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-brand-orange">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">Planos e Assinaturas IgrejaApp</h3>
                  <p className="text-xs text-gray-500">Escolha o ciclo de pagamento e o tier que melhor atende sua denominação</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Ciclos de Cobrança com Descontos */}
            <div className="px-6 pt-5 pb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                Ciclo de Pagamento
              </p>
              <div className="flex flex-wrap gap-2">
                {CYCLES.map(cycle => {
                  const disc = CYCLE_DISCOUNTS[cycle];
                  const isActive = selectedCycle === cycle;
                  return (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setSelectedCycle(cycle)}
                      className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-orange-400'
                      }`}
                    >
                      <span className="capitalize">{CYCLE_LABELS[cycle]}</span>
                      {disc > 0 && (
                        <span className={`text-[10px] mt-0.5 font-black ${isActive ? 'text-yellow-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          -{Math.round(disc * 100)}% de economia
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cards de Tiers */}
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
                  <div
                    key={tierId}
                    onClick={() => setSelectedTier(tierId)}
                    className={`relative flex flex-col rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-orange bg-orange-50/20 dark:bg-orange-950/20 shadow-lg'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                    }`}
                  >
                    {meta.badge && (
                      <span className="absolute -top-2.5 right-4 bg-cyan-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                        {meta.badge}
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon size={20} className={meta.color} />
                        <h4 className="font-black text-base text-gray-900 dark:text-white">{limits.label}</h4>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          Atual
                        </span>
                      )}
                    </div>

                    <div className="mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">
                          R$ {perMth.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-gray-400">/mês</span>
                      </div>
                      {months > 1 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          R$ {totalP.toFixed(2).replace('.', ',')} cobrado a cada {months} meses
                        </p>
                      )}
                      {saved > 0 && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          Economia de R$ {saved.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 flex-1">
                      <li className="flex items-center gap-2">
                        <Users size={12} className="text-brand-orange shrink-0" />
                        <span>{isUnlim ? 'Membros ilimitados' : `Até ${limits.sedeMembers} membros na Sede`}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Building2 size={12} className="text-brand-orange shrink-0" />
                        <span>{isUnlim ? 'Congregações ilimitadas' : `Até ${limits.maxCongs} congregações`}</span>
                      </li>
                      {!isUnlim && (
                        <li className="flex items-center gap-2 text-gray-500">
                          <Users size={12} className="shrink-0 text-gray-400" />
                          <span>Até {limits.congMembers} membros / cong.</span>
                        </li>
                      )}
                      {isUnlim && (
                        <li className="flex items-center gap-2 font-bold text-cyan-600">
                          <Star size={12} className="shrink-0" />
                          <span>Suporte VIP 24h</span>
                        </li>
                      )}
                    </ul>

                    <button
                      type="button"
                      className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-brand-orange text-white shadow'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {isSelected ? 'Selecionado' : 'Escolher Este'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer Modal com botão do WhatsApp */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-500 text-center sm:text-left">
                Plano selecionado: <b>{PLAN_LIMITS[selectedTier]?.label}</b> ({CYCLE_LABELS[selectedCycle]})
              </p>
              <button
                type="button"
                onClick={() => openWhatsAppCheckout(selectedTier, selectedCycle)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <MessageCircle size={16} /> Contratar via WhatsApp Oficial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code PIX */}
      {showQrModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1">Escanear QR Code PIX</h3>
            <p className="text-xs text-gray-400 mb-4">Abra o app do seu banco e aponte a câmera</p>

            <div className="p-4 bg-white rounded-2xl border-2 border-emerald-500/30 inline-block mx-auto mb-4 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(billingPix)}`}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl mb-3 text-[11px] font-mono text-gray-700 dark:text-gray-200 break-all select-all border">
              {billingPix}
            </div>

            {(systemSettings.masterPixHolderName || systemSettings.masterPixBank) && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-4 space-y-0.5">
                {systemSettings.masterPixHolderName && (
                  <p><b>Favorecido:</b> {systemSettings.masterPixHolderName}</p>
                )}
                {systemSettings.masterPixBank && (
                  <p><b>Banco:</b> {systemSettings.masterPixBank}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyPix}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar Chave'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BillingPage;
