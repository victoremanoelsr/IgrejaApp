import React, { useState } from 'react';
import { Award, Star, Loader, ShieldCheck, Eye, Download, FileText, FileCheck, Baby, Heart } from 'lucide-react';
import { useMember } from '../../contexts/MemberContext';
import { LetterHistory } from '../../types';
import jsPDF from 'jspdf';
import { loadImageForPDF, addImageToPdf } from '../../utils/pdfImageLoader';
import { supabase } from '../../services/supabaseClient';

// --- PDF constants (mirror Letters.tsx) ---
const EDITOR_WIDTH = 595;
const A4_WIDTH_MM  = 210;
const A4_HEIGHT_MM = 297;

const DOC_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; isCert: boolean }> = {
  BATISMO: {
    label: 'Certificado de Batismo',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Star size={16} />,
    isCert: true,
  },
  APRESENTACAO: {
    label: 'Certificado de Apresentação',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Baby size={16} />,
    isCert: true,
  },
  RECOMENDACAO: {
    label: 'Carta de Recomendação',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <FileText size={16} />,
    isCert: false,
  },
  MUDANCA: {
    label: 'Carta de Mudança',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: <FileCheck size={16} />,
    isCert: false,
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

const renderJustifiedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight?: number,
) => {
  const lh = lineHeight || doc.getLineHeight() / doc.internal.scaleFactor;
  const paragraphs = text.split('\n');
  let cursorY = y;
  paragraphs.forEach((para) => {
    if (para.trim() === '') { cursorY += lh; return; }
    const lines: string[] = doc.splitTextToSize(para, maxWidth);
    lines.forEach((line, lIdx) => {
      const isLast = lIdx === lines.length - 1;
      const isShort = doc.getTextWidth(line) < maxWidth * 0.85;
      if (isLast || isShort) {
        doc.text(line, x, cursorY);
      } else {
        doc.text(line, x, cursorY, { align: 'justify', maxWidth });
      }
      cursorY += lh;
    });
  });
  return cursorY;
};

const buildReplacements = (
  snap: LetterHistory['memberDataSnapshot'],
  fullDate: string,
  churchPastor?: string,
) => ({
  '{{nome_membro}}': snap?.name || '',
  '{{cpf}}': snap?.cpf || '',
  '{{rg}}': snap?.rg || '',
  '{{cargo}}': snap?.roleOrFunction || '',
  '{{data_batismo}}': snap?.baptismDate
    ? new Date(snap.baptismDate).toLocaleDateString('pt-BR')
    : '-',
  '{{data_nascimento}}': snap?.birthDate
    ? new Date(snap.birthDate).toLocaleDateString('pt-BR')
    : '-',
  '{{data_atual}}': new Date().toLocaleDateString('pt-BR'),
  '{{cidade_igreja}}': fullDate,
  '{{estado_civil}}': snap?.maritalStatus || '',
  '{{nome_pastor_presidente}}': churchPastor || '',
  '{{nacionalidade}}': snap?.nacionalidade || 'Brasileiro(a)',
  '{{naturalidade}}': snap?.naturalidade || '',
  '{{nome_pai}}': snap?.fatherName || '',
  '{{nome_mae}}': snap?.motherName || '',
});

async function generateDocumentPDF(
  doc: LetterHistory,
  mode: 'view' | 'download',
) {
  const isCert = doc.letterType === 'BATISMO' || doc.letterType === 'APRESENTACAO';
  const orientation = isCert ? 'l' : 'p';
  const pdfW = isCert ? A4_HEIGHT_MM : A4_WIDTH_MM; // 297mm se certificado (paisagem), 210mm se carta (retrato)
  const pdfH = isCert ? A4_WIDTH_MM : A4_HEIGHT_MM; // 210mm se certificado (paisagem), 297mm se carta (retrato)
  const pdf = new jsPDF(orientation, 'mm', 'a4');

  try {
    const [{ data: templates }, { data: churches }] = await Promise.all([
      supabase
        .from('letter_templates')
        .select('*')
        .eq('church_id', doc.churchId)
        .in('type', [doc.letterType, 'GENERICO'])
        .order('created_at', { ascending: false }),
      supabase
        .from('churches')
        .select('id, name, address, pastor_name, logo_url')
        .eq('id', doc.churchId)
        .limit(1),
    ]);

    const templateList = Array.isArray(templates) ? templates : [];
    const template =
      templateList.find((t: any) => t.type === doc.letterType) ||
      templateList.find((t: any) => t.type === 'GENERICO') ||
      null;
    const church = Array.isArray(churches) && churches.length > 0 ? churches[0] : null;

    const churchName    = church?.name        || '';
    const churchAddress = church?.address     || '';
    const pastorName    = church?.pastor_name || '';
    const logoUrl       = church?.logo_url    || '';

    const city = churchAddress.split(',')[1]?.trim() || churchName;
    const today = new Date();
    const fullDate = `${city}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;
    const replacements = buildReplacements(doc.memberDataSnapshot, fullDate, pastorName);

    if (template) {
      if (template.background_url) {
        const bgData = await loadImageForPDF(template.background_url);
        if (bgData) addImageToPdf(pdf, bgData, 0, 0, pdfW, pdfH);
      }

      const scale = pdfW / EDITOR_WIDTH;
      const layoutElements: any[] = template.layout_json || [];

      for (const el of layoutElements) {
        if (el.type === 'image') {
          if (el.content) {
            const imgData = await loadImageForPDF(el.content);
            if (imgData) {
              addImageToPdf(
                pdf, imgData,
                el.x * scale,
                el.y * scale,
                (el.width  || 50) * scale,
                (el.height || 50) * scale,
              );
            }
          }
          continue;
        }

        if (el.content === '{{texto_cadastrado}}') {
          const bodyText = doc.letterType === 'MUDANCA'
            ? (template.change_text || '')
            : (template.recommendation_text || '');

          if (bodyText.trim()) {
            let processed = bodyText;
            Object.entries(replacements).forEach(([tag, val]) => {
              processed = processed.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), val as string);
            });
            pdf.setTextColor(el.style?.color || '#000000');
            pdf.setFontSize(el.style?.fontSize || 11);
            pdf.setFont('helvetica', el.style?.fontWeight === 'bold' ? 'bold' : 'normal');

            const pageMargin = isCert ? 30 : 20;
            const safeMaxW   = pdfW - 2 * pageMargin;
            const lh         = pdf.getLineHeight() / pdf.internal.scaleFactor;

            const allLinesEst: string[] = [];
            processed.split('\n').forEach(para => {
              if (para.trim() === '') { allLinesEst.push(''); return; }
              allLinesEst.push(...pdf.splitTextToSize(para, safeMaxW));
            });
            const blockH = allLinesEst.length * lh;
            const textY  = Math.max(pageMargin + lh, (pdfH - blockH) / 2 + lh);
            const align  = el.style?.textAlign as string;

            if (align === 'center') {
              const lines = pdf.splitTextToSize(processed, safeMaxW);
              lines.forEach((line: string, i: number) => {
                pdf.text(line, pdfW / 2, textY + i * lh, { align: 'center' });
              });
            } else {
              renderJustifiedText(pdf, processed, pageMargin, textY, safeMaxW, lh);
            }
          }
          continue;
        }

        let text = el.content as string;
        Object.entries(replacements).forEach(([tag, val]) => {
          text = text.replace(tag, val as string);
        });
        pdf.setTextColor(el.style?.color || '#000000');
        pdf.setFontSize(el.style?.fontSize || 11);
        pdf.setFont('helvetica', el.style?.fontWeight === 'bold' ? 'bold' : 'normal');

        const x = el.x * scale;
        const y = el.y * scale + ((el.style?.fontSize || 11) * 0.35);
        if (el.style?.textAlign === 'center') {
          pdf.text(text, x, y, { align: 'center' });
        } else if (el.style?.textAlign === 'right') {
          pdf.text(text, x, y, { align: 'right' });
        } else {
          pdf.text(text, x, y);
        }
      }
    } else {
      // --- Fallback Text Rendering ---
      if (logoUrl) {
        const logo = await loadImageForPDF(logoUrl);
        if (logo) addImageToPdf(pdf, logo, 15, 10, 25, 25);
      }

      if (isCert) {
        // Landscape certificate fallback
        pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
        pdf.text(churchName.toUpperCase(), pdfW / 2, 22, { align: 'center' });
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
        pdf.text(churchAddress, pdfW / 2, 28, { align: 'center' });
        pdf.text(`Pastor Presidente: ${pastorName}`, pdfW / 2, 34, { align: 'center' });

        pdf.setLineWidth(0.5);
        pdf.line(15, 42, pdfW - 15, 42);

        const title = doc.letterType === 'BATISMO'
          ? 'CERTIFICADO DE BATISMO'
          : 'CERTIFICADO DE APRESENTAÇÃO';
        pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
        pdf.text(title, pdfW / 2, 60, { align: 'center' });

        const snap = doc.memberDataSnapshot;
        const formattedBirth = snap.birthDate ? new Date(snap.birthDate).toLocaleDateString('pt-BR') : '-';
        const formattedBaptism = snap.baptismDate ? new Date(snap.baptismDate).toLocaleDateString('pt-BR') : '-';

        let bodyText = '';
        if (doc.letterType === 'BATISMO') {
          bodyText = `Certificamos que ${snap.name || ''}, portador(a) do CPF nº ${snap.cpf || ''}, ` +
            `nascido(a) em ${formattedBirth}, recebeu o Santo Batismo nas águas em ${formattedBaptism}, ` +
            `em cumprimento ao mandamento bíblico, sendo reconhecido(a) como membro batizado(a) desta comunidade de fé.`;
        } else {
          bodyText = `Certificamos que a criança ${snap.name || ''}, nascida em ${formattedBirth}, ` +
            `filha de ${snap.fatherName || 'Pai não informado'} e ${snap.motherName || 'Mãe não informada'}, ` +
            `foi solenemente apresentada ao Senhor Jesus Cristo nesta congregação, segundo o mandamento das Sagradas Escrituras (Lucas 2:22), ` +
            `com oração e imposição de mãos, impetrando sobre sua vida a bênção e a graça do Deus Todo-Poderoso.`;
        }

        pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
        renderJustifiedText(pdf, bodyText, 25, 80, pdfW - 50);

        pdf.text(fullDate, pdfW / 2, 150, { align: 'center' });
        pdf.line(pdfW / 2 - 40, 175, pdfW / 2 + 40, 175);
        pdf.text('Assinatura do Pastor', pdfW / 2, 180, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text(pastorName.toUpperCase(), pdfW / 2, 185, { align: 'center' });
      } else {
        // Portrait letter fallback (Recomendação / Mudança)
        const snap = doc.memberDataSnapshot;
        const formattedBirth = snap.birthDate ? new Date(snap.birthDate).toLocaleDateString('pt-BR') : '-';
        const formattedBaptism = snap.baptismDate ? new Date(snap.baptismDate).toLocaleDateString('pt-BR') : 'data não registrada';
        const role = snap.roleOrFunction || 'Membro';

        pdf.setFontSize(14); pdf.setFont('helvetica', 'bold');
        pdf.text(churchName.toUpperCase(), 105, 25, { align: 'center' });
        pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
        pdf.text(churchAddress, 105, 32, { align: 'center' });
        pdf.text(`Pastor Presidente: ${pastorName}`, 105, 39, { align: 'center' });
        pdf.setLineWidth(0.5); pdf.line(15, 50, 195, 50);

        const title = doc.letterType === 'MUDANCA' ? 'CARTA DE MUDANÇA' : 'CARTA DE RECOMENDAÇÃO';
        pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
        pdf.text(title, 105, 70, { align: 'center' });

        let content = '';
        if (doc.letterType === 'MUDANCA') {
          content = `A Igreja Evangélica em ${city}, concede a presente CARTA DE MUDANÇA ao(à) irmão(ã) ${snap.name}, portador(a) do CPF nº ${snap.cpf}, nascido(a) em ${formattedBirth} e batizado(a) nas águas em ${formattedBaptism}.\n\nO(A) referido(a) irmão(ã) esteve em comunhão conosco na função de ${role} e, por motivo de mudança, solicitou seu desligamento de nosso rol de membros.\n\nNada temos que desabone sua conduta moral e espiritual. Portanto, o(a) recomendamos à vossa filiação.\n\nSem mais para o momento, subscrevemo-nos.`;
        } else {
          content = `A Igreja Evangélica em ${city}, vem por meio desta, recomendar à comunhão dos santos, o(a) irmão(a) ${snap.name}, portador(a) do CPF nº ${snap.cpf}, nascido(a) em ${formattedBirth} e batizado(a) nas águas em ${formattedBaptism}.\n\nO(A) referido(a) irmão(a) é ${role} em nossa igreja, encontrando-se em plena comunhão e paz conosco. Portanto, o(a) recomendamos para participar de todas as atividades e sacramentos, como membro do corpo de Cristo.\n\nSem mais para o momento, subscrevemo-nos.`;
        }

        pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
        renderJustifiedText(pdf, content, 20, 90, 170);

        pdf.text(fullDate, 105, 185, { align: 'center' });
        pdf.line(65, 220, 145, 220);
        pdf.text('Assinatura do Pastor', 105, 225, { align: 'center' });
        pdf.setFontSize(8);
        pdf.text(pastorName.toUpperCase(), 105, 230, { align: 'center' });
      }
    }
  } catch (e) {
    console.error('[MemberDocumentos] PDF generation error:', e);
  }

  const snapName = doc.memberDataSnapshot?.name || 'documento';
  const safeName = snapName.replace(/\s+/g, '_');
  const typeLabel = isCert
    ? (doc.letterType === 'BATISMO' ? 'Certificado_Batismo' : 'Certificado_Apresentacao')
    : (doc.letterType === 'MUDANCA' ? 'Carta_Mudanca' : 'Carta_Recomendacao');
  const filename = `${typeLabel}_${safeName}.pdf`;

  if (mode === 'view') {
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl as unknown as string, '_blank');
  } else {
    pdf.save(filename);
  }
}

export const MemberDocumentos: React.FC = () => {
  const { session, letterHistory, isLoadingLetters } = useMember();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (cert: LetterHistory, mode: 'view' | 'download') => {
    setLoadingId(`${cert.id}-${mode}`);
    try {
      await generateDocumentPDF(cert, mode);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Documentos e Certificados</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cartas e certificados permanentes emitidos pela igreja em seu nome ou de seus filhos
        </p>
      </div>

      {isLoadingLetters ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin text-gray-400" />
        </div>
      ) : letterHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <ShieldCheck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-semibold">Nenhum documento emitido</p>
          <p className="text-gray-400 text-xs mt-2 leading-relaxed">
            Cartas de recomendação, cartas de mudança, certificados de batismo e apresentação emitidos pela secretaria aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {letterHistory.map((cert: LetterHistory) => {
            const cfg = DOC_CONFIG[cert.letterType] ?? DOC_CONFIG.RECOMENDACAO;
            const isChildDoc = cert.letterType === 'APRESENTACAO' && cert.memberId !== session?.member?.id;
            const childName = cert.memberDataSnapshot?.name || cert.memberName;
            const isViewLoading = loadingId === `${cert.id}-view`;
            const isDlLoading   = loadingId === `${cert.id}-download`;
            const anyLoading    = isViewLoading || isDlLoading;

            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-between hover:shadow-md hover:border-orange-200 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${cfg.color} shrink-0 mt-0.5`}>
                    {isChildDoc ? <Baby size={18} /> : cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-gray-800 text-sm font-bold truncate">
                        {isChildDoc ? 'Certificado de Apresentação' : cfg.label}
                      </p>
                    </div>

                    {isChildDoc && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          <Baby size={12} className="shrink-0" />
                          Filho(a): {childName}
                        </span>
                      </div>
                    )}

                    <p className="text-gray-400 text-xs mt-1">
                      Emitido em {formatDate(cert.issuedAt)}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.color} shrink-0 hidden sm:inline-flex`}>
                    {cert.letterType === 'BATISMO' ? 'Batismo' :
                     cert.letterType === 'APRESENTACAO' ? 'Apresentação' :
                     cert.letterType === 'RECOMENDACAO' ? 'Recomendação' : 'Mudança'}
                  </span>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleAction(cert, 'view')}
                    disabled={anyLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isViewLoading
                      ? <Loader size={13} className="animate-spin" />
                      : <Eye size={13} />}
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleAction(cert, 'download')}
                    disabled={anyLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-brand-orange hover:bg-orange-600 text-white border border-brand-orange transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isDlLoading
                      ? <Loader size={13} className="animate-spin" />
                      : <Download size={13} />}
                    Baixar PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs pb-2">
        Para solicitar novos certificados ou cartas, entre em contato com a secretaria da sua igreja.
      </p>
    </div>
  );
};

