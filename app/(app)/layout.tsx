'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useNotifications } from '@/components/Notification';
import { Layout } from '@/components/Layout';
import { ViewMode } from '@/types';
import { api } from '@/lib/api';

const hasPermissionFn = (role: string, permission: string): boolean => {
  const r = role.toLowerCase();
  if (r === 'super_admin') return true;
  switch (permission) {
    case 'view_dashboard':
    case 'manage_users':
      return r === 'admin';
    case 'edit_articles':
      return r === 'admin' || r === 'manager';
    case 'delete_articles':
      return r === 'admin';
    case 'view_articles':
      return ['admin', 'manager', 'technicien'].includes(r);
    case 'view_prices':
      return r === 'admin' || r === 'manager';
    case 'manage_articles':
      return r === 'admin' || r === 'manager';
    case 'view_mouvements':
    case 'view_historique':
    case 'view_inventory':
      return ['admin', 'manager'].includes(r);
    case 'use_scanner':
      return ['admin', 'manager', 'technicien'].includes(r);
    default:
      return false;
  }
};

const pathnameToView = (pathname: string): ViewMode => {
  const segment = pathname.split('/')[1];
  const map: Record<string, ViewMode> = {
    dashboard: 'dashboard', articles: 'articles', mouvements: 'mouvements',
    scanner: 'scanner', historique: 'historique', fournisseurs: 'fournisseurs',
    entrepots: 'entrepots', utilisateurs: 'utilisateurs', inventaires: 'inventory',
  };
  return map[segment] ?? 'dashboard';
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { articles } = useStock(user ?? null);
  const { NotificationContainer } = useNotifications();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router, isMounted]);

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  const currentUser = {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: (user.role.toLowerCase() === 'super_admin' ? 'admin' : user.role.toLowerCase()) as 'admin' | 'manager' | 'technicien',
  };

  const alertsCount = articles.filter(a => a.quantite_stock <= a.seuil_minimum).length;

  const handleViewChange = (view: ViewMode) => {
    const routeMap: Partial<Record<ViewMode, string>> = {
      dashboard: '/dashboard', articles: '/articles', mouvements: '/mouvements',
      scanner: '/scanner', historique: '/historique', fournisseurs: '/fournisseurs',
      entrepots: '/entrepots', utilisateurs: '/utilisateurs', inventory: '/inventaires',
    };
    const route = routeMap[view];
    if (route) router.push(route);
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    await api.changePassword(oldPassword, newPassword);
  };

  return (
    <Layout
      currentView={pathnameToView(pathname)}
      onViewChange={handleViewChange}
      alertsCount={alertsCount}
      currentUser={currentUser}
      onLogout={signOut}
      onChangePassword={handleChangePassword}
      hasPermission={(p) => hasPermissionFn(user.role, p)}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    >
      {children}
      <NotificationContainer />
    </Layout>
  );
}
