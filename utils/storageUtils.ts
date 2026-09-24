import { supabase } from '../services/supabaseClient';

/**
 * Remove um arquivo do Supabase Storage a partir de sua URL pública.
 * Suporta URLs completas de storage ou caminhos diretos.
 */
export const deleteFileFromSupabaseStorage = async (
  fileUrl: string | undefined | null,
  defaultBucket: string = 'images'
): Promise<void> => {
  if (!fileUrl || typeof fileUrl !== 'string') return;

  // Ignora links de placeholders externos, blobs locais ou dados base64
  if (
    fileUrl.startsWith('data:') || 
    fileUrl.startsWith('blob:') || 
    fileUrl.includes('unsplash.com') || 
    fileUrl.includes('placeholder')
  ) {
    return;
  }

  try {
    let bucket = defaultBucket;
    let filePath = '';

    const publicMarker = '/storage/v1/object/public/';
    if (fileUrl.includes(publicMarker)) {
      const remainder = fileUrl.split(publicMarker)[1];
      const slashIdx = remainder.indexOf('/');
      if (slashIdx !== -1) {
        bucket = remainder.substring(0, slashIdx);
        filePath = remainder.substring(slashIdx + 1);
      } else {
        filePath = remainder;
      }
    } else {
      const bucketMarker = `/${defaultBucket}/`;
      if (fileUrl.includes(bucketMarker)) {
        filePath = fileUrl.split(bucketMarker)[1];
      }
    }

    if (filePath) {
      const cleanPath = decodeURIComponent(filePath.split('?')[0]);
      const { error } = await supabase.storage.from(bucket).remove([cleanPath]);
      if (error) {
        console.warn(`[deleteFileFromSupabaseStorage] Aviso ao remover ${cleanPath} do bucket ${bucket}:`, error.message);
      } else {
        console.log(`[deleteFileFromSupabaseStorage] Foto antiga removida com sucesso do storage: ${cleanPath}`);
      }
    }
  } catch (err) {
    console.warn('[deleteFileFromSupabaseStorage] Erro ao tentar remover imagem antiga:', err);
  }
};
