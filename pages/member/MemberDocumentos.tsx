import React from 'react';
import { FileText, Info } from 'lucide-react';

export const MemberDocumentos: React.FC = () => {
  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-white">Documentos</h1>
        <p className="text-slate-400 text-xs mt-0.5">Cartas e documentos eclesiásticos</p>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-10 text-center">
        <FileText size={32} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-semibold">Documentos eclesiásticos</p>
        <p className="text-slate-600 text-xs mt-2 leading-relaxed">
          Cartas de recomendação e transferência são emitidas pela secretaria da sua
          igreja.
        </p>
      </div>

      <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-400 text-xs leading-relaxed">
          Para solicitar uma carta de recomendação ou transferência, entre em contato
          com a secretaria ou administração da sua igreja.
        </p>
      </div>
    </div>
  );
};
