import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X, Package } from 'lucide-react';

interface NotificationProps {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Notification({ id, type, title, message, duration = 5000, onClose }: NotificationProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Package className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div
      className={`
        fixed z-50 transition-all duration-300 transform flex justify-center w-full
        top-4 left-0
        ${isLeaving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        px-2
      `}
    >
      <div
        className={`border rounded-lg shadow-lg p-3 bg-white ${getBgColor()} flex items-start space-x-3`}
        style={{
          width: '320px',
          maxWidth: '90vw',
        }}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {message}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Hook pour gérer les notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const addNotification = (notification: Omit<NotificationProps, 'id' | 'onClose'>) => {
    const id = Date.now().toString();
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
    const isLowStock = seuilMinimum !== undefined && nouvelleQuantite <= seuilMinimum;
    
    addNotification({
      type: isLowStock ? 'warning' : 'success',
      title: `${type === 'ENTREE' ? 'Entrée' : 'Sortie'} enregistrée`,
      message: `${articleNom}: ${nouvelleQuantite} unité${nouvelleQuantite > 1 ? 's' : ''} en stock${isLowStock ? ' ⚠️ Stock faible!' : ''}`,
      duration: isLowStock ? 8000 : 5000, // Plus long si stock faible
    });
  };

  const NotificationContainer = () => (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {notifications.map(notification => (
        <Notification key={notification.id} {...notification} />
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
