'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useStock, StockProvider } from '@/hooks/useStock';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useNotifications } from '@/components/Notification';
import { Layout } from '@/components/Layout';
import { ViewMode } from '@/types';
import { api } from '@/lib/api';
import { hasPermissionFn, getDefaultRouteForRole } from '@/lib/permissions';

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
  const { showStockNotification, NotificationContainer } = useNotifications();
  return (
    <StockProvider onStockChange={showStockNotification}>
      <AppLayoutInner NotificationContainer={NotificationContainer}>{children}</AppLayoutInner>
    </StockProvider>
  );
}

function AppLayoutInner({ children, NotificationContainer }: { children: React.ReactNode; NotificationContainer: () => React.ReactElement }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { articles } = useStock();
  const [isMounted, setIsMounted] = useState(false);
  const [subscriptionInactive, setSubscriptionInactive] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router, isMounted]);

  useEffect(() => {
    if (!isMounted || loading || !user) return;
    if (pathname === '/dashboard' && !hasPermissionFn(user.role, 'view_dashboard')) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [user, loading, isMounted, pathname, router]);

  useEffect(() => {
    const handler = () => setSubscriptionInactive(true);
    window.addEventListener('subscription-inactive', handler);
    return () => window.removeEventListener('subscription-inactive', handler);
  }, []);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { url } = await api.getBillingPortalUrl();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  };

  if (loading || !isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  if (subscriptionInactive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Abonnement inactif</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Votre abonnement Telecom Stock est inactif (paiement en attente ou résilié). Merci de régulariser votre situation pour continuer à utiliser la plateforme.
          </p>
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all mb-3"
          >
            {portalLoading ? 'Redirection...' : 'Régulariser mon abonnement'}
          </button>
          <button
            onClick={signOut}
            className="w-full h-11 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

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
      isSuperAdmin={user.role === 'SUPER_ADMIN'}
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
