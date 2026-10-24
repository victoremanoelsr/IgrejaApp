import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Mercado Pago envia GET ou POST no webhook
  try {
    // 1. Identifica o ID do pagamento
    const paymentId = 
      req.query?.id || 
      req.query?.['data.id'] || 
      req.body?.data?.id || 
      req.body?.id;

    const topic = req.query?.topic || req.body?.type || req.body?.action;

    // Se for apenas teste ou ping do Mercado Pago
    if (!paymentId) {
      return res.status(200).json({ status: 'ignored', message: 'No paymentId provided' });
    }

    // 2. Obtem Access Token para consultar o pagamento
    let accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      try {
        const { data: sysData } = await supabase
          .from('system_settings')
          .select('mercado_pago_access_token')
          .limit(1)
          .maybeSingle();

        if (sysData?.mercado_pago_access_token) {
          accessToken = sysData.mercado_pago_access_token.trim();
        }
      } catch (_) {}
    }

    if (!accessToken) {
      console.error('[MercadoPago Webhook] MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.');
      return res.status(500).json({ error: 'Mercado Pago credentials not configured' });
    }

    // 3. Consulta o pagamento diretamente na API do Mercado Pago para validação 100% segura
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!mpRes.ok) {
      console.error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago:`, await mpRes.text());
      return res.status(200).json({ status: 'error', message: 'Failed to verify payment with MP' });
    }

    const payment = await mpRes.json();
    const status = payment.status;
    const churchId = payment.external_reference;

    console.log(`Webhook MP: Pagamento ${paymentId} - Status: ${status} - Igreja: ${churchId}`);

    // 4. Se o pagamento estiver APROVADO, valida o valor pago e dá a baixa automática no Supabase!
    if (status === 'approved' && churchId) {
      const paidAmount = Number(payment.transaction_amount || 0);

      // Valida se o valor pago é condizente com o plano da igreja
      const { data: church } = await supabase
        .from('churches')
        .select('active, last_payment_date, plan_tier')
        .eq('id', churchId)
        .maybeSingle();

      const PLAN_MIN_PRICES: Record<string, number> = {
        bronze: 70.00,
        prata: 130.00,
        ouro: 220.00,
        diamond: 350.00,
      };

      const tierKey = (church?.plan_tier || 'bronze').toLowerCase();
      const minRequired = PLAN_MIN_PRICES[tierKey] || 70.00;

      if (paidAmount < minRequired) {
        console.warn(`[Webhook MP] Pagamento ${paymentId} de R$ ${paidAmount} inferior ao valor mínimo do plano ${tierKey} (R$ ${minRequired}) para a igreja ${churchId}. Baixa bloqueada.`);
        return res.status(200).json({ status: 'rejected_low_amount', paidAmount, minRequired });
      }

      const today = new Date().toISOString().split('T')[0];

      // 4.1 Tenta chamar a RPC segura do banco (confirm_church_payment)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('confirm_church_payment', {
        p_church_id: churchId,
      });

      // 4.2 Fallback: se a RPC falhar, atualiza diretamente a tabela churches
      if (rpcErr || !rpcData?.success) {
        await supabase
          .from('churches')
          .update({
            active: true,
            last_payment_date: today,
          })
          .eq('id', churchId);
      }

      // 4.3 Registra notificação em tempo real no app para o pastor ver
      try {
        await supabase.from('church_notifications').insert({
          church_id: churchId,
          title: 'Mensalidade Confirmada com Sucesso!',
          message: `Seu pagamento via PIX (R$ ${payment.transaction_amount}) foi compensado instantaneamente pelo Mercado Pago. Seu acesso está 100% liberado!`,
          type: 'FINANCE',
        });
      } catch (_) {}

      console.log(`✅ Acesso liberado automaticamente para a igreja ${churchId}!`);
      return res.status(200).json({ status: 'success', unlocked: true, churchId });
    }

    return res.status(200).json({ status: 'received', mpStatus: status });
  } catch (err: any) {
    console.error('Erro no processamento do webhook Mercado Pago:', err);
    // Retorna 200 pro Mercado Pago não ficar repetindo infinitamente
    return res.status(200).json({ status: 'error', error: err?.message });
  }
}
