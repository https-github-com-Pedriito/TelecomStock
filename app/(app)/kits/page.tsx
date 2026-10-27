'use client';

import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useKits } from '@/hooks/useKits';
import { Kits } from '@/src-pages/Kits';
import { hasPermissionFn } from '@/lib/permissions';
import type { KitMouvementData } from '@/types';

export default function KitsPage() {
  const { user } = useAuth();
  const { articles, refreshArticles, refreshMouvements } = useStock();
  const { kits, loading, createKit, updateKit, deleteKit, moveKit } = useKits();

  if (!user) return null;

  const handleMove = async (data: KitMouvementData) => {
    await moveKit(data);
    // Le mouvement d'un kit touche plusieurs articles : on resynchronise le
    // stock global plutot que de patcher chaque article localement.
    await Promise.all([refreshArticles(), refreshMouvements()]);
  };

  return (
    <Kits
      kits={kits}
      articles={articles}
      loading={loading}
      canManage={hasPermissionFn(user.role, 'manage_kits')}
      utilisateur={`${user.prenom} ${user.nom}`.trim() || user.email}
      onCreate={createKit}
      onUpdate={updateKit}
      onDelete={deleteKit}
      onMove={handleMove}
    />
  );
}
