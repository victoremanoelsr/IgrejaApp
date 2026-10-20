import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { churchId, amount, churchName, payerEmail } = req.body || {};

    if (!churchId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'churchId e amount valido sao obrigatorios.' });
    }

    // 1. Obtem o Access Token (prioriza env var, com fallback para system_settings no Supabase)
    let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      try {
        const { data: sysData } = await supabase
          .from('system_settings')
          .select('mercado_pago_access_token')
          .eq('id', 1)
          .maybeSingle();

        if (sysData?.mercado_pago_access_token) {
          accessToken = sysData.mercado_pago_access_token.trim();
        }
      } catch (_) {}
    }

    if (!accessToken) {
      return res.status(500).json({
        error: 'Mercado Pago nao configurado. Configure o Access Token nas Configuracoes Master do SaaS.'
      });
    }

    // 2. Determina URL do Webhook
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const webhookUrl = host ? `${proto}://${host}/api/mercadopago-webhook` : undefined;

    // 3. Monta payload para Mercado Pago /v1/payments
    const idempotencyKey = `pix_${churchId}_${Date.now()}`;
    const cleanAmount = Number(Number(amount).toFixed(2));
    const cleanName = (churchName || 'Igreja').slice(0, 30);
    const cleanEmail = (payerEmail && payerEmail.includes('@')) ? payerEmail : 'financeiro@igrejaapp.com';

    const mpPayload: any = {
      transaction_amount: cleanAmount,
      description: `Mensalidade IgrejaApp - ${cleanName}`,
      payment_method_id: 'pix',
      payer: {
        email: cleanEmail,
        first_name: cleanName,
      },
      external_reference: churchId,
    };

    if (webhookUrl && !webhookUrl.includes('localhost')) {
      mpPayload.notification_url = webhookUrl;
    }

    // 4. Chama a API oficial do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Erro Mercado Pago API:', mpData);
      return res.status(mpResponse.status).json({
        error: mpData.message || 'Erro ao gerar PIX no Mercado Pago',
        details: mpData,
      });
    }

    // 5. Extrai QR Code e Copia e Cola
    const transactionData = mpData.point_of_interaction?.transaction_data;
    const qrCode = transactionData?.qr_code || '';
    const qrCodeBase64 = transactionData?.qr_code_base64 || '';
    const ticketUrl = transactionData?.ticket_url || '';

    return res.status(200).json({
      success: true,
      paymentId: mpData.id,
      status: mpData.status,
      statusDetail: mpData.status_detail,
      amount: cleanAmount,
      churchId,
      qrCode,
      qrCodeBase64,
      ticketUrl,
      expiresAt: mpData.date_of_expiration,
    });
  } catch (error: any) {
    console.error('Erro interno em create-pix:', error);
    return res.status(500).json({ error: error?.message || 'Erro interno do servidor' });
  }
}
