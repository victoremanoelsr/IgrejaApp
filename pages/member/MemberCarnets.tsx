import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { BookOpen, Download, Loader, AlertCircle, History } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementsToPDF, loadImageForPDF, addImageToPdf } from '../../utils/pdfImageLoader';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const formatDate = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const MemberCarnets: React.FC = () => {
  const { carnets, carnetHistory, session, isLoading, refreshCarnetHistory } = useMember();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    refreshCarnetHistory();
  }, []);

  if (!session) return null;
  const member = session.member;

  const handleGeneratePDF = async (templateId: string) => {
    const template = carnets.find((c) => c.id === templateId);
    if (!template) return;

    setGeneratingId(templateId);
    setError('');

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const EDITOR_WIDTH = 794;
      const PAGE_W_MM = 210;
      const scale = PAGE_W_MM / EDITOR_WIDTH;
      const imageCache: Record<string, string | null> = {};

      if (template.backgroundUrl) {
        const bgData = await loadImageForPDF(template.backgroundUrl);
        if (bgData) addImageToPdf(doc, bgData, 0, 0, PAGE_W_MM, 297);
      }

      const now = new Date();
      const replacements: Record<string, string> = {
        '{{nome_membro}}': member.name,
        '{{cpf}}': member.cpf,
        '{{mes_extenso}}': monthNames[now.getMonth()],
        '{{mes_numero}}': String(now.getMonth() + 1).padStart(2, '0'),
        '{{ano}}': String(now.getFullYear()),
        '{{n_parcela}}': '01',
        '{{valor}}': 'R$ ___,___',
        '{{igreja}}': session.church.name,
        '{{numero_membro}}': member.memberNumber || '',
      };

      await renderElementsToPDF(doc, template.layoutJson, scale, 0, replacements, imageCache);
      doc.save(`carne_${template.name.replace(/\s+/g, '_')}_${member.name.split(' ')[0]}.pdf`);
    } catch {
      setError('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Carnês</h1>
        <p className="text-gray-500 text-sm mt-1">Baixe seus carnês disponíveis</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-24" />
          ))}
        </div>
      ) : carnets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum carnê disponível no momento.</p>
          <p className="text-gray-400 text-xs mt-1">Entre em contato com a administração da sua igreja.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {carnets.map((template) => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {template.backgroundUrl ? (
                    <img
                      src={template.backgroundUrl}
                      alt={template.name}
                      className="w-14 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-orange-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-semibold truncate">{template.name}</p>
                    <p className="text-gray-400 text-xs capitalize">{template.category}</p>
                    {template.isDefault && (
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleGeneratePDF(template.id)}
                  disabled={generatingId === template.id}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 shrink-0"
                >
                  {generatingId === template.id ? (
                    <Loader size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  Baixar PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs pb-2">
        Os PDFs são gerados com seus dados pessoais automaticamente.
      </p>

      {/* Histórico de carnês emitidos */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-gray-400" />
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Histórico de Emissão</h2>
        </div>

        {carnetHistory.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <p className="text-gray-400 text-xs">Nenhum carnê foi emitido para você ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carnetHistory.map((txn) => {
              const isJovens = txn.category === 'JOVENS';
              return (
                <div key={txn.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isJovens ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    <BookOpen size={14} className={isJovens ? 'text-orange-500' : 'text-blue-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 text-xs font-semibold truncate">{txn.description}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Emitido em {formatDate(txn.date)}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${isJovens ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {txn.category}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
