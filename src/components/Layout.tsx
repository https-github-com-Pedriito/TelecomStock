import React from 'react';
import { ViewMode } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpDown, 
  ScanLine, 
  History,
  AlertTriangle,
  LogOut,
  Shield,
  Truck,
  Users,
  FileText,
  Building2
} from 'lucide-react';

interface LayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  alertsCount: number;
  currentUser: {
    id: string;
    nom: string;
    email: string;
    role: 'admin' | 'manager' | 'technicien';
  };
  onLogout: () => void;
  hasPermission: (permission: string) => boolean;
  children: React.ReactNode;
}

export function Layout({ 
  currentView, 
  onViewChange, 
  alertsCount, 
  currentUser, 
  onLogout, 
  hasPermission, 
  children 
}: LayoutProps) {
  const menuItems = [
    { 
      id: 'dashboard' as ViewMode, 
      label: 'Administration', 
      icon: LayoutDashboard, 
      permission: 'view_dashboard' 
    },
    { 
      id: 'articles' as ViewMode, 
      label: 'Articles', 
      icon: Package, 
      permission: 'view_articles' 
    },
    { 
      id: 'mouvements' as ViewMode, 
      label: 'Mouvements', 
      icon: ArrowUpDown, 
      permission: 'view_mouvements' 
    },
    { 
      id: 'scanner' as ViewMode, 
      label: 'Scanner', 
      icon: ScanLine, 
      permission: 'use_scanner' 
    },
    { 
      id: 'historique' as ViewMode, 
      label: 'Historique', 
      icon: History, 
      permission: 'view_historique' 
    },
    { 
      id: 'fournisseurs' as ViewMode, 
      label: 'Fournisseurs', 
      icon: Truck, 
      permission: 'manage_users' 
    },
    { 
      id: 'entrepots' as ViewMode, 
      label: 'Entrepôts', 
      icon: Building2, 
      permission: 'manage_users' 
    },
    { 
      id: 'rapports' as ViewMode, 
      label: 'Rapports', 
      icon: FileText, 
      permission: 'manage_users' 
    },
    { 
      id: 'inventory' as ViewMode, 
      label: 'Inventaire', 
      icon: FileText, 
      permission: 'view_inventory' 
    },
  ].filter(item => hasPermission(item.permission));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'TECHNICIEN': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Bannière Beta moderne avec effet néon - Visible uniquement sur desktop */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-purple-500/30 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-blue-600/10 animate-pulse"></div>
        <div className="relative container mx-auto max-w-full py-1.5 px-4 flex items-center justify-center gap-2">
          <span className="relative inline-flex items-center justify-center">
            <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex items-center justify-center px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-xs tracking-widest text-white shadow-lg shadow-purple-500/50">
              BETA
            </span>
          </span>
          <span className="text-xs font-medium bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Version de test
          </span>
        </div>
      </div>
      
      {/* Spacer pour la bannière fixe */}
      <div className="hidden md:block h-[34px]"></div>
      
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg sticky top-[34px] md:top-[34px] z-40">
        <div className="container mx-auto px-4 py-4 max-w-full">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <img src="/decimalestock.png" alt="Logo Decimale Stock" className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-full shadow-md bg-white" />
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl font-bold truncate max-w-[30vw] sm:max-w-none">Decimale Stock</h1>
                <span className="hidden md:inline-flex relative items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-50 animate-ping"></span>
                  <span className="relative inline-flex items-center justify-center px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-xs tracking-widest text-white shadow-lg shadow-purple-500/50">
                    BETA
                  </span>
                </span>
              </div>
              {alertsCount > 0 && hasPermission('view_dashboard') && (
                <div className="hidden min-[880px]:flex items-center gap-2 bg-orange-500 px-3 py-1 rounded-full text-sm font-medium">
                  <AlertTriangle size={16} />
                  {alertsCount} alerte{alertsCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-auto">
              {/* Badge BETA visible sur mobile à côté du logout */}
              <div className="md:hidden relative inline-flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-xs tracking-widest text-white shadow-lg shadow-purple-500/50">
                  BETA
                </span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{currentUser.nom}</p>
                  <div className="flex items-center gap-2">
                    <Shield size={12} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-md border-b">
        <div className="container mx-auto px-4 max-w-full">
          <div className="flex overflow-x-auto min-w-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentView === item.id
                      ? 'text-blue-600 border-blue-600 bg-blue-50'
                      : 'text-gray-600 border-transparent hover:text-blue-600 hover:border-blue-300'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 overflow-x-hidden max-w-full">
        {children}
      </main>
    </div>
  );
}