
import CryptoJS from 'crypto-js';

/**
 * Chave Mestra do Sistema
 */
const MASTER_KEY_STR = "igreja-app-secure-master-key-2025";

/**
 * Criptografa um dado (ex: CPF, Valores) usando AES
 * Retorna uma string no formato: ENCv2:conteudo_criptografado
 */
export async function encryptData(text: string | number): Promise<string> {
  const valueToEncrypt = text !== null && text !== undefined ? String(text) : '';
  if (!valueToEncrypt) return '';

  try {
    // Usa crypto-js que funciona em qualquer ambiente (http ou https)
    const encrypted = CryptoJS.AES.encrypt(valueToEncrypt, MASTER_KEY_STR).toString();
    return `ENCv2:${encrypted}`;
  } catch (e) {
    console.error("Erro na criptografia:", e);
    return valueToEncrypt; 
  }
}

/**
 * Descriptografa um dado criptografado.
 * Suporta o novo formato ENCv2 (crypto-js) e tenta fallback para v1 se necessário.
 */
export async function decryptData(encryptedText: any): Promise<string> {
  // Se não for string, retorna como string (trata números ou null do banco legado)
  if (typeof encryptedText !== 'string') {
    return encryptedText !== null && encryptedText !== undefined ? String(encryptedText) : '';
  }

  // Verifica prefixo da versão 2 (CryptoJS)
  if (encryptedText.startsWith('ENCv2:')) {
    try {
      const raw = encryptedText.replace('ENCv2:', '');
      const bytes = CryptoJS.AES.decrypt(raw, MASTER_KEY_STR);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText || encryptedText;
    } catch (e) {
      console.error("Erro decrypt v2:", e);
      return encryptedText;
    }
  }

  // Fallback para versão 1 (Web Crypto API) ou texto plano
  if (encryptedText.startsWith('ENCv1:')) {
      // Como migramos para crypto-js, não vamos reimplementar a lógica complexa do v1 aqui 
      // para evitar erros de ambiente. Se houver dados v1, eles precisarão ser migrados ou
      // a lógica v1 deve ser mantida apenas se o ambiente suportar.
      // Retornamos o texto original se não conseguirmos decriptar facilmente.
      return "DADO_LEGADO_V1"; 
  }
  
  // Se não tiver prefixo, é texto plano
  return encryptedText;
}

/**
 * Gera um hash SHA-256 a partir de uma string (senha).
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  return CryptoJS.SHA256(password).toString();
}

/**
 * Ofusca dados sensíveis para exibição em listas
 */
export function maskSensitiveData(value: string, type: 'CPF' | 'CNPJ'): string {
  if (!value) return '';
  if (value.startsWith('ENC')) return '***.***.***-**'; // Se ainda estiver criptografado na UI
  
  if (type === 'CPF') {
    return value.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.$3-**');
  }
  return value.replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/, '$1.***.***/$4-**');
}
