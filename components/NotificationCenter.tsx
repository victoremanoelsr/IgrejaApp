import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Send, Trash2, BellOff, BellRing, CheckCheck, AlertCircle, Sparkles, Smartphone } from 'lucide-react';
import { useApp } from '../context';
import { supabase } from '../services/supabaseClient';
import { requestAndRegisterPush, showFloatingNotification, sendTestAlert, playNotificationChime } from '../services/pushNotificationService';

export const NotificationCenter: React.FC = () => {
  const { user, currentChurch } = useApp();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return ('Notification' in window) ? Notification.permission : 'denied';
  });
  const [prefEnabled, setPrefEnabled] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const churchId = currentChurch?.id || '';
  const isAdmin = user?.role === 'SUPER_ADM' || user?.role === 'PRESIDENTE' || user?.role === 'VICE_PRESIDENTE' || user?.role === 'DIRIGENTE';
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const checkStandalone = () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
  };

  const getDismissedIds = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(`ig_dismissed_notifs_${churchId}`) || '[]');
    } catch {
      return [];
    }
  };

  const fetchChurchNotifications = async () => {
    if (!churchId) return;
    try {
      const { data, error } = await supabase
        .from('church_notifications')
        .select('*')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        const dismissed = getDismissedIds();
        setNotifications(data.filter(n => !dismissed.includes(n.id)));
      }
    } catch (e) {
      console.warn('[NotificationCenter] Erro ao buscar notificações:', e);
    }
  };

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      const dismissed = getDismissedIds();
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem(`ig_dismissed_notifs_${churchId}`, JSON.stringify(dismissed));
      }
    } catch (err) {
      console.warn(err);
    }

    if (isAdmin) {
      try {
        await supabase.from('church_notifications').delete().eq('id', id);
      } catch (err) {
        console.warn('[NotificationCenter] Erro ao excluir notificação:', err);
      }
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja fechar todos os avisos do histórico?')) return;
    const allIds = notifications.map(n => n.id);
    setNotifications([]);

    try {
      const dismissed = getDismissedIds();
      const updated = Array.from(new Set([...dismissed, ...allIds]));
      localStorage.setItem(`ig_dismissed_notifs_${churchId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    if (isAdmin) {
      try {
        await supabase.from('church_notifications').delete().eq('church_id', churchId);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  useEffect(() => {
    checkStandalone();
    if (churchId) {
      fetchChurchNotifications();
      const interval = setInterval(fetchChurchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [churchId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && churchId) {
      fetchChurchNotifications();
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  };

  const handleActivatePush = async () => {
    if (!currentChurch) return;
    const ok = await requestAndRegisterPush({
      churchId: currentChurch.id,
      congregationId: currentChurch.type === 'CONGREGACAO' ? currentChurch.id : undefined,
      userId: user?.id,
      role: user?.role,
    });
    if (ok) {
      setPermission('granted');
      setPrefEnabled(true);
    }
  };

  const handleTogglePref = async (val: boolean) => {
    setPrefEnabled(val);
    if (val && permission !== 'granted') {
      await handleActivatePush();
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || !churchId) return;
    setSending(true);

    try {
      const { error } = await supabase.from('church_notifications').insert([
        {
          church_id: churchId,
          title: title.trim(),
          body: body.trim(),
          type: 'ANNOUNCEMENT',
          target_role: 'ALL',
          data: { url: '/#events' },
        },
      ]);

      if (!error) {
        await showFloatingNotification(title.trim(), {
          body: body.trim(),
          url: '/#events',
          tag: `announcement-${Date.now()}`,
        });
        setTitle('');
        setBody('');
        await fetchChurchNotifications();
      }
    } catch (err) {
      console.error('[NotificationCenter] Erro ao enviar notificação:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!user || !currentChurch) return null;

  const unreadCount = Array.isArray(notifications) ? notifications.length : 0;

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

          {/* Dica essencial para iPhone (iOS) */}
          {isIOS && !isStandalone && (
            <div className="mx-3 mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-2.5">
              <Smartphone size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <p className="text-[11px] font-bold text-blue-800">Dica para iPhone:</p>
                <p className="text-[10px] text-blue-700 leading-tight mt-0.5">
                  Para receber notificações com o celular fechado, toque no botão <b>Compartilhar</b> do Safari e escolha <b>"Adicionar à Tela de Início"</b>.
                </p>
              </div>
            </div>
          )}

          {/* Permission Banner */}
          {permission !== 'granted' && (
            <div className="mx-3 mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
              <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-amber-700">Notificações desativadas</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Toque abaixo para autorizar alertas neste aparelho.</p>
                <button 
                  onClick={handleActivatePush} 
                  className="mt-1.5 text-[10px] bg-amber-500 text-white px-3 py-1 rounded-lg font-bold hover:bg-amber-600 transition shadow"
                >
                  Ativar no Aparelho
                </button>
              </div>
            </div>
          )}

          {/* User Preference Toggle & Test Button */}
          <div className="mx-3 mt-2 flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              {prefEnabled ? <BellRing size={14} className="text-orange-500" /> : <BellOff size={14} className="text-gray-400" />}
              <span className="text-xs font-medium text-gray-700">Receber notificações</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => sendTestAlert(churchId, currentChurch?.name)}
                className="text-[10px] bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold px-2 py-0.5 rounded transition"
                title="Tocar som e exibir notificação flutuante de teste"
              >
                Testar
              </button>
              <button
                onClick={() => handleTogglePref(!prefEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${prefEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
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

          {/* Notification List (da tabela church_notifications do Supabase) */}
          <div className="mx-3 mt-2 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Histórico de Avisos</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {notifications.length} {notifications.length === 1 ? 'aviso' : 'avisos'}
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-gray-400 hover:text-red-500 hover:underline transition font-medium"
                    title="Limpar todos os avisos"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 text-left">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-gray-300">
                  <Bell size={28} className="mb-2" />
                  <p className="text-xs">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="relative group rounded-xl p-2.5 border bg-orange-50/60 border-orange-100 hover:bg-orange-50 transition-colors">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="text-xs font-bold text-gray-800 leading-tight flex-1">{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                        <button
                          onClick={(e) => handleDismissNotification(n.id, e)}
                          title="Fechar notificação"
                          aria-label="Fechar notificação"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-100/60 p-0.5 rounded-md transition-all flex items-center justify-center"
                        >
                          <X size={14} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{n.body}</p>
                    <p className="text-[9px] text-gray-400 mt-1.5 font-medium">{formatTime(n.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
