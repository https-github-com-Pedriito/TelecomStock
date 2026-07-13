'use client';

import React, { useState } from 'react';
import { ViewMode } from '@/types';
import {
  LayoutDashboard,
  Package,
  ArrowUpDown,
  ScanLine,
  AlertTriangle,
  LogOut,
  Truck,
  FileText,
  Building2,
  Users
} from 'lucide-react';
import { UserProfileModal } from '@/components/UserProfileModal';

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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
      {/* Glassy Header */}
      <header className="sticky top-0 z-40 w-full glass shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => onViewChange('dashboard')}>
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <img
                src="/decimalestock.png"
                alt="Logo Telecom Stock"
                className="relative w-12 h-12 object-contain rounded-2xl bg-white p-1.5 shadow-md border border-gray-100 dark:border-gray-800"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Telecom Stock</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold tracking-widest border border-purple-500/20">
                  BETA
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-widest hidden min-[400px]:block">
                Gestion de stock
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alertsCount > 0 && hasPermission('view_dashboard') && (
              <button
                onClick={() => onViewChange('dashboard')}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-semibold border border-orange-100 dark:border-orange-800/50 hover:bg-orange-100 transition-colors"
              >
                <AlertTriangle size={16} />
                <span>{alertsCount} alertes</span>
              </button>
            )}

            <div className="h-10 w-[1px] bg-gray-200 dark:bg-gray-800 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-xl hover:bg-white dark:hover:bg-blue-900/20 transition-all active:scale-95"
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
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-3 p-1 rounded-2xl hover:bg-white dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-blue-500/25 transition-all">
                  {currentUser.prenom?.[0]?.toUpperCase()}{currentUser.nom?.[0]?.toUpperCase()}
                </div>
                <div className="hidden min-[1100px]:flex flex-col items-start pr-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">
                    {currentUser.prenom} {currentUser.nom}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-2.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 rounded-xl hover:bg-white dark:hover:bg-blue-900/20 transition-all active:scale-95"
                title="Se déconnecter"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-[#f8fafc] dark:bg-[#0f172a] border-b border-gray-200 dark:border-gray-800/60 sticky top-20 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 min-h-14 overflow-x-auto no-scrollbar scroll-smooth py-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;

              if (item.mobileOnly) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all sm:hidden whitespace-nowrap active:scale-95 ${active
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-blue-900/20'
                      }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-blue-900/20'
                    }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="container mx-auto px-4 py-8 overflow-x-hidden max-w-[1600px] animate-fade-in">
        {children}
      </main>

      {/* Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onChangePassword={onChangePassword}
      />
    </div>
  );
}