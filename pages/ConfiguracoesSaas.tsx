import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Phone, KeyRound, Mail, Save, CheckCircle, AlertCircle, Crown,
  Sparkles, HelpCircle, Check, Copy, User, Building, Terminal, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { useApp } from '../context';
import { SystemSettings } from '../types';

export const PIX_TYPES = [
  { id: 'CNPJ',            label: 'CNPJ',                  placeholder: 'Digite ou cole o CNPJ da chave PIX' },
  { id: 'CPF',             label: 'CPF',                   placeholder: 'Digite ou cole o CPF da chave PIX' },
  { id: 'Telefone',        label: 'Telefone / Celular',    placeholder: 'Digite ou cole o telefone da chave PIX' },
  { id: 'E-mail',          label: 'E-mail',                placeholder: 'Digite ou cole o e-mail da chave PIX' },
  { id: 'Chave Aleatória', label: 'Chave Aleatória (EVP)', placeholder: 'Cole sua chave aleatória (EVP)' },
];

export const POPULAR_BANKS = [
  'Nubank',
  'Banco do Brasil',
  'Inter',
  'Caixa Econômica Federal',
  'Bradesco',
  'Itaú Unibanco',
  'Santander',
  'C6 Bank',
  'Mercado Pago',
  'PagBank (PagSeguro)',
  'Sicredi',
  'Sicoob',
  'BTG Pactual',
  'Banco Pan',
  'PicPay',
];

// Máscara rigorosa +xx (xx) xxxxx-xxxx
export const formatPhoneWithDdi = (val: string): string => {
  let d = val.replace(/\D/g, '');
  if (!d) return '';

  // Se colou ou digitou sem DDI (10 ou 11 dígitos), assume DDI Brasil 55
  if ((d.length === 10 || d.length === 11) && !d.startsWith('55')) {
    d = '55' + d;
  }

  // Limita a 13 dígitos (2 DDI + 2 DDD + 9 Celular)
  d = d.slice(0, 13);

  if (d.length <= 2) {
    return `+${d}`;
  }
  if (d.length <= 4) {
    return `+${d.slice(0, 2)} (${d.slice(2)}`;
  }
  if (d.length <= 9) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  }
  if (d.length <= 12) {
    // Fixo (8 dígitos): +55 (86) 3333-4444
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  // Celular (9 dígitos): +55 (86) 99933-0525
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
};

const SQL_RLS_FIX = `-- Execute no SQL Editor do Supabase para liberar as permissões da tabela system_settings:
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sales_phone TEXT,
  master_pix_key TEXT,
  master_pix_key_type TEXT,
  master_pix_holder_name TEXT,
  master_pix_bank TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_key_type TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_holder_name TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_bank TEXT;
INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sadm_only_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow_read_system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "allow_all_system_settings" ON public.system_settings;

CREATE POLICY "allow_read_system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "allow_all_system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.save_system_settings(
  p_sales_phone TEXT,
  p_master_pix_key TEXT,
  p_master_pix_key_type TEXT DEFAULT NULL,
  p_master_pix_holder_name TEXT DEFAULT NULL,
  p_master_pix_bank TEXT DEFAULT NULL,
  p_support_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_settings (
    id, sales_phone, master_pix_key, master_pix_key_type,
    master_pix_holder_name, master_pix_bank, support_email, updated_at
  )
  VALUES (
    1, p_sales_phone, p_master_pix_key, p_master_pix_key_type,
    p_master_pix_holder_name, p_master_pix_bank, p_support_email, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    sales_phone = EXCLUDED.sales_phone,
    master_pix_key = EXCLUDED.master_pix_key,
    master_pix_key_type = EXCLUDED.master_pix_key_type,
    master_pix_holder_name = EXCLUDED.master_pix_holder_name,
    master_pix_bank = EXCLUDED.master_pix_bank,
    support_email = EXCLUDED.support_email,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_system_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;`;

export const ConfiguracoesSaas: React.FC = () => {
  const { user, systemSettings, saveSystemSettings } = useApp();

  const [form, setForm] = useState<SystemSettings>(() => ({
    ...systemSettings,
    salesPhone: systemSettings.salesPhone ? formatPhoneWithDdi(systemSettings.salesPhone) : '',
    masterPixKeyType: systemSettings.masterPixKeyType || 'CNPJ',
    mercadoPagoAccessToken: systemSettings.mercadoPagoAccessToken || '',
    mercadoPagoPublicKey: systemSettings.mercadoPagoPublicKey || ((import.meta as any).env?.VITE_MERCADO_PAGO_PUBLIC_KEY as string) || '',
  }));

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'warning' | 'error'; msg: string; showSqlFix?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  useEffect(() => { 
    setForm({
      ...systemSettings,
      salesPhone: systemSettings.salesPhone ? formatPhoneWithDdi(systemSettings.salesPhone) : '',
      masterPixKeyType: systemSettings.masterPixKeyType || 'CNPJ',
      mercadoPagoAccessToken: systemSettings.mercadoPagoAccessToken || '',
      mercadoPagoPublicKey: systemSettings.mercadoPagoPublicKey || ((import.meta as any).env?.VITE_MERCADO_PAGO_PUBLIC_KEY as string) || '',
    }); 
  }, [systemSettings]);

  if (!user || user.role !== 'SUPER_ADM') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 bg-red-50 rounded-full text-red-500 mb-3">
          <ShieldCheck size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Acesso Restrito</h2>
        <p className="text-gray-500 text-sm max-w-sm">Apenas o Administrador Geral (dono do SaaS) possui permissão para acessar esta área.</p>
      </div>
    );
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneWithDdi(e.target.value);
    setForm(prev => ({ ...prev, salesPhone: formatted }));
  };

  const handlePixKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, masterPixKey: e.target.value }));
  };

  const handleTypeSelect = (typeId: string) => {
    setForm(prev => ({
      ...prev,
      masterPixKeyType: typeId,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const cleaned: SystemSettings = {
      salesPhone: form.salesPhone?.trim() || undefined,
      masterPixKey: form.masterPixKey?.trim() || undefined,
      masterPixKeyType: form.masterPixKeyType || 'CNPJ',
      masterPixHolderName: form.masterPixHolderName?.trim() || undefined,
      masterPixBank: form.masterPixBank?.trim() || undefined,
      supportEmail: form.supportEmail?.trim() || undefined,
    };

    const res = await saveSystemSettings(cleaned);
    setSaving(false);

    if (res.success) {
      setFeedback({
        kind: 'success',
        msg: 'Configurações salvas com sucesso! Os dados foram sincronizados no sistema.',
      });
    } else {
      const isRlsError = res.error && /violates row-level security/i.test(res.error);
      if (isRlsError) {
        setFeedback({
          kind: 'warning',
          msg: 'Suas alterações foram salvas neste dispositivo e já estão ativas! Porém o Supabase bloqueou a gravação direta por RLS. Execute o script SQL no Supabase para sincronizar permanentemente no banco.',
          showSqlFix: true,
        });
      } else {
        setFeedback({
          kind: 'error',
          msg: res.error || 'Erro ao salvar configurações.',
          showSqlFix: true,
        });
      }
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_RLS_FIX).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    });
  };

  const currentPlaceholder = PIX_TYPES.find(t => t.id === form.masterPixKeyType)?.placeholder || 'Chave PIX';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      {/* Header Stats / Banner Oficial */}
      <div className="bg-brand-black text-white p-4 md:p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400 shrink-0">
            <Crown size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-0.5">Configurações Master do SaaS</h1>
            <p className="text-gray-400 text-xs md:text-sm">Cadastre suas informações globais de recebimento PIX, contato e suporte</p>
          </div>
        </div>

        <div className="mt-4 md:mt-0 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Propagação Global Ativa
          </span>
        </div>

        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-dark to-transparent opacity-50 pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário Principal (2 colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            
            {/* Campo 1: WhatsApp / Vendas com máscara rigorosa +xx (xx) xxxxx-xxxx */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                  <Phone size={14} />
                </div>
                Telefone / WhatsApp Financeiro e Vendas
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="+55 (86) 99933-0525"
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  value={form.salesPhone || ''}
                  onChange={handlePhoneChange}
                />
              </div>

              <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
                <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Máscara automática: <strong>+xx (xx) xxxxx-xxxx</strong>. Alimenta os botões de WhatsApp de cobrança e contratação de planos no sistema.
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Campo 2: Seção PIX Master (Tipo, Chave, Nome que aparece e Banco) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                  <KeyRound size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    Chave PIX Master (Recebimento dos Planos)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Dados bancários oficiais que as igrejas verão ao pagar a mensalidade do software
                  </p>
                </div>
              </div>

              {/* 2.1 Seleção do Tipo de Chave */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  1. Selecione o Tipo de Chave PIX:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {PIX_TYPES.map(type => {
                    const isSelected = (form.masterPixKeyType || 'CNPJ') === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleTypeSelect(type.id)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {isSelected && <Check size={13} />}
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2.2 Input da Chave PIX */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  2. Chave PIX ({form.masterPixKeyType || 'CNPJ'}):
                </label>
                <input
                  type="text"
                  placeholder={currentPlaceholder}
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  value={form.masterPixKey || ''}
                  onChange={handlePixKeyChange}
                />
              </div>

              {/* Grid: Nome que aparece + Banco */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* 2.3 Nome do Titular / Nome que aparece */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                    <User size={13} className="text-gray-500" />
                    3. Nome que aparece (Favorecido / Titular):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: IgrejaApp Tecnologia Ltda"
                    className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={form.masterPixHolderName || ''}
                    onChange={e => setForm({ ...form, masterPixHolderName: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400">
                    O nome que o cliente/igreja confirma na tela do banco antes de pagar.
                  </p>
                </div>

                {/* 2.4 Banco / Instituição Financeira */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                    <Building size={13} className="text-gray-500" />
                    4. Banco / Instituição:
                  </label>
                  <input
                    type="text"
                    list="banks-list"
                    placeholder="Ex: Nubank, Banco do Brasil, Inter..."
                    className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={form.masterPixBank || ''}
                    onChange={e => setForm({ ...form, masterPixBank: e.target.value })}
                  />
                  <datalist id="banks-list">
                    {POPULAR_BANKS.map(b => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                  <p className="text-[10px] text-gray-400">
                    Instituição da conta para facilitar a conferência do pagamento.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Campo 3: E-mail de Suporte */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
                  <Mail size={14} />
                </div>
                E-mail Oficial de Suporte
              </label>

              <div className="relative">
                <input
                  type="email"
                  placeholder="suporte@igrejaapp.com"
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  value={form.supportEmail || ''}
                  onChange={e => setForm({ ...form, supportEmail: e.target.value })}
                />
              </div>

              <p className="text-xs text-gray-500">
                Canal oficial de atendimento para dúvidas e suporte técnico exibido nos rodapés e relatórios.
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* Campo 4: Integração Mercado Pago (PIX Automático) */}
            <div className="space-y-4 p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 border border-blue-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      Mercado Pago (PIX com Baixa Automática)
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Ativo
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Gera o PIX dinâmico e libera o acesso da igreja sozinho em segundos assim que o pastor paga.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Access Token de Produção (Mercado Pago):
                </label>
                <input
                  type="text"
                  placeholder="APP_USR-..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={form.mercadoPagoAccessToken || ''}
                  onChange={e => setForm({ ...form, mercadoPagoAccessToken: e.target.value })}
                />
                <p className="text-[10px] text-gray-500">
                  Chave privada oficial usada para criar cobranças e validar pagamentos via API.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Public Key (Chave Pública):
                </label>
                <input
                  type="text"
                  placeholder="APP_USR-..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-xs text-gray-800 font-mono placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  value={form.mercadoPagoPublicKey || ''}
                  onChange={e => setForm({ ...form, mercadoPagoPublicKey: e.target.value })}
                />
              </div>

              {/* Informação do Webhook */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-[11px]">URL do Webhook de Notificação:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/mercadopago-webhook`;
                      navigator.clipboard.writeText(url);
                      alert('URL do Webhook copiada com sucesso!');
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                  >
                    <Copy size={11} /> Copiar URL
                  </button>
                </div>
                <p className="font-mono text-[10px] text-blue-800 break-all bg-white/80 p-1.5 rounded border border-blue-100">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/mercadopago-webhook` : '/api/mercadopago-webhook'}
                </p>
                <p className="text-[10px] text-blue-700">
                  Cadastre essa URL em "Webhooks" no seu painel do Mercado Pago para receber as confirmações instantâneas.
                </p>
              </div>
            </div>

            {/* Alerta de Feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border text-sm font-medium space-y-3 ${
                  feedback.kind === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : feedback.kind === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {feedback.kind === 'success' ? (
                    <CheckCircle size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                  ) : feedback.kind === 'warning' ? (
                    <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                  )}
                  <span className="leading-relaxed flex-1">{feedback.msg}</span>
                </div>

                {/* Bloco de Ajuda para Correção de RLS no Supabase */}
                {feedback.showSqlFix && (
                  <div className="mt-2 pt-3 border-t border-amber-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Terminal size={14} /> Como liberar no Supabase SQL Editor:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copySqlToClipboard}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        >
                          {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                          {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSqlDetails(!showSqlDetails)}
                          className="text-xs text-amber-800 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          {showSqlDetails ? 'Recolher' : 'Ver Código'}
                          {showSqlDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-800 leading-tight">
                      Acesse o painel do Supabase &rarr; menu lateral <b>SQL Editor</b> &rarr; cole este script e clique em <b>Run</b>. O erro de RLS desaparecerá para sempre!
                    </p>

                    {showSqlDetails && (
                      <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 border border-gray-700">
                        {SQL_RLS_FIX}
                      </pre>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Botão de Salvar */}
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand-black hover:bg-gray-800 active:scale-95 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow transition-all"
              >
                <Save size={16} />
                {saving ? 'Salvando Alterações…' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>

        {/* Card Lateral de Pré-visualização / Resumo (1 coluna) */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              Resumo Ativo no Sistema
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Estes são os valores atualmente salvos e ativos para todas as igrejas e congregações:
            </p>

            <div className="space-y-3 pt-2">
              {/* Card PIX */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-900 uppercase">Chave PIX Master</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {systemSettings.masterPixKeyType || 'CNPJ'}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 font-mono break-all">
                  {systemSettings.masterPixKey || <span className="text-gray-400 font-normal italic">Não configurada</span>}
                </div>
                {systemSettings.masterPixHolderName && (
                  <div className="text-[11px] text-gray-600">
                    <span className="font-semibold text-gray-700">Nome:</span> {systemSettings.masterPixHolderName}
                  </div>
                )}
                {systemSettings.masterPixBank && (
                  <div className="text-[11px] text-gray-600">
                    <span className="font-semibold text-gray-700">Banco:</span> {systemSettings.masterPixBank}
                  </div>
                )}
              </div>

              {/* Card WhatsApp */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp de Contato</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5 font-mono">
                  {systemSettings.salesPhone ? systemSettings.salesPhone : <span className="text-gray-400 font-normal italic">Não configurado</span>}
                </div>
              </div>

              {/* Card E-mail */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">E-mail de Suporte</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5">
                  {systemSettings.supportEmail || <span className="text-gray-400 font-normal italic">Não configurado</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Dica de Segurança e Propagação */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <HelpCircle size={15} className="text-amber-700 shrink-0" />
              Onde esses dados são exibidos?
            </div>
            <p className="text-amber-800 leading-relaxed">
              A chave PIX, o nome do favorecido e o banco aparecem juntos na tela <strong>"Pagamentos do Sistema"</strong> e em avisos de cobrança para facilitar que o pastor/tesoureiro confira e faça o pagamento com total segurança.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
