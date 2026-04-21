import React from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, MessageCircle, ArrowLeft, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context';

export const BlockedPage: React.FC = () => {
  const navigate = useNavigate();
  const { systemSettings, logout, user } = useApp();

  const salesPhone = (systemSettings.salesPhone || '').replace(/\D+/g, '');
  const supportEmail = systemSettings.supportEmail?.trim();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      'Olá! Minha igreja está com o acesso ao IgrejaApp suspenso por pagamento pendente. Quero regularizar.'
    );
    const url = salesPhone
      ? `https://wa.me/${salesPhone}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    if (!supportEmail) return;
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent('Regularização de Pagamento — IgrejaApp')}`;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-6">
          <motion.div
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className="bg-red-500/20 border border-red-500/40 rounded-full p-6"
          >
            <ShieldOff size={48} className="text-red-400" />
          </motion.div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Pagamento Pendente
        </h1>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          O acesso ao painel da sua sede está temporariamente bloqueado por pendência de pagamento.
          Regularize para liberar imediatamente o acesso completo (sede, congregações e portal do membro).
        </p>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Sistema Bloqueado</span>
          </div>
          <p className="text-slate-300 text-sm">
            Após confirmação do pagamento pelo administrador do IgrejaApp, o acesso é liberado automaticamente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <motion.button
            onClick={handleWhatsApp}
            whileTap={{ scale: 0.96 }}
            className="flex items-center justify-center gap-2 py-3 px-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/30"
          >
            <MessageCircle size={18} />
            Falar com Vendas (WhatsApp)
          </motion.button>

          {supportEmail && (
            <motion.button
              onClick={handleEmail}
              whileTap={{ scale: 0.96 }}
              className="flex items-center justify-center gap-2 py-3 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-bold text-sm transition-all"
            >
              <Mail size={16} />
              Enviar e-mail ao suporte
            </motion.button>
          )}
        </div>

        {user ? (
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors mx-auto"
          >
            <LogOut size={15} />
            Sair
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors mx-auto"
          >
            <ArrowLeft size={15} />
            Voltar para o Login
          </button>
        )}

        <p className="text-slate-600 text-xs mt-6">
          IgrejaApp &copy; {new Date().getFullYear()} &mdash; Gestão Eclesiástica
        </p>
      </motion.div>
    </div>
  );
};
