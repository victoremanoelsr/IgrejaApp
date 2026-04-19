import React from 'react';
import { FileText, Info, Mail } from 'lucide-react';

export const MemberDocumentos: React.FC = () => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Documentos</h1>
        <p className="text-slate-400 text-sm mt-1">Cartas e documentos eclesiásticos</p>
      </div>

      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center mx-auto mb-4">
          <FileText size={24} className="text-slate-500" />
        </div>
        <p className="text-slate-300 text-sm font-semibold">Documentos eclesiásticos</p>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed max-w-xs mx-auto">
          Cartas de recomendação e transferência são emitidas pela secretaria da sua igreja.
        </p>
      </div>

      <div className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Info size={14} className="text-blue-400" />
        </div>
        <div>
          <p className="text-slate-300 text-sm font-semibold mb-0.5">Como solicitar</p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Para solicitar uma carta de recomendação ou transferência, entre em contato com a
            secretaria ou administração da sua igreja.
          </p>
        </div>
      </div>

      <button className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/60 active:scale-[0.98] text-slate-300 font-semibold py-3.5 rounded-2xl transition-all text-sm">
        <Mail size={16} />
        Entrar em Contato
      </button>

      <div className="h-2" />
    </div>
  );
};
