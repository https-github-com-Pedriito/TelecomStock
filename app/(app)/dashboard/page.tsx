'use client';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Dashboard } from '@/src-pages/DashboardMT';

export default function DashboardPage() {
  const { user } = useAuth();
  const { articles, mouvements, refreshAll } = useStock();

  const articlesWithAlerts = articles.filter(a => a.quantite_stock <= a.seuil_minimum);
  const handleRefresh = useCallback(async () => { await refreshAll(); }, [refreshAll]);

  if (!user) return null;
  return (
    <Dashboard
      articles={articles}
      mouvements={mouvements}
      articlesWithAlerts={articlesWithAlerts}
      onRefreshData={handleRefresh}
    />
  );
}
