import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Phone, KeyRound, Mail, Save, CheckCircle, AlertCircle, Crown,
  ExternalLink, Sparkles, HelpCircle, Check, Copy
} from 'lucide-react';
import { useApp } from '../context';
import { SystemSettings } from '../types';

const onlyDigits = (s: string) => s.replace(/\D+/g, '');

const detectPixType = (key: string): string => {
  const cleaned = key.replace(/\D/g, '');
  if (/^\d{11}$/.test(cleaned)) return 'CPF';
  if (/^\d{14}$/.test(cleaned)) return 'CNPJ';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return 'E-mail';
  if (/^\+?55\d{10,11}$/.test(cleaned) || /^\d{10,11}$/.test(cleaned)) return 'Telefone';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return 'Chave Aleatória';
  if (key.length === 0) return '';
  return 'Personalizada';
};

export const ConfiguracoesSaas: React.FC = () => {
  const { user, systemSettings, saveSystemSettings } = useApp();

  const [form, setForm] = useState<SystemSettings>(systemSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => { 
    setForm(systemSettings); 
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const cleaned: SystemSettings = {
      salesPhone: form.salesPhone ? onlyDigits(form.salesPhone) : undefined,
      masterPixKey: form.masterPixKey?.trim() || undefined,
      supportEmail: form.supportEmail?.trim() || undefined,
    };

    const res = await saveSystemSettings(cleaned);
    setSaving(false);

    if (res.success) {
      setFeedback({ kind: 'success', msg: 'Configurações Master salvas com sucesso! Os dados foram propagados para todo o ecossistema.' });
    } else {
      setFeedback({ kind: 'error', msg: res.error ?? 'Erro ao salvar configurações.' });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  const pixType = form.masterPixKey ? detectPixType(form.masterPixKey) : '';

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
            <p className="text-gray-400 text-xs md:text-sm">Cadastre suas informações globais de recebimento, contato e suporte</p>
          </div>
        </div>

        <div className="mt-4 md:mt-0 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Propagação Global Ativa
          </span>
        </div>

        {/* Decorative BG */}
        <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-brand-dark to-transparent opacity-50 pointer-events-none"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário Principal (2 colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
            
            {/* Campo 1: WhatsApp / Vendas */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                  <Phone size={14} />
                </div>
                Telefone / WhatsApp Financeiro e Vendas
              </label>
              
              <div className="relative">
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Ex: 5586999330525 (DDI + DDD + número)"
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  value={form.salesPhone || ''}
                  onChange={e => setForm({ ...form, salesPhone: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/60">
                <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Alimenta automaticamente os botões <strong>"Falar com Financeiro"</strong> (em telas de bloqueio de mensalidade) e <strong>"Contratar Novo Plano"</strong> em todo o sistema.
                </span>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Campo 2: Chave PIX Master */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                    <KeyRound size={14} />
                  </div>
                  Chave PIX Master (Recebimento dos Planos)
                </label>
                {pixType && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                    Tipo: {pixType}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  value={form.masterPixKey || ''}
                  onChange={e => setForm({ ...form, masterPixKey: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100/60">
                <Sparkles size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Chave PIX exclusiva para o pagamento das mensalidades do sistema SaaS. <strong>Aparece unicamente na janela "Pagamentos do Sistema" no painel da igreja SEDE</strong> (e tela de bloqueio). Não é exibida em congregações nem para membros.
                </span>
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

            {/* Alerta de Feedback */}
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-2.5 p-4 rounded-xl border text-sm font-medium ${
                  feedback.kind === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {feedback.kind === 'success'
                  ? <CheckCircle size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                  : <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />}
                <span>{feedback.msg}</span>
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
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp de Contato</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5 font-mono">
                  {systemSettings.salesPhone ? `+${systemSettings.salesPhone}` : <span className="text-gray-400 font-normal italic">Não configurado</span>}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Chave PIX Master</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5 font-mono">
                  {systemSettings.masterPixKey || <span className="text-gray-400 font-normal italic">Não configurada</span>}
                </div>
              </div>

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
              Onde esta chave é exibida?
            </div>
            <p className="text-amber-800 leading-relaxed">
              Sempre que você alterar e salvar a <strong>Chave PIX Master</strong> ou o <strong>WhatsApp</strong>, apenas a janela <strong>"Pagamentos do Sistema" (exclusiva da SEDE)</strong> e a tela de faturamento pendente serão atualizadas com sua chave para o recebimento das mensalidades do software.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
};

