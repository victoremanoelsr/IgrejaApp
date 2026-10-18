import { supabase } from './supabaseClient';
import { Church, User, Event } from '../types';

// VAPID Public Key padrão (URL-Safe Base64) para Web Push PWA
const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Toca um sinal sonoro cristalino nativo via Web Audio API (som agradável de notificação de smartphone)
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Primeiro tom suave (880Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Segundo tom harmônico (1318.5Hz - E6) estilo WhatsApp / iOS
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    // Silently continue if audio context is blocked
  }
};

/**
 * Solicita permissão para notificações e registra a Push Subscription no dispositivo
 */
export const requestAndRegisterPush = async (params: {
  churchId: string;
  congregationId?: string;
  userId?: string;
  memberId?: string;
  role?: string;
}): Promise<boolean> => {
  if (!('Notification' in window)) {
    alert('Seu navegador atual não suporta notificações Push. Se estiver no iPhone, adicione o aplicativo à "Tela de Início" pelo Safari.');
    return false;
  }

  try {
    if (Notification.permission === 'denied') {
      alert('⚠️ As notificações estão bloqueadas no seu navegador!\n\nPara ativar no celular/computador:\n1. Toque no ícone de cadeado 🔒 ou configurações ao lado do endereço do site.\n2. Procure por "Notificações" ou "Permissões".\n3. Mude para "Permitir" e recarregue a página.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permissão negada ou fechada pelo usuário.');
      return false;
    }

    // Registra e assina no ServiceWorker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          try {
            const appServerKey = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: appServerKey,
            });
          } catch (subErr) {
            console.warn('[Push] Falha ao assinar pushManager (continuando com notificação local):', subErr);
          }
        }

        // Se obteve inscrição push, salva no Supabase
        if (subscription) {
          const p256dh = subscription.getKey('p256dh');
          const auth = subscription.getKey('auth');

          const p256dhBase64 = p256dh ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))) : '';
          const authBase64 = auth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))) : '';

          await supabase.from('push_subscriptions').upsert(
            {
              endpoint: subscription.endpoint,
              church_id: params.churchId,
              congregation_id: params.congregationId || null,
              user_id: params.userId || null,
              member_id: params.memberId || null,
              role: params.role || null,
              p256dh: p256dhBase64,
              auth: authBase64,
              device_type: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              user_agent: navigator.userAgent,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );
        }
      } catch (swErr) {
        console.warn('[Push] Erro no serviceWorker push:', swErr);
      }
    }

    localStorage.setItem(`ig_push_enabled_${params.churchId}`, 'true');

    // Confirmação sonora e visual imediata no aparelho do usuário
    playNotificationChime();
    setTimeout(() => {
      showFloatingNotification('🔔 Notificações Ativadas!', {
        body: 'Este aparelho agora receberá alertas instantâneos de eventos e comunicados da igreja!',
        url: '/#events',
      });
    }, 400);

    return true;
  } catch (err) {
    console.error('[Push] Erro ao registrar inscrição de push:', err);
    return false;
  }
};

/**
 * Exibe notificação flutuante nativa no celular ou computador
 * Usa ServiceWorkerRegistration.showNotification que funciona mesmo no Android e iOS Safari PWA
 */
export const showFloatingNotification = async (
  title: string,
  options: {
    body: string;
    url?: string;
    eventId?: string;
    tag?: string;
    imageUrl?: string;
    requireInteraction?: boolean;
  }
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  playNotificationChime();

  const notifOptions: any = {
    body: options.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    image: options.imageUrl,
    vibrate: [200, 100, 200, 100, 200],
    tag: options.tag || `igrejaapp-${Date.now()}`,
    renotify: true,
    requireInteraction: options.requireInteraction ?? true,
    data: {
      url: options.url || '/',
      eventId: options.eventId,
      timestamp: Date.now(),
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notifOptions);
        return;
      }
    }
    // Fallback para desktop browser se registration não estiver pronto
    new Notification(title, notifOptions);
  } catch (e) {
    console.warn('[Push] Falha ao exibir showNotification:', e);
  }
};

/**
 * Dispara notificação push para os membros da igreja e congregação selecionada sobre um novo evento ou reunião
 */
export const dispatchEventPushNotification = async (
  event: Event,
  churchName: string,
  targetAudienceLabel: string
) => {
  const eventDateFormatted = new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  const title = `📅 ${event.name} — ${churchName}`;
  const locationText = event.location ? `\n📍 Local: ${event.location}` : '';
  const descText = event.description ? `\n📝 ${event.description}` : '';
  const body = `Dia ${eventDateFormatted} às ${event.time}${locationText}${descText}\n👉 Toque para abrir no IgrejaApp.`;
  const url = `/#events?id=${event.id}`;

  try {
    // 1. Salva notificação no banco Supabase para que todos os membros e celulares conectados recebam via Realtime e histórico
    await supabase.from('church_notifications').insert([
      {
        church_id: event.churchId,
        congregation_id: event.congregationId || (event.targetAudience !== 'TODAS' && event.targetAudience !== 'SEDE' ? event.targetAudience : null),
        title,
        body,
        type: 'EVENT',
        target_role: 'ALL',
        data: {
          eventId: event.id,
          url,
          targetAudienceLabel,
          eventName: event.name,
          date: event.date,
          time: event.time,
        },
      },
    ]);

    // 2. Dispara notificação flutuante local imediata
    await showFloatingNotification(title, {
      body,
      url,
      eventId: event.id,
      imageUrl: event.imageUrl,
      tag: `event-${event.id}`,
    });
  } catch (err) {
    console.warn('[Push] Erro ao gravar notificação de evento:', err);
    // Mesmo se falhar o banco, dispara localmente
    await showFloatingNotification(title, {
      body,
      url,
      eventId: event.id,
      imageUrl: event.imageUrl,
      tag: `event-${event.id}`,
    });
  }
};

/**
 * Notificação exclusiva para o Pastor Presidente:
 * Verifica a data de vencimento da mensalidade do sistema da igreja e dispara
 * notificação flutuante quando faltar 5 dias ou no dia do vencimento.
 */
export const checkAndNotifyPresidentPlanDue = async (
  church: Church,
  user: User
) => {
  // Regra de segurança estrita: apenas para o Pastor Presidente da igreja SEDE pagante
  const isPresident = user.role === 'PRESIDENTE' || (user.roles && user.roles.includes('PRESIDENTE'));
  if (!isPresident) return;
  if (church.type !== 'SEDE') return;
  if (!church.planType || church.planType === 'isento') return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const dueDay = church.dueDay ?? 10;
  const cycle = church.planType;
  const monthsMap: Record<string, number> = {
    mensal: 1,
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
  };
  const months = monthsMap[cycle] ?? 1;

  // Calcula a data do vencimento do ciclo atual
  let nextDue: Date;
  if (church.lastPaymentDate) {
    const lastPay = new Date(church.lastPaymentDate + 'T00:00:00');
    nextDue = new Date(lastPay.getFullYear(), lastPay.getMonth() + months, dueDay);
  } else {
    // Vencimento do mês corrente
    nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (today.getDate() > dueDay) {
      nextDue = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }
  }
  nextDue.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((nextDue.getTime() - today.getTime()) / msPerDay);
  const dueFormatted = nextDue.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // 1. Caso A: Faltam exatamente 5 dias (ou entre 1 e 5 dias) para o vencimento
  if (diffDays === 5 || (diffDays > 0 && diffDays <= 5)) {
    const storageKey = `ig_notif_due_5days_${church.id}_${nextDue.toISOString().split('T')[0]}`;
    if (!localStorage.getItem(storageKey)) {
      const title = '⚠️ Mensalidade do Sistema IgrejaApp';
      const body = `Atenção Pr. Presidente: O plano do sistema da sua igreja vence em ${diffDays} dias (${dueFormatted}). Toque para acessar as informações de pagamento via PIX e manter seu acesso em dia.`;
      const url = '/#billing';

      await showFloatingNotification(title, {
        body,
        url,
        tag: `billing-due-5-${church.id}`,
      });

      // Registra no banco de notificações para histórico e entrega push
      try {
        await supabase.from('church_notifications').insert([
          {
            church_id: church.id,
            title,
            body,
            type: 'BILLING',
            target_role: 'PRESIDENTE',
            data: { url, diffDays, nextDueDate: nextDue.toISOString().split('T')[0] },
          },
        ]);
      } catch (e) {
        console.warn('[Push] Erro ao salvar notificação de faturamento:', e);
      }

      localStorage.setItem(storageKey, todayStr);
    }
  }

  // 2. Caso B: No dia do vencimento (diffDays === 0)
  if (diffDays === 0) {
    const storageKey = `ig_notif_due_today_${church.id}_${todayStr}`;
    if (!localStorage.getItem(storageKey)) {
      const title = '🔔 Vencimento do Plano HOJE — IgrejaApp';
      const body = `Atenção Pr. Presidente: O plano do sistema da sua igreja vence HOJE (${dueFormatted}). Toque aqui para visualizar a chave PIX e manter o sistema 100% liberado.`;
      const url = '/#billing';

      await showFloatingNotification(title, {
        body,
        url,
        tag: `billing-due-today-${church.id}`,
      });

      try {
        await supabase.from('church_notifications').insert([
          {
            church_id: church.id,
            title,
            body,
            type: 'BILLING',
            target_role: 'PRESIDENTE',
            data: { url, diffDays: 0, nextDueDate: todayStr },
          },
        ]);
      } catch (e) {
        console.warn('[Push] Erro ao salvar notificação do dia de vencimento:', e);
      }

      localStorage.setItem(storageKey, todayStr);
    }
  }
};

/**
 * Dispara um teste imediato de som e notificação flutuante no aparelho atual
 * e também envia via banco para que os celulares conectados recebam via Realtime
 */
export const sendTestAlert = async (churchId?: string, churchName?: string) => {
  playNotificationChime();

  const title = `🔔 Teste de Notificação — ${churchName || 'IgrejaApp'}`;
  const body = 'Glória a Deus! Se você ouviu o toque e viu este aviso, seu celular e computador estão 100% configurados para receber as notificações da igreja.';

  // 1. Notificação flutuante no aparelho local
  await showFloatingNotification(title, {
    body,
    url: '/#events',
    tag: `test-${Date.now()}`,
  });

  // 2. Se tiver churchId, grava no banco para testar nos outros aparelhos conectados
  if (churchId) {
    try {
      await supabase.from('church_notifications').insert([
        {
          church_id: churchId,
          title,
          body,
          type: 'EVENT',
          target_role: 'ALL',
          data: { url: '/#events', isTest: true },
        },
      ]);
    } catch (e) {
      console.warn('[Push] Erro ao gravar teste de notificação:', e);
    }
  }
};
