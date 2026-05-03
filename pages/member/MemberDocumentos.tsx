import React, { useEffect } from 'react';
import { FileText, Award, Star, BookOpen, Loader } from 'lucide-react';
import { useMember } from '../../contexts/MemberContext';
import { LetterHistory } from '../../types';

const DOC_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  RECOMENDACAO: {
    label: 'Carta de Recomendação',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <FileText size={14} />,
  },
  MUDANCA: {
    label: 'Carta de Mudança',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: <BookOpen size={14} />,
  },
  BATISMO: {
    label: 'Cert. de Batismo',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Star size={14} />,
  },
  APRESENTACAO: {
    label: 'Cert. de Apresentação',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Award size={14} />,
  },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const MemberDocumentos: React.FC = () => {
  const { letterHistory, isLoading, refreshLetterHistory } = useMember();

  useEffect(() => {
    refreshLetterHistory();
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Documentos</h1>
        <p className="text-gray-500 text-sm mt-1">Cartas e certificados emitidos em seu nome</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin text-gray-400" />
        </div>
      ) : letterHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <FileText size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-semibold">Nenhum documento emitido</p>
          <p className="text-gray-400 text-xs mt-2 leading-relaxed">
            Cartas e certificados emitidos pela secretaria da sua igreja aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {letterHistory.map((doc: LetterHistory) => {
            const cfg = DOC_CONFIG[doc.letterType] || DOC_CONFIG.RECOMENDACAO;
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${cfg.color} shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-semibold">{cfg.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Emitido em {formatDate(doc.issuedAt)}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.color} shrink-0`}>
                  {doc.letterType}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs pb-2">
        Para solicitar um novo documento, entre em contato com a secretaria da sua igreja.
      </p>
    </div>
  );
};
