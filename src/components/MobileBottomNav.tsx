import React from 'react';
import { 
  ScanLine, 
  Package, 
  ClipboardList, 
  User,
  Home
} from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hasPermission: (permission: string) => boolean;
  alertsCount?: number;
  onQuickAction?: (action: string) => void;
  className?: string;
}

interface MobileNavItem {
  id: ViewMode | 'quick-scan';
  icon: React.ComponentType<any>;
  label: string;
  isQuickAction?: boolean;
  badge?: number;
  permission?: string;
}

export function MobileBottomNav({ 
  currentView, 
  onViewChange, 
  hasPermission,
  alertsCount = 0,
  onQuickAction,
  className = ''
}: MobileBottomNavProps) {  const navItems: MobileNavItem[] = [
    {
      id: 'dashboard',
      icon: Home,
      label: 'Accueil'
    },
    {
      id: 'articles',
      icon: Package,
      label: 'Stock'
    },
    {
      id: 'quick-scan',
      icon: ScanLine,
      label: 'Scanner',
      isQuickAction: true
    },
    {
      id: 'inventory',
      icon: ClipboardList,
      label: 'Inventaire',
      permission: 'manage_inventory'
    },
    {
      id: 'utilisateurs',
      icon: User,
      label: 'Profil',
      badge: alertsCount
    }
  ];

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const handleItemClick = (item: MobileNavItem) => {
    if (item.isQuickAction) {
      onQuickAction?.('scan');
    } else {
      onViewChange(item.id as ViewMode);
    }
  };

  const isActive = (itemId: ViewMode | 'quick-scan') => {
    if (itemId === 'quick-scan') return false; // Quick actions never "active"
    return currentView === itemId;
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          const isQuick = item.isQuickAction;
          
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-xl min-h-[60px] relative
                transition-all duration-200 transform active:scale-95
                ${isQuick 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-110' 
                  : active 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Icon 
                size={isQuick ? 26 : 22} 
                className={`mb-1 ${isQuick ? 'stroke-2' : ''}`} 
              />
              <span className={`text-xs font-medium ${isQuick ? 'text-white' : ''}`}>
                {item.label}
              </span>
              
              {/* Badge pour notifications */}
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
              
              {/* Indicateur actif */}
              {active && !isQuick && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Safe area pour iPhone */}
      <div className="h-safe-area-inset-bottom bg-white"></div>
    </div>
  );
}

// Hook pour détecter si on est en mode mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}