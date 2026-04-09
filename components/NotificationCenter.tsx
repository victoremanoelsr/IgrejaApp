import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Send, Trash2, BellOff, BellRing, CheckCheck, AlertCircle } from 'lucide-react';
import { useApp } from '../context';
import {
  requestNotificationPermission, getPermissionStatus, showBrowserNotification,
  saveNotification, getNotifications, markAllRead, clearNotifications,
  getNotificationPreference, setNotificationPreference, LocalNotification
} from '../utils/notifications';

export const NotificationCenter: React.FC = () => {
  const { user, currentChurch } = useApp();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [prefEnabled, setPrefEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const churchId = currentChurch?.id || '';
  const isAdmin = user?.role === 'SUPER_ADM' || user?.role === 'PRESIDENTE' || user?.role === 'VICE_PRESIDENTE' || user?.role === 'DIRIGENTE';

  const reload = () => {
    if (!churchId) return;
    setNotifications(getNotifications(churchId));
    setPermission(getPermissionStatus());
    if (user) setPrefEnabled(getNotificationPreference(user.id));
  };

  useEffect(() => {
    reload();
    const interval = setInterval(reload, 5000);
    return () => clearInterval(interval);
  }, [churchId, user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && churchId) markAllRead(churchId);
    reload();
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      showBrowserNotification('IgrejaApp', 'Notificações ativadas com sucesso!');
    }
  };

  const handleTogglePref = (val: boolean) => {
    if (!user) return;
    setPrefEnabled(val);
    setNotificationPreference(user.id, val);
    if (val && permission !== 'granted') handleRequestPermission();
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || !churchId) return;
    setSending(true);
    const notif = saveNotification(churchId, title.trim(), body.trim());
    if (permission === 'granted' && prefEnabled) {
      showBrowserNotification(notif.title, notif.body);
    }
    setTitle('');
    setBody('');
    reload();
    setSending(false);
  };

  const handleClear = () => {
    if (!churchId) return;
    clearNotifications(churchId);
    reload();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user || !currentChurch) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full bg-white shadow-md border border-gray-200 hover:shadow-lg transition-all text-gray-600 hover:text-orange-500"
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <div className="flex items-center gap-2">
              <BellRing size={18} />
              <span className="font-bold text-sm">Central de Notificações</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-lg"><X size={16} /></button>
          </div>

          {/* Permission Banner */}
          {permission !== 'granted' && (
            <div className="mx-3 mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-700">Notificações desativadas</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Ative para receber alertas neste dispositivo.</p>
                <button onClick={handleRequestPermission} className="mt-2 text-[10px] bg-amber-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-amber-600 transition">
                  Ativar Notificações
                </button>
              </div>
            </div>
          )}

          {/* User Preference Toggle */}
          <div className="mx-3 mt-2 flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              {prefEnabled ? <BellRing size={14} className="text-orange-500" /> : <BellOff size={14} className="text-gray-400" />}
              <span className="text-xs font-medium text-gray-700">Receber notificações</span>
            </div>
            <button
              onClick={() => handleTogglePref(!prefEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${prefEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Admin Compose */}
          {isAdmin && (
            <div className="mx-3 mt-2 bg-orange-50 border border-orange-100 rounded-xl p-3">
              <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">Enviar para Todos</p>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título da notificação..."
                className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-1.5 mb-1.5 outline-none focus:ring-2 focus:ring-orange-300 bg-white"
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Mensagem..."
                rows={2}
                className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-orange-300 bg-white resize-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim()}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
              >
                <Send size={12} /> {sending ? 'Enviando...' : 'Enviar Notificação'}
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="mx-3 mt-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Histórico</p>
              {notifications.length > 0 && (
                <button onClick={handleClear} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-medium">
                  <Trash2 size={10} /> Limpar
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-gray-300">
                  <Bell size={28} className="mb-2" />
                  <p className="text-xs">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`rounded-xl p-2.5 border ${n.read ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-100'}`}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-gray-800 leading-tight">{n.title}</p>
                      {!n.read && <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{n.body}</p>
                    <p className="text-[9px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="px-3 pb-3">
              <button onClick={() => { markAllRead(churchId); reload(); }} className="w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700 font-medium py-1.5">
                <CheckCheck size={12} /> Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
