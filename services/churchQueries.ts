
import { supabase } from './supabaseClient';
import { Member, Church } from '../types';

// Utilitário para mapear snake_case (banco) para camelCase (app)
// Isso é necessário porque o banco usa church_id e o app usa churchId
const mapMemberFromDB = (data: any): Member => ({
  ...data,
  churchId: data.church_id,
  memberNumber: data.member_number,
  isTither: data.is_tither,
  baptismDate: data.baptism_date,
  photo: data.photo_url,
  maritalStatus: data.marital_status, // Novo mapeamento
  // Address no banco é JSONB, então já vem como objeto, mas garantimos a estrutura
  address: data.address || {}
});

const mapChurchFromDB = (data: any): Church => ({
  ...data,
  pastorName: data.pastor_name,
  parentId: data.parent_id
});

/**
 * Busca membros filtrando pela igreja.
 * A Policy RLS no banco já garante a segurança, mas o filtro aqui ajuda na performance.
 */
export const getMembersByChurch = async (churchId: string): Promise<Member[] | null> => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('church_id', churchId); // Nota: church_id (nome da coluna no banco)

    if (error) {
      console.error('Erro Supabase:', error.message);
      throw error;
    }

    return data ? data.map(mapMemberFromDB) : [];
  } catch (err) {
    console.error('Falha ao buscar membros:', err);
    return null;
  }
};

/**
 * Busca hierarquia para o Pastor Presidente.
 * Traz a Sede (pelo ID) e todas as congregações onde parent_id é a Sede.
 */
export const getChurchesForPresident = async (sedeId: string): Promise<Church[] | null> => {
  try {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .or(`id.eq.${sedeId},parent_id.eq.${sedeId}`); // Nota: parent_id (nome da coluna no banco)

    if (error) {
      console.error('Erro Supabase:', error.message);
      throw error;
    }

    return data ? data.map(mapChurchFromDB) : [];
  } catch (err) {
    console.error('Falha ao buscar igrejas:', err);
    return null;
  }
};
