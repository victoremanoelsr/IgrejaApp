/**
 * Gerador de Payload e QR Code PIX (Padrão BR Code / EMV-Co do Banco Central do Brasil)
 * 100% compatível com todos os aplicativos de bancos (Nubank, Inter, BB, Caixa, Itaú, Bradesco, etc.)
 */

export interface PixPayloadParams {
  pixKey: string;
  keyType?: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
  info?: string;
}

// Normaliza texto removendo acentos e caracteres especiais para padrão EMV
function cleanText(str: string, maxLen: number): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

// Formata cada campo no padrão Tag-Length-Value (TLV)
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Cálculo rigoroso de CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF, sem XOR final)
export function calculateCrc16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// Limpa e padroniza a chave de acordo com as normas do Banco Central
export function formatPixKeyForBacen(rawKey: string, keyType?: string): string {
  const key = (rawKey || '').trim();
  const digits = key.replace(/\D/g, '');

  // 1. Telefone: Bacen exige formato internacional +55 (ex: +5586999330525)
  if (keyType === 'Telefone' || (!keyType && (digits.length === 10 || digits.length === 11 || (digits.startsWith('55') && digits.length >= 12)))) {
    if (digits.startsWith('55')) {
      return `+${digits}`;
    }
    return `+55${digits}`;
  }

  // 2. CPF ou CNPJ: Bacen exige apenas dígitos numéricos
  if (keyType === 'CPF' || keyType === 'CNPJ' || digits.length === 11 || digits.length === 14) {
    if (digits.length === 11 || digits.length === 14) {
      return digits;
    }
  }

  // 3. E-mail: minúsculo e sem espaços
  if (key.includes('@')) {
    return key.toLowerCase();
  }

  // 4. Chave aleatória (EVP) ou personalizada: texto direto
  return key;
}

/**
 * Gera a string oficial do BR Code (PIX Copia e Cola)
 */
export function generatePixBrCode(params: PixPayloadParams): string {
  if (!params.pixKey) return '';

  const formattedKey = formatPixKeyForBacen(params.pixKey, params.keyType);
  const name = cleanText(params.merchantName || 'IGREJAAPP SAAS', 25) || 'IGREJAAPP';
  const city = cleanText(params.merchantCity || 'BRASIL', 15) || 'BRASIL';

  // ID 00: Payload Format Indicator
  let payload = tlv('00', '01');

  // ID 26: Merchant Account Information
  // 00 = GUI (br.gov.bcb.pix)
  // 01 = Chave PIX
  // 02 = Descrição/Info Adicional (opcional)
  let sub26 = tlv('00', 'br.gov.bcb.pix') + tlv('01', formattedKey);
  if (params.info) {
    const cleanInfo = cleanText(params.info, 40);
    if (cleanInfo) {
      sub26 += tlv('02', cleanInfo);
    }
  }
  payload += tlv('26', sub26);

  // ID 52: Merchant Category Code (0000 = Padrão)
  payload += tlv('52', '0000');

  // ID 53: Transaction Currency (986 = Real BRL)
  payload += tlv('53', '986');

  // ID 54: Transaction Amount (opcional - se tiver valor fixo)
  if (params.amount && params.amount > 0) {
    const formattedAmount = params.amount.toFixed(2);
    payload += tlv('54', formattedAmount);
  }

  // ID 58: Country Code (BR)
  payload += tlv('58', 'BR');

  // ID 59: Merchant Name (Nome do recebedor)
  payload += tlv('59', name);

  // ID 60: Merchant City (Cidade do recebedor)
  payload += tlv('60', city);

  // ID 62: Additional Data Field Template (TxID)
  // 05 = Reference Label (TxID). Se não houver, padrão Bacen aceita ***
  const txIdVal = params.txId ? cleanText(params.txId, 25) : '***';
  const sub62 = tlv('05', txIdVal || '***');
  payload += tlv('62', sub62);

  // ID 63: CRC16 Checksum
  // Começa com 6304 e calcula o CRC sobre todo o payload até o 6304
  const payloadToCrc = payload + '6304';
  const crc = calculateCrc16(payloadToCrc);

  return payloadToCrc + crc;
}

/**
 * Retorna a URL da imagem do QR Code usando o BR Code oficial
 */
export function getPixQrCodeImageUrl(brCodePayload: string, size = 300): string {
  if (!brCodePayload) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(brCodePayload)}`;
}
