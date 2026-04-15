import React from 'react';
import { FileText, Info } from 'lucide-react';

export const MemberDocumentos: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Documentos</h1>
        <p className="text-gray-500 text-sm mt-1">Cartas e documentos eclesiásticos</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
        <FileText size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 text-sm font-semibold">Documentos eclesiásticos</p>
        <p className="text-gray-400 text-xs mt-2 leading-relaxed">
          Cartas de recomendação e transferência são emitidas pela secretaria da sua
          igreja.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-blue-700 text-sm leading-relaxed">
          Para solicitar uma carta de recomendação ou transferência, entre em contato
          com a secretaria ou administração da sua igreja.
        </p>
      </div>
    </div>
  );
};
