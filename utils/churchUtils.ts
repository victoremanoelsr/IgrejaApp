import { Church } from '../types';

/**
 * Retorna o nome da igreja que deve ser exibido no painel lateral e em documentos.
 * - Para congregações: retorna o nome da congregação.
 * - Para a igreja sede: retorna o nome oficial cadastrado na janela Configurações (ou o nome original se ainda não configurado).
 */
export const getChurchDisplayName = (church?: Church | null): string => {
  if (!church) return '';
  if (church.type === 'CONGREGACAO') return church.name;
  return (church.officialName && church.officialName.trim() !== '') ? church.officialName : church.name;
};
