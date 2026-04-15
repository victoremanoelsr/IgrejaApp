import React from 'react';
import { FileText, Info } from 'lucide-react';

export const MemberDocumentos: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Documentos</h1>
        <p className="text-gray-400 text-sm mt-1">Cartas e documentos eclesiásticos</p>
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-10 text-center">
        <FileText size={32} className="text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm font-semibold">Documentos eclesiásticos</p>
        <p className="text-gray-600 text-xs mt-2 leading-relaxed">
          Cartas de recomendação e transferência são emitidas pela secretaria da sua
          igreja.
        </p>
      </div>

      <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-blue-400 text-sm leading-relaxed">
          Para solicitar uma carta de recomendação ou transferência, entre em contato
          com a secretaria ou administração da sua igreja.
        </p>
      </div>
    </div>
  );
};
