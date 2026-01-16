import React, { useState } from 'react';
import { ViewMode } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  ArrowUpDown, 
  ScanLine, 
  AlertTriangle,
  LogOut,
  Shield,
  Truck,
  FileText,
  Building2,
  Settings,
  Users
} from 'lucide-react';
import { UserProfileModal } from './UserProfileModal';

interface LayoutProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  alertsCount: number;
  currentUser: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    role: 'admin' | 'manager' | 'technicien';
  };
  onLogout: () => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  children: React.ReactNode;
}

export function Layout({ 
  currentView, 
  onViewChange, 
  alertsCount, 
  currentUser, 
  onLogout,
  onChangePassword,
  hasPermission,
  isDarkMode,
  toggleDarkMode,
  children 
}: LayoutProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);

  const menuItems = [
    { 
      id: 'dashboard' as ViewMode, 
      label: 'Pilotage', 
      icon: LayoutDashboard, 
      permission: 'view_dashboard' 
    },
    { 
      id: 'articles' as ViewMode, 
      label: 'Equipements', 
      icon: Package, 
      permission: 'view_articles' 
    },
    { 
      id: 'mouvements' as ViewMode, 
      label: 'Flux de stock', 
      icon: ArrowUpDown, 
      permission: 'view_mouvements' 
    },
    { 
      id: 'scanner' as ViewMode, 
      label: 'Scanner', 
      icon: ScanLine, 
      permission: 'use_scanner',
      mobileOnly: true
    },
    // Onglet Historique supprimé
    { 
      id: 'fournisseurs' as ViewMode, 
      label: 'Fournisseurs', 
      icon: Truck, 
      permission: 'manage_users' 
    },
    { 
      id: 'entrepots' as ViewMode, 
      label: 'Dépôts', 
      icon: Building2, 
      permission: 'manage_users' 
    },
    { 
      id: 'utilisateurs' as ViewMode, 
      label: 'Utilisateurs', 
      icon: Users, 
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Bannière Beta moderne avec effet néon - Visible uniquement sur desktop */}
      <div className="hidden md:block fixed top-0 left-0 right-0 bg-black/95 dark:bg-black backdrop-blur-xl border-b border-purple-500/30 z-50">
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
      <header className="bg-blue-700 dark:bg-gray-800 text-white shadow-lg sticky top-[34px] md:top-[34px] z-40">
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
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Pastille utilisateur mobile - cliquable */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="sm:hidden flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full text-white font-bold text-sm hover:scale-105 transition-transform shadow-lg"
                  title="Mon profil"
                >
                  {currentUser.prenom?.[0]?.toUpperCase()}{currentUser.nom?.[0]?.toUpperCase()}
                </button>

                {/* Info utilisateur desktop */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{currentUser.nom}</p>
                  <div className="flex items-center gap-2">
                    <Shield size={12} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Bouton paramètres desktop */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="hidden sm:block p-2 hover:bg-blue-600 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Mon profil et paramètres"
                >
                  <Settings size={18} />
                </button>
                
                {/* Bouton mode sombre */}
                <button
                  onClick={toggleDarkMode}
                  className="p-2 hover:bg-blue-600 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
                >
                  {isDarkMode ? (
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={onLogout}
                  className="p-2 hover:bg-blue-600 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
      <nav className="bg-white dark:bg-gray-800 shadow-md border-b dark:border-gray-700">
        <div className="container mx-auto px-4 max-w-full">
          <div className="flex overflow-x-auto min-w-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              // Si mobileOnly, masquer sur sm et plus
              if (item.mobileOnly) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap sm:hidden ${
                      currentView === item.id
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-gray-700'
                        : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              }
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    currentView === item.id
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-gray-700'
                      : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500'
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

      {/* Modale profil utilisateur */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onChangePassword={onChangePassword}
      />
    </div>
  );
}