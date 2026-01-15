import React from 'react';
import { 
  ScanLine, 
  Package, 
  ClipboardList, 
  Users,
  Home
} from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hasPermission: (permission: string) => boolean;
  userRole?: string;
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
  userRole = 'technicien',
  alertsCount = 0,
  onQuickAction,
  className = ''
}: MobileBottomNavProps) {
  // Détection du mode dark
  const isDark = typeof window !== 'undefined' && (document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Mémoriser les items pour éviter de recalculer à chaque render
  const visibleNavItems = React.useMemo(() => {
    const role = userRole.toLowerCase();
    
    // TECHNICIEN: Articles (lecture seule) et Scanner
    if (role === 'technicien') {
      return [
        {
          id: 'articles' as ViewMode,
          icon: Package,
          label: 'Stock'
        },
        {
          id: 'scanner' as ViewMode,
          icon: ScanLine,
          label: 'Scanner',
          isQuickAction: false
        }
      ];
    }
    
    // MANAGER: Stock, Scanner, Inventaire
    if (role === 'manager') {
      return [
        {
          id: 'articles' as ViewMode,
          icon: Package,
          label: 'Stock'
        },
        {
          id: 'scanner' as ViewMode,
          icon: ScanLine,
          label: 'Scanner',
          isQuickAction: false
        },
        {
          id: 'inventory' as ViewMode,
          icon: ClipboardList,
          label: 'Inventaire'
        }
      ];
    }
    
    // ADMIN: Accueil, Stock, Scanner, Inventaire, Utilisateurs
    if (role === 'admin') {
      return [
        {
          id: 'dashboard' as ViewMode,
          icon: Home,
          label: 'Admin'
        },
        {
          id: 'articles' as ViewMode,
          icon: Package,
          label: 'Stock'
        },
        {
          id: 'scanner' as ViewMode,
          icon: ScanLine,
          label: 'Scanner',
          isQuickAction: false
        },
        {
          id: 'inventory' as ViewMode,
          icon: ClipboardList,
          label: 'Inventaire'
        },
        {
          id: 'utilisateurs' as ViewMode,
          icon: Users,
          label: 'Utilisateurs'
        }
      ];
    }
    
    // Par défaut (fallback)
    return [
      {
        id: 'scanner' as ViewMode,
        icon: ScanLine,
        label: 'Scanner'
      }
    ];
  }, [userRole]);

  // Mémoriser les callbacks pour éviter les re-renders
  const handleItemClick = React.useCallback((item: MobileNavItem) => {
    if (item.isQuickAction) {
      onQuickAction?.('scan');
    } else {
      onViewChange(item.id as ViewMode);
    }
  }, [onQuickAction, onViewChange]);

  const isActive = React.useCallback((itemId: ViewMode | 'quick-scan') => {
    if (itemId === 'quick-scan') return false;
    return currentView === itemId;
  }, [currentView]);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 shadow-lg ${className}`}>
      <div className="flex items-stretch justify-around h-16 px-2 max-w-screen-sm mx-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          const isScanner = item.id === 'scanner';
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1 rounded-lg mx-1 my-2
                transition-colors duration-150 active:scale-95 relative
                ${isScanner
                  ? active
                    ? 'bg-blue-600 text-white shadow-md dark:bg-blue-800 dark:text-white'
                    : 'bg-blue-500 text-white shadow-sm dark:bg-blue-700 dark:text-white'
                  : active 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                }
              `}
            >
              <Icon 
                size={isScanner ? 24 : 22}
                strokeWidth={isScanner ? 2.5 : 2}
                className={
                  isScanner 
                    ? 'text-white dark:text-white' 
                    : active 
                      ? 'text-blue-600 dark:text-blue-300' 
                      : 'text-gray-500 dark:text-gray-300'
                }
              />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
              {/* Indicateur actif */}
              {active && !isScanner && (
                <div className="absolute bottom-1 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area pour iPhone */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-gray-900"></div>
    </nav>
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
}
