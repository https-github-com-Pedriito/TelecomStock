'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Inventory } from '@/src-pages/Inventory';
import { User } from '@/types';

export default function InventairesPage() {
  const { user } = useAuth();
  const { articles, users } = useStock();
  if (!user) return null;

  const currentUser = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, created_at: user.created_at, updated_at: user.updated_at, is_active: user.is_active };
  const getByCode = (code: string) => articles.find(a => a.code_barres === code);

  return (
    <Inventory
      articles={articles}
      users={users}
      currentUser={currentUser as User}
      getArticleByCodeBarres={getByCode}
    />
  );
}
