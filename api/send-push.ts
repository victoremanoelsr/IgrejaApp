import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tywgekdisyxflcfjwaou.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || 'sb_publishable_2TlD4zADVSE2MzHe6RR2fQ_L8owAbq_';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMlaCT9zkAKUB5Ttj6NWZTDzOhsWkZE_CQ2FtNtxLQY0Du9WDlXJLBx0s3AP7eq-3twqEh9ekvaa60QSNnrST5A';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:suporte@igrejaapp.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn('[send-push] Falha ao inicializar VAPID:', err);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Lista de cargos reconhecidos como obreiros ou liderança
const WORKER_ROLES = new Set([
  'SUPER_ADM',
  'PRESIDENTE',
  'VICE_PRESIDENTE',
  'DIRIGENTE',
  'PASTOR',
  'EVANGELISTA',
  'PRESBITERO',
  'DIACONO',
  'DIACONISA',
  'AUXILIAR',
  'MISSIONARIO',
  'OBREIRO',
  'TESOUREIRO',
  'SECRETARIO',
  'COORDENADOR',
  'LIDER_JOVENS',
  'TESOUREIRO_JOVENS',
  'LIDER_CRIANCAS',
  'TESOUREIRO_CRIANCAS',
  'LIDER_ADOLESCENTES',
  'TESOUREIRO_ADOLESCENTES',
  'LIDER_SENHORAS',
  'TESOUREIRO_SENHORAS',
  'LIDER_SENHORES',
  'TESOUREIRO_SENHORES',
  'PRESIDENTE_MISSOES',
  'VICE_MISSOES',
  'TESOUREIRO_MISSOES',
  'SECRETARIO_MISSOES',
]);

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
    targetAudience = 'TODAS',
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

  if (!VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPID_PRIVATE_KEY não configurada nas variáveis de ambiente do servidor.' });
  }

  try {
    // 1. Busca todas as assinaturas push registradas para esta igreja
    const { data: subscriptions, error: fetchErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, congregation_id, role')
      .eq('church_id', churchId);

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
    let filteredOutCount = 0;
    let failedCount = 0;
    const expiredIds: string[] = [];

    // 3. Dispara em paralelo para cada dispositivo móvel / navegador inscrito respeitando os filtros
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subRole = (sub.role || '').toUpperCase();
        const isWorker = subRole ? WORKER_ROLES.has(subRole) && subRole !== 'MEMBRO' : false;
        const isFromSede = !sub.congregation_id || sub.congregation_id === churchId;
        const subCongId = sub.congregation_id;

        // FILTRAGEM RIGOROSA DO PÚBLICO-ALVO:
        // Caso A: TODAS (Sede + Todas as congregações)
        if (!targetAudience || targetAudience === 'TODAS') {
          // Entregue a todos
        }
        // Caso B: SEDE (Somente membros e líderes da sede)
        else if (targetAudience === 'SEDE') {
          if (!isFromSede) {
            filteredOutCount++;
            return;
          }
        }
        // Caso C: OBREIROS_TODOS (Somente obreiros gerais: Sede + Congregações)
        else if (targetAudience === 'OBREIROS_TODOS') {
          if (!isWorker) {
            filteredOutCount++;
            return;
          }
        }
        // Caso D: OBREIROS_SEDE (Somente obreiros da Sede)
        else if (targetAudience === 'OBREIROS_SEDE') {
          if (!isFromSede || !isWorker) {
            filteredOutCount++;
            return;
          }
        }
        // Caso E: OBREIROS de congregação específica (ex: OBREIROS_UUID)
        else if (targetAudience.startsWith('OBREIROS_')) {
          const targetCongId = targetAudience.replace('OBREIROS_', '');
          if (subCongId !== targetCongId || !isWorker) {
            filteredOutCount++;
            return;
          }
        }
        // Caso F: Congregação Específica (UUID da congregação)
        else {
          const targetCongId = targetAudience || congregationId;
          // Se o dispositivo não for desta congregação específica (ex: for da Sede ou de outra congregação), NÃO ENVIA!
          if (subCongId !== targetCongId) {
            filteredOutCount++;
            return;
          }
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
      filteredOutCount,
      failedCount,
      targetAudience,
    });
  } catch (err: any) {
    console.error('[send-push] Erro inesperado:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}
