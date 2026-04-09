export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  churchId: string;
}

const STORAGE_KEY = (churchId: string) => `ig_notifications_${churchId}`;

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
};

export const getPermissionStatus = (): NotificationPermission => {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
};

export const showBrowserNotification = (title: string, body: string): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
  } catch (e) {
    console.warn('Notification failed:', e);
  }
};

export const saveNotification = (churchId: string, title: string, body: string): LocalNotification => {
  const notif: LocalNotification = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
    churchId,
  };
  const existing = getNotifications(churchId);
  const updated = [notif, ...existing].slice(0, 50);
  localStorage.setItem(STORAGE_KEY(churchId), JSON.stringify(updated));
  return notif;
};

export const getNotifications = (churchId: string): LocalNotification[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(churchId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markAllRead = (churchId: string): void => {
  const notifs = getNotifications(churchId).map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY(churchId), JSON.stringify(notifs));
};

export const clearNotifications = (churchId: string): void => {
  localStorage.removeItem(STORAGE_KEY(churchId));
};

export const getNotificationPreference = (userId: string): boolean => {
  return localStorage.getItem(`ig_notif_pref_${userId}`) !== 'false';
};

export const setNotificationPreference = (userId: string, enabled: boolean): void => {
  localStorage.setItem(`ig_notif_pref_${userId}`, String(enabled));
};
