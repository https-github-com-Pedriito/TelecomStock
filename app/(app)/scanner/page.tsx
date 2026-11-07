'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useKits } from '@/hooks/useKits';
import { Scanner } from '@/src-pages/Scanner';
import { normalizeKitCode, summarizeKitMovement } from '@/lib/kits';
import { addNotification } from '@/lib/notificationStore';
import { Article, CreateMouvementData, KitMouvementData } from '@/types';

export default function ScannerPage() {
  const { user } = useAuth();
  const { articles, fournisseurs, createArticle, createMouvement, applyStockUpdate } = useStock();
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
    const result = await moveKit(data);
    if (result) {
      // Un kit touche plusieurs articles : le serveur les renvoie a jour.
      applyStockUpdate(result.articles, result.mouvements);
      const { level, title, message } = summarizeKitMovement(result);
      addNotification({ type: level, title, message, duration: level === 'success' ? 5000 : 9000 });
    }
  };

  const handleAddMouvement = (m: CreateMouvementData) => {
    // La confirmation (avec le stock restant) vient du contexte ; ici on ne
    // signale que l'echec.
    createMouvement(m).catch((err: unknown) => {
      addNotification({
        type: 'error',
        title: 'Mouvement non enregistré',
        message: err instanceof Error && err.message ? err.message : "L'enregistrement a échoué, réessayez.",
      });
    });
  };

  return (
    <Scanner
      articles={articles}
      getArticleByCodeBarres={getByCode}
      getKitByCode={getKitByCode}
      onKitMouvement={handleKitMouvement}
      addNotification={addNotification}
      onAddMouvement={handleAddMouvement}
      onAddArticle={handleAddArticle}
      fournisseurs={fournisseurs}
      currentUser={{ id: user.id, nom: user.nom, prenom: user.prenom }}
    />
  );
}
