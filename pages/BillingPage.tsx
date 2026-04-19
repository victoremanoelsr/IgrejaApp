import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Receipt, CheckCircle, Clock, AlertCircle, Zap, ChevronRight, X, Copy, RefreshCw } from 'lucide-react';
import { useApp } from '../context';

const BILLING_ROLES = ['SUPER_ADM', 'PRESIDENTE', 'VICE_PRESIDENTE'];

type InvoiceStatus = 'PAGO' | 'PENDENTE' | 'VENCIDO';

interface Invoice {
  id: string;
  month: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidDate?: string;
}

const MOCK_INVOICES: Invoice[] = [
  { id: '001', month: 'Abril 2026',   amount: 89.90, status: 'PENDENTE', dueDate: '2026-04-25' },
  { id: '002', month: 'Março 2026',   amount: 89.90, status: 'PAGO',     dueDate: '2026-03-25', paidDate: '2026-03-22' },
  { id: '003', month: 'Fevereiro 2026', amount: 89.90, status: 'PAGO',   dueDate: '2026-02-25', paidDate: '2026-02-19' },
  { id: '004', month: 'Janeiro 2026',  amount: 89.90, status: 'PAGO',    dueDate: '2026-01-25', paidDate: '2026-01-24' },
  { id: '005', month: 'Dezembro 2025', amount: 89.90, status: 'PAGO',    dueDate: '2025-12-25', paidDate: '2025-12-23' },
];

const PLANS = [
  { id: 'mensal',     label: 'Plano Mensal',     price: 89.90,  period: 'mês',      highlight: false },
  { id: 'trimestral', label: 'Plano Trimestral', price: 79.90,  period: 'mês',      highlight: true,  badge: 'Popular' },
  { id: 'anual',      label: 'Plano Anual',      price: 69.90,  period: 'mês',      highlight: false, badge: 'Melhor valor' },
];

const MOCK_PIX_KEY  = '00020126580014BR.GOV.BCB.PIX013636f5c87e-1a2b-4c3d-8e9f-0a1b2c3d4e5f5204000053039865802BR5913IgrejaApp SaaS6009SAO PAULO62140510igrejaapp16304ABCD';
const MOCK_QR_URL   = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=igrejaapp-pix-mock';

export const BillingPage: React.FC = () => {
  const { user } = useApp();
  const [isLoading, setIsLoading]     = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  if (!user || !BILLING_ROLES.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <ShieldCheck size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-slate-400">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(MOCK_PIX_KEY).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const pendingInvoice = MOCK_INVOICES.find(i => i.status === 'PENDENTE');

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

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
      <div className="relative bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/25 shrink-0">
                <ShieldCheck size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Atual</p>
                <h2 className="text-xl font-bold text-white">Plano Mensal — Pró</h2>
                <p className="text-slate-400 text-sm mt-0.5">Ativo · Próximo vencimento em <span className="text-yellow-400 font-semibold">25 de Abril de 2026</span></p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-extrabold text-white">R$ 89<span className="text-lg text-slate-400">,90</span></p>
              <p className="text-xs text-slate-500">/mês</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 pt-5 border-t border-slate-800">
            {[
              { label: 'Membros',      value: 'Ilimitado' },
              { label: 'Congregações', value: 'Ilimitado' },
              { label: 'Suporte',      value: 'Prioritário' },
            ].map(feat => (
              <div key={feat.label} className="text-center">
                <p className="text-white font-bold text-sm">{feat.value}</p>
                <p className="text-slate-500 text-xs">{feat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pay */}
        <button
          onClick={() => setShowPayModal(true)}
          className="flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/40 rounded-xl p-5 transition-all group shadow-lg text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <Receipt size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Gerar PIX da Mensalidade</p>
              <p className="text-slate-500 text-xs mt-0.5">Pague via QR Code ou Copia e Cola</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
        </button>

        {/* Upgrade */}
        <button
          onClick={() => setShowPlansModal(true)}
          className="flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/40 rounded-xl p-5 transition-all group shadow-lg text-left"
        >
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Zap size={22} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Mudar de Plano</p>
              <p className="text-slate-500 text-xs mt-0.5">Economize com planos maiores</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
        </button>
      </div>

      {/* Invoice History */}
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
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (
            MOCK_INVOICES.map((inv, idx) => (
              <div key={inv.id} className={`flex items-center justify-between py-4 px-5 ${idx < MOCK_INVOICES.length - 1 ? 'border-b border-slate-800' : ''} hover:bg-slate-800/40 transition-colors`}>
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${inv.status === 'PAGO' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                    {inv.status === 'PAGO'
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <Clock size={16} className="text-yellow-400" />
                    }
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
          )}
        </div>
      </div>

      {/* PIX Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Receipt size={18} className="text-emerald-400" />
                <h3 className="text-white font-bold">Pagar Mensalidade</h3>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-5">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Referência: <span className="text-white font-semibold">{pendingInvoice?.month ?? 'Abril 2026'}</span></p>
                <p className="text-3xl font-extrabold text-white mt-1">R$ 89<span className="text-xl text-slate-400">,90</span></p>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-lg">
                <img src={MOCK_QR_URL} alt="QR Code PIX" className="w-44 h-44" />
              </div>

              <div className="w-full">
                <p className="text-xs text-slate-500 text-center mb-2 uppercase tracking-wider font-bold">Copia e Cola</p>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5">
                  <p className="flex-1 text-xs text-slate-400 truncate font-mono">{MOCK_PIX_KEY.slice(0, 38)}…</p>
                  <button onClick={handleCopy} className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    <Copy size={12} />
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 text-center">O pagamento é confirmado automaticamente em até 5 minutos.</p>
            </div>
          </div>
        </div>
      )}

      {/* Plans Modal */}
      {showPlansModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Zap size={18} className="text-blue-400" />
                <h3 className="text-white font-bold">Mudar de Plano</h3>
              </div>
              <button onClick={() => setShowPlansModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {PLANS.map(plan => (
                <div key={plan.id} className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all group ${plan.highlight ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'}`}>
                  {plan.badge && (
                    <span className={`absolute -top-2.5 left-4 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${plan.highlight ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'}`}>
                      {plan.badge}
                    </span>
                  )}
                  <div>
                    <p className="text-white font-bold text-sm">{plan.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Cobrado mensalmente</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-white font-extrabold">R$ {plan.price.toFixed(2).replace('.', ',')}</p>
                      <p className="text-slate-500 text-xs">/{plan.period}</p>
                    </div>
                    {plan.id === 'mensal' ? (
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold">Atual</span>
                    ) : (
                      <button className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${plan.highlight ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                        Selecionar
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-600 text-center pt-2">Entre em contato com o suporte para realizar a migração de plano.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
