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
  userRole = 'technicien'
}: MobileBottomNavProps) {

  // Mémoriser les items pour éviter de recalculer à chaque render
  const visibleNavItems = React.useMemo(() => {
    const role = userRole.toLowerCase();

    // TECHNICIEN: Articles (lecture seule) et Scanner
    if (role === 'technicien') {
      return [
        {
          id: 'articles' as ViewMode,
          icon: Package,
          label: 'Equipements'
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
          label: 'Equipements'
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
          label: 'Pilotage'
        },
        {
          id: 'articles' as ViewMode,
          icon: Package,
          label: 'Equipements'
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

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-slide-up">
      <nav className="glass bg-white/95 dark:bg-gray-950/95 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-800/50 flex items-center justify-around p-2 gap-1 backdrop-blur-2xl">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-300 relative ${active
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${active ? 'bg-blue-600/10 scale-110' : ''}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold mt-1">
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full blur-[1px]"></div>
              )}
            </button>
          );
        })}
      </nav>
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
}
