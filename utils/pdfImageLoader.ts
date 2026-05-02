const STUB_BOUNDARY_MM = 210 * 0.25; // 52.5 mm — 25% canhoto boundary

/**
 * Loads an image URL as a JPEG base64 data-URL.
 * Strategy: fetch → FileReader (no canvas taint), then canvas fallback.
 */
export const loadImageForPDF = (url: string): Promise<string | null> => {
  // 1) Try fetch → blob → FileReader (most reliable, avoids canvas CORS taint)
  return fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(r => {
      if (!r.ok) throw new Error('fetch failed');
      return r.blob();
    })
    .then(blob => new Promise<string | null>((resolve) => {
      // Convert blob to data URL (preserves original format; jsPDF handles JPEG/PNG/WEBP)
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }))
    .catch(() => {
      // 2) Canvas fallback (works for same-origin or CORS-permissive servers)
      return new Promise<string | null>((resolve) => {
        const draw = (source: HTMLImageElement) => {
          const canvas = document.createElement('canvas');
          canvas.width  = source.naturalWidth  || 794;
          canvas.height = source.naturalHeight || 264;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(source, 0, 0);
          try { resolve(canvas.toDataURL('image/jpeg', 0.92)); }
          catch { resolve(null); }
        };
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => draw(img);
        img.onerror = () => {
          const fallback = new Image();
          fallback.onload  = () => draw(fallback);
          fallback.onerror = () => resolve(null);
          fallback.src = url;
        };
        img.src = url;
      });
    });
};

/**
 * Renders layout elements (text + image) onto a jsPDF document for one ticket slot.
 * Stub-zone elements (x < STUB_BOUNDARY_MM) are clamped so text never crosses the
 * canhoto divider line.
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
      const src = el.content;
      if (!src) continue;
      if (!(src in imageCache)) {
        imageCache[src] = await loadImageForPDF(src);
      }
      const imgData = imageCache[src];
      if (imgData) {
        const wMM = (el.width  || 50) * scale;
        const hMM = (el.height || 50) * scale;
        const xMM = el.x * scale;
        const yMM = currentY + el.y * scale;
        // Detect format hint from data-url prefix
        const fmt = imgData.startsWith('data:image/png') ? 'PNG'
                  : imgData.startsWith('data:image/webp') ? 'WEBP'
                  : 'JPEG';
        try { doc.addImage(imgData, fmt, xMM, yMM, wMM, hMM); } catch { /* skip */ }
      }
    } else {
      let text = el.content as string;
      Object.entries(replacements).forEach(([tag, val]) => {
        text = text.replace(tag, val);
      });

      const fontSize = el.style?.fontSize || 11;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', el.style?.fontWeight === 'bold' ? 'bold' : 'normal');
      doc.setTextColor(el.style?.color || '#000000');

      const xMM  = el.x * scale;
      const yMM  = currentY + el.y * scale + fontSize * 0.35;

      // Stub zone: wrap text so it never crosses the canhoto divider line
      const isStub = xMM < STUB_BOUNDARY_MM;
      const maxW   = isStub
        ? STUB_BOUNDARY_MM - xMM - 1.5   // 1.5 mm margin before the divider
        : 210 - xMM - 2;                 // 2 mm margin from right edge

      if (isStub) {
        // Use splitTextToSize for word-wrap — keeps font size intact, looks professional
        const lineHeightMM = fontSize * 0.352778 * 1.25; // pt → mm × line-height factor
        const lines: string[] = doc.splitTextToSize(text, maxW);
        lines.forEach((line: string, i: number) => {
          doc.text(line, xMM, yMM + i * lineHeightMM);
        });
      } else {
        // Main zone: single line (wide enough for any realistic value)
        doc.text(text, xMM, yMM);
      }
    }
  }
};
