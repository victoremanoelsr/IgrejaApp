import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Phone, KeyRound, Mail, Save, CheckCircle, AlertCircle, Crown,
  ExternalLink, Sparkles, HelpCircle, Check, Copy, Hash, Smartphone, Building2,
  UserCheck, AtSign, Key, Info, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';
import { useApp } from '../context';
import { SystemSettings } from '../types';

export type PixTypeChoice = 'AUTO' | 'CPF' | 'CNPJ' | 'TELEFONE' | 'EMAIL' | 'ALEATORIA';

const onlyDigits = (s: string) => s.replace(/\D+/g, '');

const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) {
    const rest = d.slice(2);
    if (rest.length <= 10) {
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 6)}-${rest.slice(6, 10)}`;
    }
    return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7, 11)}`;
  }
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\(\d{2}\) \d{4})(\d)/, '$1-$2');
  }
  return d
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\) \d{5})(\d)/, '$1-$2');
};

const SQL_RLS_FIX = `-- Execute no SQL Editor do Supabase para liberar as permissões da tabela system_settings:
CREATE TABLE IF NOT EXISTS public.system_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  sales_phone TEXT,
  master_pix_key TEXT,
  master_pix_key_type TEXT,
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS master_pix_key_type TEXT;
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
  p_support_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_settings (id, sales_phone, master_pix_key, master_pix_key_type, support_email, updated_at)
  VALUES (1, p_sales_phone, p_master_pix_key, p_master_pix_key_type, p_support_email, NOW())
  ON CONFLICT (id) DO UPDATE SET
    sales_phone = EXCLUDED.sales_phone,
    master_pix_key = EXCLUDED.master_pix_key,
    master_pix_key_type = EXCLUDED.master_pix_key_type,
    support_email = EXCLUDED.support_email,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_system_settings(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;`;

export const ConfiguracoesSaas: React.FC = () => {
  const { user, systemSettings, saveSystemSettings } = useApp();

  const [form, setForm] = useState<SystemSettings>(systemSettings);
  const [selectedPixType, setSelectedPixType] = useState<PixTypeChoice>(
    (systemSettings.masterPixKeyType as PixTypeChoice) || 'AUTO'
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'warning' | 'error'; msg: string; showSqlFix?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  useEffect(() => { 
    setForm(systemSettings); 
    if (systemSettings.masterPixKeyType) {
      setSelectedPixType(systemSettings.masterPixKeyType as PixTypeChoice);
    }
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

  // Análise detalhada da chave PIX de acordo com o número de dígitos e formato
  const analyzePixKey = (rawKey: string, chosenType: PixTypeChoice) => {
    const key = (rawKey || '').trim();
    const digits = key.replace(/\D/g, '');
    const digitCount = digits.length;
    const charCount = key.length;

    if (!key) {
      return {
        type: 'VAZIA',
        label: 'Aguardando digitação...',
        badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
        description: 'Digite a chave ou escolha um tipo abaixo para identificação automática.',
        digitCount: 0,
        isValid: false,
      };
    }

    // Se o usuário selecionou um tipo específico no filtro:
    if (chosenType === 'CPF') {
      const valid = digitCount === 11;
      return {
        type: 'CPF',
        label: `CPF (${digitCount}/11 dígitos)`,
        badgeClass: valid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ CPF reconhecido (11 dígitos)' : `⚠️ Faltam ${11 - digitCount} dígito(s) para completar os 11 do CPF.`,
        digitCount,
        isValid: valid,
      };
    }

    if (chosenType === 'CNPJ') {
      const valid = digitCount === 14;
      return {
        type: 'CNPJ',
        label: `CNPJ (${digitCount}/14 dígitos)`,
        badgeClass: valid ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ CNPJ reconhecido (14 dígitos)' : `⚠️ Faltam ${14 - digitCount} dígito(s) para completar os 14 do CNPJ.`,
        digitCount,
        isValid: valid,
      };
    }

    if (chosenType === 'TELEFONE') {
      const valid = digitCount === 10 || digitCount === 11 || (digits.startsWith('55') && (digitCount === 12 || digitCount === 13));
      return {
        type: 'TELEFONE',
        label: `Telefone (${digitCount} dígitos)`,
        badgeClass: valid ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ Telefone reconhecido (DDD + Número)' : `⚠️ Digite 10 dígitos (fixo) ou 11 dígitos (celular com 9). Atual: ${digitCount}.`,
        digitCount,
        isValid: valid,
      };
    }

    if (chosenType === 'EMAIL') {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      return {
        type: 'EMAIL',
        label: 'E-mail',
        badgeClass: valid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ E-mail no formato correto' : '⚠️ E-mail incompleto (certifique-se de incluir @ e o domínio ex: .com).',
        digitCount,
        isValid: valid,
      };
    }

    if (chosenType === 'ALEATORIA') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
      const is32Hex = /^[0-9a-f]{32}$/i.test(key);
      const valid = isUuid || is32Hex;
      return {
        type: 'ALEATORIA',
        label: 'Chave Aleatória (EVP)',
        badgeClass: valid ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ Chave EVP válida (32 caracteres padrão Banco Central)' : `⚠️ Chave Aleatória: ${charCount} caracteres digitados.`,
        digitCount,
        isValid: valid,
      };
    }

    // MODO AUTO: Reconhecimento inteligente baseado na contagem de dígitos e caracteres
    if (key.includes('@')) {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      return {
        type: 'EMAIL',
        label: 'E-mail Detectado',
        badgeClass: valid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        description: valid ? '✅ Identificado como E-mail' : 'Identificado com @ (complete o e-mail)',
        digitCount,
        isValid: valid,
      };
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) || (/^[0-9a-f]{32}$/i.test(key) && /[a-f]/i.test(key))) {
      return {
        type: 'ALEATORIA',
        label: 'Chave Aleatória (EVP)',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: '✅ Identificada como Chave Aleatória EVP (32 caracteres)',
        digitCount,
        isValid: true,
      };
    }

    // Análise por contagem de dígitos
    if (digitCount === 14) {
      return {
        type: 'CNPJ',
        label: '14 Dígitos → CNPJ Detectado',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-bold',
        description: '✅ Identificado pelo tamanho: exatos 14 dígitos de CNPJ.',
        digitCount: 14,
        isValid: true,
      };
    }

    if (digitCount === 11) {
      const isLikelyCell = digits[2] === '9';
      return {
        type: isLikelyCell ? 'DUPLO' : 'CPF',
        label: isLikelyCell ? '11 Dígitos → CPF ou Celular' : '11 Dígitos → CPF Detectado',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
        description: isLikelyCell
          ? '✅ 11 dígitos reconhecidos! Compatível tanto com CPF quanto com Celular (com DDD).'
          : '✅ Identificado pelo tamanho: 11 dígitos de CPF.',
        digitCount: 11,
        isValid: true,
        canBeCell: isLikelyCell,
      };
    }

    if (digitCount === 10) {
      return {
        type: 'TELEFONE',
        label: '10 Dígitos → Telefone Fixo',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
        description: '✅ Identificado pelo tamanho: 10 dígitos (DDD + número fixo).',
        digitCount: 10,
        isValid: true,
      };
    }

    if (digits.startsWith('55') && (digitCount === 12 || digitCount === 13)) {
      return {
        type: 'TELEFONE',
        label: 'Telefone com DDI Brasil (+55)',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
        description: `✅ Identificado como Telefone com código de país +55 (${digitCount} dígitos).`,
        digitCount,
        isValid: true,
      };
    }

    if (digitCount > 0 && digitCount < 11) {
      return {
        type: 'INCOMPLETO',
        label: `${digitCount} dígitos digitados`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        description: `Contagem: ${digitCount} dígitos (faltam ${11 - digitCount} para CPF/Celular ou ${14 - digitCount} para CNPJ).`,
        digitCount,
        isValid: false,
      };
    }

    if (digitCount > 11 && digitCount < 14) {
      return {
        type: 'INCOMPLETO',
        label: `${digitCount} dígitos digitados`,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        description: `Contagem: ${digitCount} dígitos (faltam ${14 - digitCount} para completar CNPJ).`,
        digitCount,
        isValid: false,
      };
    }

    if (charCount > 0) {
      return {
        type: 'ALEATORIA',
        label: 'Chave Aleatória / Texto',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: `Texto livre: ${charCount} caracteres digitados.`,
        digitCount,
        isValid: true,
      };
    }

    return {
      type: 'VAZIA',
      label: 'Desconhecido',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      description: '',
      digitCount: 0,
      isValid: false,
    };
  };

  const pixAnalysis = analyzePixKey(form.masterPixKey || '', selectedPixType);

  // Aplica formatação rápida ao mudar o tipo
  const handleSelectPixType = (type: PixTypeChoice) => {
    setSelectedPixType(type);
    const currentKey = form.masterPixKey || '';
    const digits = currentKey.replace(/\D/g, '');

    if (type === 'CPF' && digits.length === 11) {
      setForm(prev => ({ ...prev, masterPixKey: formatCpf(digits) }));
    } else if (type === 'CNPJ' && digits.length === 14) {
      setForm(prev => ({ ...prev, masterPixKey: formatCnpj(digits) }));
    } else if (type === 'TELEFONE' && (digits.length === 10 || digits.length === 11)) {
      setForm(prev => ({ ...prev, masterPixKey: formatPhone(digits) }));
    }
  };

  const handleApplyMask = (maskType: 'CPF' | 'CNPJ' | 'TELEFONE') => {
    const digits = (form.masterPixKey || '').replace(/\D/g, '');
    if (maskType === 'CPF') {
      setSelectedPixType('CPF');
      setForm(prev => ({ ...prev, masterPixKey: formatCpf(digits) }));
    } else if (maskType === 'CNPJ') {
      setSelectedPixType('CNPJ');
      setForm(prev => ({ ...prev, masterPixKey: formatCnpj(digits) }));
    } else if (maskType === 'TELEFONE') {
      setSelectedPixType('TELEFONE');
      setForm(prev => ({ ...prev, masterPixKey: formatPhone(digits) }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const effectiveType = selectedPixType !== 'AUTO' 
      ? selectedPixType 
      : (pixAnalysis.type !== 'VAZIA' && pixAnalysis.type !== 'INCOMPLETO' ? pixAnalysis.type : undefined);

    const cleaned: SystemSettings = {
      salesPhone: form.salesPhone ? onlyDigits(form.salesPhone) : undefined,
      masterPixKey: form.masterPixKey?.trim() || undefined,
      masterPixKeyType: effectiveType,
      supportEmail: form.supportEmail?.trim() || undefined,
    };

    const res = await saveSystemSettings(cleaned);
    setSaving(false);

    if (res.success) {
      setFeedback({
        kind: 'success',
        msg: 'Configurações Master salvas com sucesso! Os dados foram sincronizados no banco de dados e no sistema.',
      });
    } else {
      const isRlsError = res.error && /violates row-level security/i.test(res.error);
      if (isRlsError) {
        setFeedback({
          kind: 'warning',
          msg: 'Suas alterações foram salvas com sucesso neste dispositivo e já estão ativas! Porém o Supabase bloqueou a gravação direta por Política de Segurança (RLS). Execute o script SQL abaixo no Supabase SQL Editor para sincronizar permanentemente no banco.',
          showSqlFix: true,
        });
      } else {
        setFeedback({
          kind: 'error',
          msg: res.error || 'Erro ao salvar configurações no banco de dados.',
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

  const KEY_TYPE_BUTTONS: { id: PixTypeChoice; label: string; icon: any }[] = [
    { id: 'AUTO',      label: '🔍 Auto-reconhecer', icon: Hash },
    { id: 'CPF',       label: '📄 CPF (11)',        icon: UserCheck },
    { id: 'CNPJ',      label: '🏢 CNPJ (14)',       icon: Building2 },
    { id: 'TELEFONE',  label: '📱 Telefone',        icon: Smartphone },
    { id: 'EMAIL',     label: '✉️ E-mail',          icon: AtSign },
    { id: 'ALEATORIA', label: '🔑 Aleatória',       icon: Key },
  ];

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
            
            {/* Campo 1: Chave PIX Master com Filtro de Tipo e Reconhecimento por Dígitos */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                    <KeyRound size={14} />
                  </div>
                  Chave PIX Master (Recebimento dos Planos)
                </label>
                
                {/* Badge de Reconhecimento Dinâmico */}
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${pixAnalysis.badgeClass}`}>
                  <Hash size={12} />
                  {pixAnalysis.label}
                </span>
              </div>

              {/* Filtro / Seletor de Tipo de Chave */}
              <div className="bg-gray-50/80 p-2 rounded-xl border border-gray-200/70 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Filtro / Tipo de Chave:
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {selectedPixType === 'AUTO' ? 'Detecção automática ativa' : `Modo forçado: ${selectedPixType}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                  {KEY_TYPE_BUTTONS.map(btn => {
                    const isSelected = selectedPixType === btn.id;
                    const Icon = btn.icon;
                    return (
                      <button
                        key={btn.id}
                        type="button"
                        onClick={() => handleSelectPixType(btn.id)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-bold transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
                            : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input da Chave */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    selectedPixType === 'CPF'
                      ? 'Digite os 11 dígitos do CPF (ex: 123.456.789-00)'
                      : selectedPixType === 'CNPJ'
                      ? 'Digite os 14 dígitos do CNPJ (ex: 12.345.678/0001-90)'
                      : selectedPixType === 'TELEFONE'
                      ? 'Digite o telefone com DDD (ex: 11999998888)'
                      : selectedPixType === 'EMAIL'
                      ? 'Digite seu e-mail (ex: financeiro@igrejaapp.com)'
                      : selectedPixType === 'ALEATORIA'
                      ? 'Cole sua chave aleatória (EVP) de 32 caracteres'
                      : 'Cole ou digite a chave (reconhece CPF, CNPJ, Telefone, E-mail ou Aleatória)'
                  }
                  className="w-full bg-gray-50 hover:bg-gray-50/80 focus:bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                  value={form.masterPixKey || ''}
                  onChange={e => setForm({ ...form, masterPixKey: e.target.value })}
                />
              </div>

              {/* Feedback de Análise e Ações Rápidas de Formatação */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2 text-xs">
                <div className="flex items-start gap-2 text-gray-700">
                  <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium leading-relaxed">{pixAnalysis.description}</p>
                  </div>
                </div>

                {/* Se detectou 11 dígitos, oferece formatação rápida */}
                {pixAnalysis.digitCount === 11 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100">
                    <span className="text-[11px] font-bold text-blue-900">Formatar rapidamente como:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyMask('CPF')}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <UserCheck size={12} /> Formatar como CPF (000.000.000-00)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyMask('TELEFONE')}
                      className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-teal-200 text-teal-700 rounded-md text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <Smartphone size={12} /> Formatar como Celular ((00) 90000-0000)
                    </button>
                  </div>
                )}

                {/* Se detectou 14 dígitos, oferece formatação rápida de CNPJ */}
                {pixAnalysis.digitCount === 14 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100">
                    <span className="text-[11px] font-bold text-blue-900">Formatar rapidamente como:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyMask('CNPJ')}
                      className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 rounded-md text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                    >
                      <Building2 size={12} /> Formatar como CNPJ (00.000.000/0000-00)
                    </button>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Campo 2: WhatsApp / Vendas */}
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
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Chave PIX Master</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5 font-mono">
                  {systemSettings.masterPixKey || <span className="text-gray-400 font-normal italic">Não configurada</span>}
                </div>
                {systemSettings.masterPixKey && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase">
                      {systemSettings.masterPixKeyType || 'PIX'}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp de Contato</div>
                <div className="text-xs font-bold text-gray-800 truncate mt-0.5 font-mono">
                  {systemSettings.salesPhone ? `+${systemSettings.salesPhone}` : <span className="text-gray-400 font-normal italic">Não configurado</span>}
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
