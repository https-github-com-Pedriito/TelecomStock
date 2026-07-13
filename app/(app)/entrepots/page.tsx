'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Entrepots } from '@/src-pages/Entrepots';
import { api } from '@/lib/api';

export default function EntrepotsPage() {
  const { user } = useAuth();
  const { localisations, loading, error, refreshLocalisations } = useStock(user ?? null);
  if (!user) return null;
  return (
    <Entrepots
      localisations={localisations}
      loading={loading}
      error={error}
      onAddLocalisation={async (l) => { const r = await api.createLocalisation(l); await refreshLocalisations(); return r as any; }}
      onUpdateLocalisation={async (id, l) => { const r = await api.updateLocalisation(id, l); await refreshLocalisations(); return r as any; }}
      onDeleteLocalisation={async (id) => { await api.deleteLocalisation(id); await refreshLocalisations(); }}
      onRefreshLocalisations={refreshLocalisations}
    />
  );
}
