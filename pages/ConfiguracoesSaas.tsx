import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Phone, KeyRound, Mail, Save, CheckCircle, AlertCircle, Crown,
} from 'lucide-react';
import { useApp } from '../context';
import { SystemSettings } from '../types';

const onlyDigits = (s: string) => s.replace(/\D+/g, '');

export const ConfiguracoesSaas: React.FC = () => {
  const { user, systemSettings, saveSystemSettings } = useApp();

  const [form, setForm] = useState<SystemSettings>(systemSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => { setForm(systemSettings); }, [systemSettings]);

  if (!user || user.role !== 'SUPER_ADM') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <ShieldCheck size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-slate-400">Apenas o dono do sistema pode acessar as configurações master.</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    const cleaned: SystemSettings = {
      salesPhone:   form.salesPhone   ? onlyDigits(form.salesPhone) : undefined,
      masterPixKey: form.masterPixKey?.trim() || undefined,
      supportEmail: form.supportEmail?.trim() || undefined,
    };
    const res = await saveSystemSettings(cleaned);
    setSaving(false);
    if (res.success) {
      setFeedback({ kind: 'success', msg: 'Configurações salvas com sucesso. Os dados foram propagados pelo ecossistema.' });
    } else {
      setFeedback({ kind: 'error', msg: res.error ?? 'Erro ao salvar configurações.' });
    }
    setTimeout(() => setFeedback(null), 4500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-3xl mx-auto space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <Crown size={26} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações Master</h1>
          <p className="text-slate-400 text-sm">Dados globais do dono do sistema — usados em todo o ecossistema</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Sales WhatsApp */}
        <motion.div
          whileHover={{ y: -1 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl"
        >
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Phone size={14} className="text-emerald-400" />
            Telefone para Vendas (WhatsApp)
          </label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Ex: 5511999998888 (DDI + DDD + número)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition"
            value={form.salesPhone || ''}
            onChange={e => setForm({ ...form, salesPhone: e.target.value })}
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Será usado nos botões "Contratar Novo Plano" e "Falar com Suporte" em todo o sistema.
          </p>
        </motion.div>

        {/* Master PIX */}
        <motion.div
          whileHover={{ y: -1 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl"
        >
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <KeyRound size={14} className="text-blue-400" />
            Chave PIX Master
          </label>
          <input
            type="text"
            placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition"
            value={form.masterPixKey || ''}
            onChange={e => setForm({ ...form, masterPixKey: e.target.value })}
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Chave PIX usada para receber pagamentos das igrejas que não possuem PIX próprio cadastrado.
          </p>
        </motion.div>

        {/* Support email */}
        <motion.div
          whileHover={{ y: -1 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl"
        >
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Mail size={14} className="text-purple-400" />
            E-mail de Suporte
          </label>
          <input
            type="email"
            placeholder="suporte@igrejaapp.com"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition"
            value={form.supportEmail || ''}
            onChange={e => setForm({ ...form, supportEmail: e.target.value })}
          />
        </motion.div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2 p-4 rounded-xl border text-sm ${
              feedback.kind === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {feedback.kind === 'success'
              ? <CheckCircle size={16} className="shrink-0 mt-0.5" />
              : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
            <span>{feedback.msg}</span>
          </motion.div>
        )}

        <div className="flex justify-end pt-2">
          <motion.button
            type="submit"
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-colors"
          >
            <Save size={16} />
            {saving ? 'Salvando…' : 'Salvar Configurações'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};
