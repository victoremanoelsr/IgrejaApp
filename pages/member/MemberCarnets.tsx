import React, { useState } from 'react';
import { useMember } from '../../contexts/MemberContext';
import { BookOpen, Download, Loader, AlertCircle, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { renderElementsToPDF, loadImageForPDF } from '../../utils/pdfImageLoader';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MemberCarnets: React.FC = () => {
  const { carnets, session, isLoading } = useMember();
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
        if (bgData) doc.addImage(bgData, 'JPEG', 0, 0, PAGE_W_MM, 297);
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
    <div className="space-y-5">
      <div>
        <h1 className="text-white text-2xl font-bold">Carnês</h1>
        <p className="text-slate-400 text-sm mt-1">Baixe seus carnês disponíveis</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-slate-800 rounded-2xl h-28" />
          ))}
        </div>
      ) : carnets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-10 text-center">
          <BookOpen size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">Nenhum carnê disponível.</p>
          <p className="text-slate-600 text-xs mt-1">
            Entre em contato com a administração da sua igreja.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {carnets.map((template) => (
            <div
              key={template.id}
              className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail */}
                {template.backgroundUrl ? (
                  <img
                    src={template.backgroundUrl}
                    alt={template.name}
                    className="w-16 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-orange-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-slate-200 text-sm font-semibold truncate">
                      {template.name}
                    </p>
                    {template.isDefault && (
                      <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs capitalize mb-2">{template.category}</p>

                  {/* Progress bar (visual — shows readiness) */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full w-full" />
                    </div>
                    <span className="text-slate-500 text-[10px] font-semibold shrink-0">
                      Disponível
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleGeneratePDF(template.id)}
                  disabled={generatingId === template.id}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/40 active:scale-95 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all shrink-0 shadow-md shadow-orange-500/20"
                >
                  {generatingId === template.id ? (
                    <Loader size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800/60 rounded-2xl p-4 flex items-start gap-3">
        <BookOpen size={15} className="text-slate-500 shrink-0 mt-0.5" />
        <p className="text-slate-500 text-xs leading-relaxed">
          Os PDFs são gerados automaticamente com seus dados pessoais e podem ser usados como
          comprovante de contribuição.
        </p>
      </div>

      <div className="h-2" />
    </div>
  );
};
