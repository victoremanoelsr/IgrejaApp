import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, CheckCircle, X } from 'lucide-react';

export type ToastType = 'offline' | 'syncing' | 'synced' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (type === 'syncing') return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, type, onClose]);

  const iconMap: Record<ToastType, React.ReactNode> = {
    offline: <WifiOff size={18} className="shrink-0" />,
    syncing: <Wifi size={18} className="shrink-0 animate-pulse" />,
    synced: <CheckCircle size={18} className="shrink-0" />,
    info: <CheckCircle size={18} className="shrink-0" />,
  };

  const colorMap: Record<ToastType, string> = {
    offline: 'bg-orange-600',
    syncing: 'bg-blue-600',
    synced: 'bg-green-600',
    info: 'bg-gray-700',
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium max-w-xs w-full transition-all duration-300 ${colorMap[type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      {iconMap[type]}
      <span className="flex-1">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="ml-1 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
};

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => (
  <div className="fixed bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-[9999] pointer-events-none">
    {toasts.map((t, i) => (
      <div key={t.id} className="pointer-events-auto" style={{ transform: `translateY(${-i * 4}px)` }}>
        <Toast message={t.message} type={t.type} onClose={() => onRemove(t.id)} duration={t.duration} />
      </div>
    ))}
  </div>
);
