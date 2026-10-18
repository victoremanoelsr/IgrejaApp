// ====================================================================
// IgrejaApp - Service Worker Push & Background Notification Handler
// ====================================================================

// 1. Escuta notificações Push enviadas pelo servidor / Web Push mesmo com app fechado
self.addEventListener('push', function (event) {
  let data = {
    title: 'IgrejaApp',
    body: 'Você tem uma nova notificação da igreja.',
    url: '/',
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const notificationTitle = data.title || 'IgrejaApp';
  const notificationOptions = {
    body: data.body || 'Toque para abrir e ver os detalhes.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    image: data.image || data.imageUrl || undefined,
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'igrejaapp-notif',
    renotify: true,
    requireInteraction: true, // Mantém a notificação flutuante no celular até o usuário interagir
    data: {
      url: data.url || (data.eventId ? `/#events?id=${data.eventId}` : '/'),
      eventId: data.eventId,
      type: data.type,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Abrir no App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// 2. Escuta o clique na notificação flutuante no celular e abre/foca o aplicativo
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  // Procura uma janela/aba já aberta do IgrejaApp para focar
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          // Se já tem uma aba aberta, navega até o evento/faturamento e foca
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se nenhuma aba estiver aberta (app fechado), abre nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Listener para mensagens enviadas da aplicação para o Service Worker
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    self.registration.showNotification(payload.title || 'IgrejaApp', {
      body: payload.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      image: payload.imageUrl,
      vibrate: [200, 100, 200],
      tag: payload.tag || 'igrejaapp-local',
      renotify: true,
      requireInteraction: true,
      data: payload.data || { url: '/' },
    });
  }
});
