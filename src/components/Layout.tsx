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
  FileText
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
      label: 'Tableau de bord', 
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
      id: 'utilisateurs' as ViewMode, 
      label: 'Utilisateurs', 
      icon: Users, 
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
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">TelecomStock Pro</h1>
              {alertsCount > 0 && hasPermission('view_dashboard') && (
                <div className="flex items-center gap-2 bg-orange-500 px-3 py-1 rounded-full text-sm font-medium">
                  <AlertTriangle size={16} />
                  {alertsCount} alerte{alertsCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
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
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto">
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
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}