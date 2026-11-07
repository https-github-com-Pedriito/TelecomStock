'use client';

import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useKits } from '@/hooks/useKits';
import { Kits } from '@/src-pages/Kits';
import { hasPermissionFn } from '@/lib/permissions';
import { addNotification } from '@/lib/notificationStore';
import { diffKitLignes, formatKitDiff, formatKitResume, kitDiffEstVide, summarizeKitMovement } from '@/lib/kits';
import type { Kit, KitInput, KitMouvementData } from '@/types';

export default function KitsPage() {
  const { user } = useAuth();
  const { articles, applyStockUpdate } = useStock();
  const { kits, loading, createKit, updateKit, deleteKit, moveKit } = useKits();

  if (!user) return null;

  const nomArticle = (id: string) => articles.find(a => a.id === id)?.nom ?? 'Article inconnu';

  const handleCreate = async (input: KitInput) => {
    const kit = await createKit(input);
    const composants = formatKitResume(
      input.lignes,
      new Map(articles.map(a => [a.id, a]))
    );
    addNotification({
      type: 'creation',
      title: 'Kit créé',
      message: `${input.code} — ${input.nom}${composants ? ` : ${composants}` : ''}.`,
      duration: 5000,
    });
    return kit;
  };

  const handleUpdate = async (id: string, input: Partial<KitInput>) => {
    const avant: Kit | undefined = kits.find(k => k.id === id);
    const kit = await updateKit(id, input);

    const changements: string[] = [];
    if (avant) {
      if (input.nom !== undefined && input.nom !== avant.nom) changements.push(`Nom : ${input.nom}`);
      if (input.code !== undefined && input.code !== avant.code) changements.push(`Code : ${input.code}`);
      if (input.est_actif !== undefined && input.est_actif !== avant.est_actif) {
        changements.push(input.est_actif ? 'Kit activé' : 'Kit désactivé');
      }
      if (input.lignes) {
        const diff = diffKitLignes(avant.lignes, input.lignes);
        if (!kitDiffEstVide(diff)) changements.push(formatKitDiff(diff, nomArticle));
      }
    }

    addNotification({
      type: 'success',
      title: `Kit « ${kit?.code ?? avant?.code ?? ''} » modifié`,
      message: changements.length > 0 ? `${changements.join(' · ')}.` : 'Aucun changement dans la nomenclature.',
      duration: 6000,
    });
    return kit;
  };

  const handleDelete = async (id: string) => {
    const kit = kits.find(k => k.id === id);
    try {
      await deleteKit(id);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Échec de la suppression',
        message: `Le kit ${kit?.code ?? ''} n'a pas pu être supprimé.`,
      });
      throw err;
    }
    addNotification({
      type: 'deletion',
      title: 'Kit supprimé',
      message: `${kit ? `${kit.code} — ${kit.nom}` : 'Le kit'} a été retiré. Les mouvements déjà enregistrés sont conservés.`,
      duration: 5000,
    });
  };

  const handleMove = async (data: KitMouvementData) => {
    const result = await moveKit(data);
    // Le serveur renvoie les articles et mouvements mis a jour : on les integre
    // directement (plus de rechargement complet apres chaque mouvement de kit).
    if (result) {
      applyStockUpdate(result.articles, result.mouvements);
      const { level, title, message } = summarizeKitMovement(result);
      addNotification({ type: level, title, message, duration: level === 'success' ? 5000 : 9000 });
    }
  };

  return (
    <Kits
      kits={kits}
      articles={articles}
      loading={loading}
      canManage={hasPermissionFn(user.role, 'manage_kits')}
      utilisateur={`${user.prenom} ${user.nom}`.trim() || user.email}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onMove={handleMove}
    />
  );
}
