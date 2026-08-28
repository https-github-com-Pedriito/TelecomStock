'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Trash2, PlusCircle, Info } from 'lucide-react';
import { getStockLevel } from '@/lib/stock';

interface NotificationProps {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Notification({ id, type, title, message, duration = 5000, onClose }: NotificationProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        handleClose();
      }
    }, 10);

    return () => clearInterval(interval);
  }, [id, duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 400); // Match animation duration
  };

  const getStyles = () => {
    switch (type) {
      case 'creation':
        return {
          icon: <PlusCircle className="w-6 h-6 text-emerald-500" />,
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          progress: 'bg-emerald-500',
          shadow: 'shadow-emerald-500/10'
        };
      case 'deletion':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-500" />,
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          progress: 'bg-rose-500',
          shadow: 'shadow-rose-500/10'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-green-500" />,
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          progress: 'bg-green-500',
          shadow: 'shadow-green-500/10'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          progress: 'bg-amber-500',
          shadow: 'shadow-amber-500/10'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-6 h-6 text-red-500" />,
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          progress: 'bg-red-500',
          shadow: 'shadow-red-500/10'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-blue-500" />,
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20',
          progress: 'bg-blue-500',
          shadow: 'shadow-blue-500/10'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        fixed z-[10000] right-4 md:right-8 transition-all duration-500 transform rounded-[1.25rem] ${styles.shadow}
        ${isLeaving ? 'opacity-0 translate-x-12 scale-90' : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'}
      `}
      style={{ top: '2rem' }}
    >
      <div
        className={`relative glass overflow-hidden rounded-[1.25rem] border ${styles.border} ${styles.bg} p-4 flex items-start gap-4 backdrop-blur-xl group`}
        style={{ width: '380px', maxWidth: 'calc(100vw - 2rem)' }}
      >
        <div className="flex-shrink-0 p-2 bg-white/20 dark:bg-gray-900/20 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
          {styles.icon}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-1">
            {title}
          </p>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 line-clamp-2">
            {message}
          </p>
        </div>

        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1.5 hover:bg-white/30 dark:hover:bg-black/30 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-all active:scale-90"
        >
          <X size={16} strokeWidth={3} />
        </button>

        {/* Dynamic Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ease-linear ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationProps = {
      ...notification,
      id,
      onClose: removeNotification,
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const showStockNotification = (articleNom: string, nouvelleQuantite: number, type: 'ENTREE' | 'SORTIE', seuilMinimum?: number) => {
    const niveau = getStockLevel(nouvelleQuantite, seuilMinimum ?? 0);
    const isRupture = niveau === 'rupture';
    const isCritique = niveau === 'critique';

    addNotification({
      type: isRupture ? 'error' : isCritique ? 'warning' : 'success',
      title: `${type === 'ENTREE' ? 'Entrée' : 'Sortie'} confirmée`,
      message: `${articleNom}: ${nouvelleQuantite} unités actuellement en stock.${
        isRupture ? ' Rupture de stock !' : isCritique ? ' Attention: niveau critique !' : ''
      }`,
      duration: isRupture || isCritique ? 8000 : 4000,
    });
  };

  const NotificationContainer = () => (
    <div className="fixed top-0 right-0 z-[10000] p-4 flex flex-col items-end pointer-events-none">
      {notifications.map((notification, index) => (
        <div key={notification.id} className="pointer-events-auto" style={{ top: `${index * 90}px` }}>
          <Notification {...notification} />
        </div>
      ))}
    </div>
  );

  return {
    notifications,
    addNotification,
    removeNotification,
    showStockNotification,
    NotificationContainer,
  };
}
