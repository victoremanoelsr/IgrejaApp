const STUB_BOUNDARY_MM = 210 * 0.25; // 52.5 mm — 25% canhoto boundary

/**
 * Loads an image URL and returns it as a JPEG base64 data-URL suitable for jsPDF.
 *
 * Strategy:
 *  1. fetch() → blob → createObjectURL  (avoids canvas CORS taint)
 *  2. Draw onto canvas → export as JPEG  (converts WEBP/PNG/etc → JPEG, which jsPDF supports)
 *  3. Canvas fallback with crossOrigin attribute (if fetch fails)
 */
export const loadImageForPDF = (url: string): Promise<string | null> => {
  const drawToJpeg = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  || 794;
      canvas.height = img.naturalHeight || 264;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return null;
    }
  };

  // ── Strategy 1: fetch → blob URL → canvas (no CORS taint, handles WEBP)
  return fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.blob(); })
    .then(blob => new Promise<string | null>((resolve) => {
      const objUrl = URL.createObjectURL(blob);
      const img    = new Image();
      img.onload  = () => { resolve(drawToJpeg(img)); URL.revokeObjectURL(objUrl); };
      img.onerror = () => { resolve(null);             URL.revokeObjectURL(objUrl); };
      img.src     = objUrl;
    }))
    .catch(() =>
      // ── Strategy 2: direct <img> with crossOrigin (same-origin or permissive CORS)
      new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(drawToJpeg(img));
        img.onerror = () => {
          // ── Strategy 3: no crossOrigin (last resort, canvas may be tainted)
          const fb = new Image();
          fb.onload  = () => resolve(drawToJpeg(fb));
          fb.onerror = () => resolve(null);
          fb.src = url;
        };
        img.src = url;
      })
    );
};

/**
 * Renders layout elements (text + image) onto a jsPDF document for one ticket slot.
 *
 * Stub-zone elements (xMM < STUB_BOUNDARY_MM) use splitTextToSize for line-wrapping
 * so text never crosses the canhoto divider.
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
        try { doc.addImage(imgData, 'JPEG', xMM, yMM, wMM, hMM); } catch { /* skip */ }
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

      const xMM = el.x * scale;
      const yMM = currentY + el.y * scale + fontSize * 0.35;

      const isStub = xMM < STUB_BOUNDARY_MM;
      const maxW   = isStub
        ? STUB_BOUNDARY_MM - xMM - 1.5
        : 210 - xMM - 2;

      if (isStub) {
        const lineHeightMM = fontSize * 0.352778 * 1.25;
        const lines: string[] = doc.splitTextToSize(text, maxW);
        lines.forEach((line: string, i: number) => {
          doc.text(line, xMM, yMM + i * lineHeightMM);
        });
      } else {
        doc.text(text, xMM, yMM);
      }
    }
  }
};
