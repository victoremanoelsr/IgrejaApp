import React, { useState } from 'react';
import { Award, Star, Loader, ShieldCheck, Eye, Download } from 'lucide-react';
import { useMember } from '../../contexts/MemberContext';
import { LetterHistory } from '../../types';
import jsPDF from 'jspdf';
import { loadImageForPDF, addImageToPdf } from '../../utils/pdfImageLoader';

// --- PDF constants (mirror Letters.tsx) ---
const EDITOR_WIDTH = 595;
const A4_WIDTH_MM  = 210;
const A4_HEIGHT_MM = 297;

const CERT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BATISMO: {
    label: 'Certificado de Batismo',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: <Star size={16} />,
  },
  APRESENTACAO: {
    label: 'Certificado de Apresentação',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: <Award size={16} />,
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
) => ({
  '{{nome_membro}}': snap.name || '',
  '{{cpf}}': snap.cpf || '',
  '{{cargo}}': snap.roleOrFunction || '',
  '{{data_batismo}}': snap.baptismDate
    ? new Date(snap.baptismDate).toLocaleDateString('pt-BR')
    : '-',
  '{{data_nascimento}}': snap.birthDate
    ? new Date(snap.birthDate).toLocaleDateString('pt-BR')
    : '-',
  '{{data_atual}}': new Date().toLocaleDateString('pt-BR'),
  '{{cidade_igreja}}': fullDate,
  '{{estado_civil}}': '',
});

async function generateCertPDF(
  doc: LetterHistory,
  mode: 'view' | 'download',
) {
  const pdfW = A4_HEIGHT_MM; // landscape: 297 mm wide
  const pdfH = A4_WIDTH_MM;  // landscape: 210 mm tall
  const pdf = new jsPDF('l', 'mm', 'a4');

  try {
    const res = await fetch(
      `/api/member-cert-template?church_id=${encodeURIComponent(doc.churchId)}&letter_type=${encodeURIComponent(doc.letterType)}`,
    );
    const { template, church } = res.ok ? await res.json() : { template: null, church: null };

    const churchName    = church?.name       || '';
    const churchAddress = church?.address    || '';
    const pastorName    = church?.pastor_name || '';
    const logoUrl       = church?.logo_url   || '';

    const city = churchAddress.split(',')[1]?.trim() || churchName;
    const today = new Date();
    const fullDate = `${city}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;
    const replacements = buildReplacements(doc.memberDataSnapshot, fullDate);

    if (template) {
      // --- Template-based rendering (matches Letters.tsx exactly) ---
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
          const bodyText = template.recommendation_text || '';
          if (bodyText.trim()) {
            let processed = bodyText;
            Object.entries(replacements).forEach(([tag, val]) => {
              processed = processed.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), val as string);
            });
            pdf.setTextColor(el.style?.color || '#000000');
            pdf.setFontSize(el.style?.fontSize || 11);
            pdf.setFont('helvetica', el.style?.fontWeight === 'bold' ? 'bold' : 'normal');

            const pageMargin = 15;
            const safeMaxW   = pdfW - 2 * pageMargin;
            const textY      = (el.y * scale) + ((el.style?.fontSize || 11) * 0.35);
            const lh         = pdf.getLineHeight() / pdf.internal.scaleFactor;
            const align      = el.style?.textAlign as string;

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
      // --- Fallback: basic text certificate ---
      if (logoUrl) {
        const logo = await loadImageForPDF(logoUrl);
        if (logo) addImageToPdf(pdf, logo, 15, 10, 25, 25);
      }
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
      const bodyText =
        `Certificamos que ${snap.name || ''}, portador(a) do CPF nº ${snap.cpf || ''}, ` +
        `nascido(a) em ${snap.birthDate ? new Date(snap.birthDate).toLocaleDateString('pt-BR') : '-'}, ` +
        (doc.letterType === 'BATISMO'
          ? `recebeu o Santo Batismo nas águas em ${snap.baptismDate ? new Date(snap.baptismDate).toLocaleDateString('pt-BR') : '-'}, ` +
            `em cumprimento ao mandamento bíblico, sendo reconhecido(a) como membro batizado(a) desta comunidade de fé.`
          : `é membro desta congregação, ocupando a função de ${snap.roleOrFunction || 'Membro'}, ` +
            `encontrando-se em plena comunhão e paz conosco, tendo conduta ilibada perante esta assembleia.`);

      pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
      renderJustifiedText(pdf, bodyText, 20, 80, pdfW - 40);

      pdf.text(fullDate, pdfW / 2, 150, { align: 'center' });
      pdf.line(pdfW / 2 - 40, 175, pdfW / 2 + 40, 175);
      pdf.text('Assinatura do Pastor', pdfW / 2, 180, { align: 'center' });
      pdf.setFontSize(8);
      pdf.text(pastorName.toUpperCase(), pdfW / 2, 185, { align: 'center' });
    }
  } catch (e) {
    console.error('[MemberDocumentos] PDF generation error:', e);
  }

  const safeName = (doc.memberDataSnapshot.name || 'membro').replace(/\s+/g, '_');
  const typeLabel = doc.letterType === 'BATISMO' ? 'Batismo' : 'Apresentacao';
  const filename  = `Certificado_${typeLabel}_${safeName}.pdf`;

  if (mode === 'view') {
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl as unknown as string, '_blank');
  } else {
    pdf.save(filename);
  }
}

export const MemberDocumentos: React.FC = () => {
  const { letterHistory, isLoadingLetters } = useMember();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (cert: LetterHistory, mode: 'view' | 'download') => {
    setLoadingId(`${cert.id}-${mode}`);
    try {
      await generateCertPDF(cert, mode);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Certificados</h1>
        <p className="text-gray-500 text-sm mt-1">Certificados permanentes emitidos em seu nome</p>
      </div>

      {isLoadingLetters ? (
        <div className="flex items-center justify-center py-12">
          <Loader size={24} className="animate-spin text-gray-400" />
        </div>
      ) : letterHistory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <ShieldCheck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 text-sm font-semibold">Nenhum certificado emitido</p>
          <p className="text-gray-400 text-xs mt-2 leading-relaxed">
            Certificados de Batismo e Apresentação emitidos pela secretaria da sua igreja aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {letterHistory.map((cert: LetterHistory) => {
            const cfg = CERT_CONFIG[cert.letterType] ?? CERT_CONFIG.BATISMO;
            const isViewLoading = loadingId === `${cert.id}-view`;
            const isDlLoading   = loadingId === `${cert.id}-download`;
            const anyLoading    = isViewLoading || isDlLoading;

            return (
              <div
                key={cert.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${cfg.color} shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-semibold">{cfg.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Emitido em {formatDate(cert.issuedAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.color} shrink-0 hidden sm:inline-flex`}>
                    {cert.letterType === 'BATISMO' ? 'Batismo' : 'Apresentação'}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleAction(cert, 'view')}
                    disabled={anyLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isViewLoading
                      ? <Loader size={13} className="animate-spin" />
                      : <Eye size={13} />}
                    Ver
                  </button>
                  <button
                    onClick={() => handleAction(cert, 'download')}
                    disabled={anyLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 transition-colors disabled:opacity-50"
                  >
                    {isDlLoading
                      ? <Loader size={13} className="animate-spin" />
                      : <Download size={13} />}
                    Baixar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-gray-400 text-xs pb-2">
        Para solicitar um certificado, entre em contato com a secretaria da sua igreja.
      </p>
    </div>
  );
};
