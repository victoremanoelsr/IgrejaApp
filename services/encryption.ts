
/**
 * Chave Mestra do Sistema (Idealmente viria de uma variável de ambiente)
 * Em um app real, essa chave deve ser protegida e nunca exposta.
 */
const MASTER_KEY_STR = "igreja-app-secure-master-key-2025";

/**
 * Gera uma chave criptográfica a partir da string mestre
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(MASTER_KEY_STR);
  const hash = await crypto.subtle.digest('SHA-256', keyData);
  return await crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa um dado (ex: CPF) usando AES-GCM 256 bits
 * Retorna uma string no formato: iv_base64.data_base64
 */
export async function encryptData(text: string): Promise<string> {
  if (!text) return '';
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const dataBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    
    return `ENCv1:${ivBase64}.${dataBase64}`;
  } catch (e) {
    console.error("Erro na criptografia:", e);
    return text; // Fallback para o original em caso de erro crítico
  }
}

/**
 * Descriptografa um dado criptografado pelo método acima
 */
export async function decryptData(encryptedText: string): Promise<string> {
  if (!encryptedText || !encryptedText.startsWith('ENCv1:')) return encryptedText;
  
  try {
    const key = await getEncryptionKey();
    const [ivPart, dataPart] = encryptedText.replace('ENCv1:', '').split('.');
    
    const iv = new Uint8Array(atob(ivPart).split('').map(c => c.charCodeAt(0)));
    const data = new Uint8Array(atob(dataPart).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Erro na descriptografia:", e);
    return "ERRO_DECRIPT"; 
  }
}

/**
 * Gera um hash SHA-256 a partir de uma string (senha).
 * Irreversível.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Ofusca dados sensíveis para exibição em listas
 */
export function maskSensitiveData(value: string, type: 'CPF' | 'CNPJ'): string {
  if (!value) return '';
  if (value.includes('ENCv1')) return '***.***.***-**'; // Se ainda estiver criptografado na UI
  
  if (type === 'CPF') {
    return value.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '***.$2.$3-**');
  }
  return value.replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/, '$1.***.***/$4-**');
}
