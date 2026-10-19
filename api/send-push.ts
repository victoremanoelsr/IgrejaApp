import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLU4KeaaebXAyw_YcKoM0NUpcfzIYOZWFNVehj8kC-64Rw_kvYEtw1evZb1XpipPzlHX3FrNVAtLzN1DNVn0KNY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'L1koeEixh-FK4QAQQxfKmq4Y0EZ7OrT0c6ALWZRSMCQ';
const VAPID_SUBJECT = 'mailto:suporte@igrejaapp.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    churchId,
    congregationId,
    title,
    body,
    url = '/',
    eventId,
    imageUrl,
    tag = `notif-${Date.now()}`,
  } = req.body || {};

  if (!churchId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields: churchId, title, body' });
  }

  try {
    // 1. Busca todas as assinaturas push registradas para esta igreja
    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, congregation_id')
      .eq('church_id', churchId);

    const { data: subscriptions, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('[send-push] Erro ao buscar push_subscriptions:', fetchErr);
      return res.status(500).json({ error: 'Database query error', details: fetchErr });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-push] Nenhuma inscrição encontrada para church_id=${churchId}`);
      return res.status(200).json({
        success: true,
        sentCount: 0,
        message: 'Nenhum dispositivo cadastrado para receber notificações nesta igreja.',
      });
    }

    // 2. Monta o payload padronizado que o sw-push.js escuta
    const payload = JSON.stringify({
      title,
      body,
      url,
      eventId,
      imageUrl,
      tag,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });

    let sentCount = 0;
    let failedCount = 0;
    const expiredIds: string[] = [];

    // 3. Dispara em paralelo para cada dispositivo móvel / navegador inscrito
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        // Se a notificação for para congregação específica e a assinatura for de outra congregação, pula
        if (congregationId && sub.congregation_id && sub.congregation_id !== congregationId) {
          return;
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload, {
            TTL: 60 * 60 * 24, // 24 horas no cache do FCM / APNs
            urgency: 'high',
          });
          sentCount++;
        } catch (err: any) {
          failedCount++;
          // Se o endpoint expirou ou foi revogado pelo usuário (status 404 ou 410), marca para limpeza
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredIds.push(sub.id);
          } else {
            console.warn(`[send-push] Falha ao enviar para ${sub.endpoint.slice(0, 30)}...:`, err.message);
          }
        }
      })
    );

    // 4. Limpa endpoints expirados do Supabase em background
    if (expiredIds.length > 0) {
      supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredIds)
        .then(() => console.log(`[send-push] ${expiredIds.length} inscrições expiradas limpas.`));
    }

    return res.status(200).json({
      success: true,
      totalSubscriptions: subscriptions.length,
      sentCount,
      failedCount,
    });
  } catch (err: any) {
    console.error('[send-push] Erro inesperado:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
