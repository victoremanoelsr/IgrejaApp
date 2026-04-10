/**
 * Loads an image URL as a JPEG base64 data-URL using the browser Canvas API.
 * This avoids fetch/CORS issues and auto-converts any format to JPEG for jsPDF.
 */
export const loadImageForPDF = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();

    const draw = (source: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      canvas.width  = source.naturalWidth  || 794;
      canvas.height = source.naturalHeight || 264;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(source, 0, 0);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };

    img.crossOrigin = 'anonymous';
    img.onload  = () => draw(img);
    img.onerror = () => {
      // Retry without crossOrigin (works for same-origin images)
      const fallback = new Image();
      fallback.onload  = () => draw(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = url;
    };
    img.src = url;
  });
};

/**
 * Renders layout elements (text + image) onto a jsPDF document for one ticket slot.
 * @param doc        jsPDF instance
 * @param elements   LayoutElement array from the template
 * @param scale      mm/px ratio  (typically 210 / EDITOR_WIDTH)
 * @param currentY   top of the current ticket slot in mm
 * @param replacements  tag → value map for the current ticket
 * @param imageCache    cache of preloaded image dataURLs (url → dataURL)
 */
export const renderElementsToPDF = async (
  doc: any,
  elements: any[],
  scale: number,
  currentY: number,
  replacements: Record<string, string>,
  imageCache: Record<string, string | null>
) => {
  for (const el of elements) {
    if (el.type === 'image') {
      // Render QR code / image element
      const src = el.content;
      if (!src) continue;
      if (!(src in imageCache)) {
        imageCache[src] = await loadImageForPDF(src);
      }
      const imgData = imageCache[src];
      if (imgData) {
        const wMM  = (el.width  || 50) * scale;
        const hMM  = (el.height || 50) * scale;
        const xMM  = el.x * scale;
        const yMM  = currentY + el.y * scale;
        doc.addImage(imgData, 'JPEG', xMM, yMM, wMM, hMM);
      }
    } else {
      // Text / tag element
      let text = el.content as string;
      Object.entries(replacements).forEach(([tag, val]) => {
        text = text.replace(tag, val);
      });

      let fontSize = el.style?.fontSize || 11;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', el.style?.fontWeight === 'bold' ? 'bold' : 'normal');

      // Auto-shrink text to fit zone width
      const xMM = el.x * scale;
      const PAGE_W = 210;
      const maxW = Math.max(10, PAGE_W - xMM - 2);
      while (doc.getTextWidth(text) > maxW && fontSize > 5) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
      }

      doc.setTextColor(el.style?.color || '#000000');
      doc.text(text, xMM, currentY + el.y * scale + fontSize * 0.35);
    }
  }
};
