'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Fournisseurs } from '@/src-pages/Fournisseurs';

export default function FournisseursPage() {
  const { user } = useAuth();
  const { fournisseurs, createFournisseur, updateFournisseur, deleteFournisseur, refreshFournisseurs } = useStock();
  if (!user) return null;
  return (
    <Fournisseurs
      fournisseurs={fournisseurs}
      onAddFournisseur={createFournisseur}
      onUpdateFournisseur={async (id, data) => { await updateFournisseur(id, data); }}
      onDeleteFournisseur={deleteFournisseur}
      onRefreshFournisseurs={refreshFournisseurs}
    />
  );
}
