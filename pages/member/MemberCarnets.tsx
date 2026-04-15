import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { BookOpen, Download, Loader, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementsToPDF, loadImageForPDF } from '../../utils/pdfImageLoader';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MemberCarnets: React.FC = () => {
  const { carnets, session } = useMember();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState('');

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
        if (bgData) {
          doc.addImage(bgData, 'JPEG', 0, 0, PAGE_W_MM, 297);
        }
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
    } catch (e) {
      setError('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Carnês</h1>
        <p className="text-gray-400 text-sm mt-1">Baixe seus carnês disponíveis</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {carnets.length === 0 ? (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-10 text-center">
          <BookOpen size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhum carnê disponível no momento.</p>
          <p className="text-gray-600 text-xs mt-1">
            Entre em contato com a administração da sua igreja.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {carnets.map((template) => (
            <div
              key={template.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {template.backgroundUrl ? (
                    <img
                      src={template.backgroundUrl}
                      alt={template.name}
                      className="w-14 h-10 rounded-lg object-cover border border-gray-700 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-orange-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-100 text-sm font-semibold truncate">{template.name}</p>
                    <p className="text-gray-500 text-xs capitalize">{template.category}</p>
                    {template.isDefault && (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleGeneratePDF(template.id)}
                  disabled={generatingId === template.id}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all active:scale-95 shrink-0"
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

      <p className="text-center text-gray-600 text-xs pb-2">
        Os PDFs são gerados com seus dados pessoais automaticamente.
      </p>
    </div>
  );
};
