const STUB_BOUNDARY_MM = 210 * 0.25; // 52.5 mm

// ── helpers ─────────────────────────────────────────────────────────────────

/** Convert ArrayBuffer to base64 string (no canvas, no CORS issues). */
const bufToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
};

/** Detect image MIME type from the first 4 magic bytes. */
const detectMime = (buf: ArrayBuffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'unknown' => {
  const b = new Uint8Array(buf, 0, 12);
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  return 'unknown';
};

/** Draw an <img> on a canvas and return JPEG data URL.
 *  img MUST have been loaded from a same-origin blob URL to avoid taint. */
const imgToJpeg = (img: HTMLImageElement): string | null => {
  try {
    const c = document.createElement('canvas');
    c.width  = img.naturalWidth  || 794;
    c.height = img.naturalHeight || 264;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // white bg so transparency renders cleanly
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    console.error('[PDF] canvas error:', e);
    return null;
  }
};

// ── main export ──────────────────────────────────────────────────────────────

/**
 * Fetches a remote image and returns a data-URL that jsPDF can consume.
 *
 * • JPEG / PNG → base64 directly from the raw bytes (no canvas, no CORS taint risk)
 * • WEBP / other → blob URL → canvas → JPEG  (blob URL is same-origin → safe)
 * • Fallback → crossOrigin <img> → canvas → JPEG
 *
 * Always returns either a JPEG or PNG data-URL, or null on total failure.
 */
export const loadImageForPDF = (url: string): Promise<string | null> =>
  fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
    .then(buf => {
      const mime = detectMime(buf);

      // ── JPEG / PNG: convert raw bytes → base64 (no canvas needed!)
      if (mime === 'image/jpeg' || mime === 'image/png') {
        const b64     = bufToBase64(buf);
        const dataUrl = `data:${mime};base64,${b64}`;
        return dataUrl;
      }

      // ── WEBP / other: use blob URL + canvas to convert to JPEG
      return new Promise<string | null>((resolve) => {
        const blob   = new Blob([buf]);
        const objUrl = URL.createObjectURL(blob);
        const img    = new Image();
        img.onload  = () => { resolve(imgToJpeg(img)); URL.revokeObjectURL(objUrl); };
        img.onerror = () => { resolve(null);            URL.revokeObjectURL(objUrl); };
        img.src     = objUrl;
      });
    })
    .catch(() =>
      // ── Fallback: crossOrigin img → canvas (Supabase public buckets allow *)
      new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(imgToJpeg(img));
        img.onerror = () => resolve(null);
        img.src     = url;
      })
    );

// ── addImageToPdf ────────────────────────────────────────────────────────────

/** Wrapper around doc.addImage that auto-detects JPEG vs PNG from the data URL. */
export const addImageToPdf = (
  doc: any,
  dataUrl: string,
  x: number, y: number, w: number, h: number
) => {
  const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  try { doc.addImage(dataUrl, fmt, x, y, w, h); }
  catch (e) { console.error('[PDF] addImage failed:', e); }
};

// ── renderElementsToPDF ──────────────────────────────────────────────────────

/**
 * Renders layout elements (text + image) for one ticket slot onto a jsPDF document.
 * Stub-zone text (xMM < 52.5 mm) wraps with splitTextToSize.
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
        const xMM = el.x * scale;
        const yMM = currentY + el.y * scale;
        const wMM = (el.width  || 50) * scale;
        const hMM = (el.height || 50) * scale;
        addImageToPdf(doc, imgData, xMM, yMM, wMM, hMM);
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
      const maxW   = isStub ? STUB_BOUNDARY_MM - xMM - 1.5 : 210 - xMM - 2;

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
