import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const paymentId = req.query?.paymentId;
  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' });
  }

  try {
    let accessToken = 
      (req.query?.accessToken as string)?.trim() ||
      (req.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim()) ||
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

    if (!accessToken) {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('mercado_pago_access_token')
          .limit(1)
          .maybeSingle();
        accessToken = data?.mercado_pago_access_token?.trim();
      } catch (_) {}
    }

    if (!accessToken) {
      return res.status(500).json({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.' });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!mpRes.ok) {
      return res.status(mpRes.status).json({ error: 'Failed to fetch status from MP' });
    }

    const payment = await mpRes.json();
    const status = payment.status; // approved, pending, rejected, cancelled
    const churchId = payment.external_reference;
    const paidAmount = Number(payment.transaction_amount || 0);

    // Se aprovado, valida que o valor pago cobre o plano antes de liberar
    if (status === 'approved' && churchId) {
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
        console.warn(`[check-pix-status] Pagamento ${paymentId} de R$ ${paidAmount} inferior ao mínimo exigido (R$ ${minRequired}) para a igreja ${churchId}. Baixa não efetuada.`);
      } else {
        const today = new Date().toISOString().split('T')[0];
        if (!church?.active || church?.last_payment_date !== today) {
          await supabase.rpc('confirm_church_payment', { p_church_id: churchId }).catch(() => {});
          await supabase.from('churches').update({ active: true, last_payment_date: today }).eq('id', churchId).catch(() => {});
        }
      }
    }

    return res.status(200).json({
      status,
      statusDetail: payment.status_detail,
      amount: paidAmount,
      churchId,
      isApproved: status === 'approved',
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message });
  }
}
