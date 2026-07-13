'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Scanner } from '@/src-pages/Scanner';
import { Article, CreateMouvementData } from '@/types';

export default function ScannerPage() {
  const { user } = useAuth();
  const { articles, fournisseurs, createArticle, createMouvement } = useStock(user ?? null);

  if (!user) return null;

  const getByCode = (code: string) => articles.find(a => a.code_barres === code);

  const handleAddArticle = (data: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Article => {
    void createArticle(data);
    return { id: 'temp_' + Date.now(), ...data, created_at: new Date(), updated_at: new Date() };
  };

  return (
    <Scanner
      articles={articles}
      getArticleByCodeBarres={getByCode}
      onAddMouvement={(m: CreateMouvementData) => void createMouvement(m)}
      onAddArticle={handleAddArticle}
      fournisseurs={fournisseurs}
      currentUser={{ id: user.id, nom: user.nom, prenom: user.prenom }}
    />
  );
}
