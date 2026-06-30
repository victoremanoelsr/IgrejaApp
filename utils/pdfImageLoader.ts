import { supabase } from '../services/supabaseClient';

const STUB_BOUNDARY_MM = 210 * 0.25; // 52.5 mm

// ── Supabase storage download (primary — same client used by entire app) ─────

/**
 * Parses a Supabase public storage URL and downloads the raw Blob via the SDK.
 * This is the most reliable approach: no CORS issues, no canvas taint.
 * URL format: https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/PATH
 */
const downloadViaSupabase = async (url: string): Promise<Blob | null> => {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/?#]+)\/(.+?)(?:\?.*)?$/);
  if (!match) return null;
  const bucket = match[1];
  const path   = decodeURIComponent(match[2]);
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) { console.error('[PDF] supabase.download error:', error?.message); return null; }
  return data; // Blob
};

// ── canvas helper ─────────────────────────────────────────────────────────────

/** Loads a Blob into an <img> via a same-origin blob URL, then draws on canvas → JPEG. */
const blobToJpeg = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const objUrl = URL.createObjectURL(blob);
    const img    = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      try {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth  || 794;
        c.height = img.naturalHeight || 264;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.92));
      } catch (e) {
        console.error('[PDF] canvas error:', e);
        resolve(null);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(null); };
    img.src = objUrl;
  });

// ── ArrayBuffer helpers (for direct JPEG/PNG, no canvas needed) ───────────────

const bufToBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
};

const detectMime = (buf: ArrayBuffer): 'image/jpeg' | 'image/png' | 'image/webp' | 'other' => {
  const b = new Uint8Array(buf, 0, 12);
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF)               return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
  return 'other';
};

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Loads a Supabase storage image and returns a base64 data-URL for jsPDF.
 *
 * Strategy:
 *  1. Supabase SDK  → Blob → blobToJpeg  (most reliable, zero CORS issues)
 *  2. fetch + ArrayBuffer → base64 directly for JPEG/PNG, canvas for WEBP
 *  3. crossOrigin <img> → canvas → JPEG
 */
export const loadImageForPDF = async (url: string): Promise<string | null> => {
  // ── 1. Supabase SDK download (same path as all other storage operations)
  const blob = await downloadViaSupabase(url);
  if (blob) {
    // For JPEG/PNG use fast ArrayBuffer→base64 (no canvas);
    // for WEBP/other use canvas via blob URL (same-origin → no taint)
    const buf  = await blob.arrayBuffer();
    const mime = detectMime(buf);
    if (mime === 'image/jpeg' || mime === 'image/png') {
      return `data:${mime};base64,${bufToBase64(buf)}`;
    }
    const jpeg = await blobToJpeg(blob);
    if (jpeg) return jpeg;
  }

  // ── 2. Direct fetch fallback
  try {
    const r = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (r.ok) {
      const buf  = await r.arrayBuffer();
      const mime = detectMime(buf);
      if (mime === 'image/jpeg' || mime === 'image/png') {
        return `data:${mime};base64,${bufToBase64(buf)}`;
      }
      const jpeg = await blobToJpeg(new Blob([buf]));
      if (jpeg) return jpeg;
    }
  } catch { /* fall through */ }

  // ── 3. crossOrigin img → canvas → JPEG
  return new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width  = img.naturalWidth  || 794;
        c.height = img.naturalHeight || 264;
        const ctx = c.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.92));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

// ── addImageToPdf helper ──────────────────────────────────────────────────────

/** Adds a data-URL image to a jsPDF doc, auto-detecting PNG vs JPEG. */
export const addImageToPdf = (
  doc: any,
  dataUrl: string,
  x: number, y: number, w: number, h: number
) => {
  const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  try { doc.addImage(dataUrl, fmt, x, y, w, h); }
  catch (e) { console.error('[PDF] addImage failed:', e); }
};

// ── renderElementsToPDF ───────────────────────────────────────────────────────

/**
 * Renders all layout elements for one ticket slot onto the jsPDF document.
 * Images loaded via loadImageForPDF (Supabase SDK path — no CORS issues).
 * Stub-zone text (x < 52.5 mm) wraps with splitTextToSize.
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
        addImageToPdf(doc, imgData,
          el.x * scale,
          currentY + el.y * scale,
          (el.width  || 50) * scale,
          (el.height || 50) * scale
        );
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

      const isStub      = xMM < STUB_BOUNDARY_MM;
      const isRightAlign = el.style?.textAlign === 'right';

      if (isStub && isRightAlign) {
        // Elemento com alinhamento à direita no canhoto (ex: número da parcela).
        // Ancora o texto à direita da área do canhoto, sem splitTextToSize,
        // garantindo que nunca colida com a linha pontilhada de corte.
        doc.text(text, STUB_BOUNDARY_MM - 2, yMM, { align: 'right' });
      } else if (isStub) {
        // Elementos comuns do canhoto (nome, valor, mês): usa quebra de linha
        // para não ultrapassar a linha de corte.
        const maxW = STUB_BOUNDARY_MM - xMM - 1.5;
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
