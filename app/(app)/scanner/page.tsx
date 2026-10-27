'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useKits } from '@/hooks/useKits';
import { Scanner } from '@/src-pages/Scanner';
import { normalizeKitCode } from '@/lib/kits';
import { Article, CreateMouvementData, KitMouvementData } from '@/types';

export default function ScannerPage() {
  const { user } = useAuth();
  const { articles, fournisseurs, createArticle, createMouvement, refreshArticles, refreshMouvements } = useStock();
  const { kits, moveKit } = useKits();

  if (!user) return null;

  const getByCode = (code: string) => articles.find(a => a.code_barres === code);
  const getKitByCode = (code: string) => {
    const cible = normalizeKitCode(code);
    return kits.find(k => normalizeKitCode(k.code) === cible);
  };

  const handleAddArticle = (data: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Article => {
    void createArticle(data);
    return { id: 'temp_' + Date.now(), ...data, created_at: new Date(), updated_at: new Date() };
  };

  const handleKitMouvement = async (data: KitMouvementData) => {
    await moveKit(data);
    // Un kit touche plusieurs articles d'un coup : on resynchronise le stock.
    await Promise.all([refreshArticles(), refreshMouvements()]);
  };

  return (
    <Scanner
      articles={articles}
      getArticleByCodeBarres={getByCode}
      getKitByCode={getKitByCode}
      onKitMouvement={handleKitMouvement}
      onAddMouvement={(m: CreateMouvementData) => void createMouvement(m)}
      onAddArticle={handleAddArticle}
      fournisseurs={fournisseurs}
      currentUser={{ id: user.id, nom: user.nom, prenom: user.prenom }}
    />
  );
}
