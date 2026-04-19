import React from 'react';
import { ShieldOff, MessageCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BlockedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    const msg = encodeURIComponent('Olá, preciso regularizar o acesso ao IgrejaApp. Minha sede está bloqueada por falta de pagamento.');
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 py-6 px-4">
      <div className="max-w-md w-full text-center">

        <div className="flex justify-center mb-6">
          <div className="bg-red-500/20 border border-red-500/40 rounded-full p-6">
            <ShieldOff size={48} className="text-red-400" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Acesso Suspenso
        </h1>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Sistema bloqueado por falta de pagamento. O acesso para Sede, Congregações e Membros está suspenso. Entre em contato com a administração para regularizar.
        </p>

        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2"></div>
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Sistema Bloqueado</span>
          </div>
          <p className="text-slate-300 text-sm">
            Para restaurar o acesso, o responsável financeiro da sede precisa regularizar o pagamento junto à administração do IgrejaApp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-green-900/30"
          >
            <MessageCircle size={18} />
            Falar com Suporte
          </button>

        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors mx-auto"
        >
          <ArrowLeft size={15} />
          Voltar para o Login
        </button>

        <p className="text-slate-600 text-xs mt-6">
          IgrejaApp &copy; {new Date().getFullYear()} &mdash; Gestão Eclesiástica
        </p>
      </div>
    </div>
  );
};
