'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Article, Mouvement, Fournisseur, CreateMouvementData, User } from '@/types';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';

type StockNotificationCallback = (articleNom: string, nouvelleQuantite: number, type: 'ENTREE' | 'SORTIE', seuilMinimum?: number) => void;

// Le contexte global ne conserve qu'une fenêtre récente des mouvements (utilisée par le tableau de bord).
// L'historique complet est paginé et chargé à la demande par la page Mouvements/Historique.
const RECENT_MOUVEMENTS_WINDOW_DAYS = 30;
const RECENT_MOUVEMENTS_LIMIT = 300;

function recentMouvementsSince(): string {
  const since = new Date();
  since.setDate(since.getDate() - RECENT_MOUVEMENTS_WINDOW_DAYS);
  return since.toISOString();
}

interface StockContextValue {
  articles: Article[];
  mouvements: Mouvement[];
  fournisseurs: Fournisseur[];
  localisations: any[];
  users: User[];
  loading: boolean;
  error: string | null;
  createArticle: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => Promise<Article>;
  updateArticle: (id: string, data: Partial<Article>) => Promise<Article>;
  deleteArticle: (id: string, force?: boolean) => Promise<unknown>;
  createMouvement: (mouvement: CreateMouvementData) => Promise<Mouvement>;
  createFournisseur: (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Fournisseur>;
  updateFournisseur: (id: string, data: Partial<Fournisseur>) => Promise<Fournisseur>;
  deleteFournisseur: (id: string) => Promise<void>;
  refreshArticles: () => Promise<void>;
  refreshMouvements: () => Promise<void>;
  refreshFournisseurs: () => Promise<void>;
  refreshLocalisations: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const StockContext = createContext<StockContextValue | null>(null);

function useStockState(user: User | null, onStockChange?: StockNotificationCallback): StockContextValue {
  const [articles, setArticles] = useState<Article[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [localisations, setLocalisations] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshArticles = useCallback(async () => {
    try {
      const response = await api.get<Article[]>('/articles');
      setArticles(response);
    } catch (err) {
      console.error('Erreur lors du rechargement des articles:', err);
    }
  }, []);

  const refreshMouvements = useCallback(async () => {
    try {
      const response = await api.getMouvements({ startDate: recentMouvementsSince(), limit: RECENT_MOUVEMENTS_LIMIT });
      setMouvements(response.items);
    } catch (err) {
      console.error('Erreur lors du rechargement des mouvements:', err);
    }
  }, []);

  const refreshFournisseurs = useCallback(async () => {
    try {
      const response = await api.get<Fournisseur[]>('/fournisseurs');
      setFournisseurs(response);
    } catch (err) {
      console.error('Erreur lors du rechargement des fournisseurs:', err);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (user && user.role?.toLowerCase() === 'admin') {
      try {
        const response = await api.get<User[]>('/users');
        setUsers(response);
      } catch (err) {
        console.error('Erreur lors du rechargement des utilisateurs:', err);
      }
    }
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const [art, mouv, four, locs] = await Promise.all([
        api.get<Article[]>('/articles'),
        api.getMouvements({ startDate: recentMouvementsSince(), limit: RECENT_MOUVEMENTS_LIMIT }).catch(() => ({ items: [] })),
        api.get<Fournisseur[]>('/fournisseurs').catch(() => []),
        api.getLocalisations().catch(() => []),
      ]);
      setArticles(art);
      setMouvements(mouv.items);
      setFournisseurs(four);
      setLocalisations(locs as any[]);
      if (user.role?.toLowerCase() === 'admin') {
        const u = await api.getUsers().catch(() => []);
        setUsers(u as User[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRealtimeEvent = useCallback((event: { table: string; type: string }) => {
    if (event.table === 'articles') refreshArticles();
    else if (event.table === 'mouvements') { refreshArticles(); refreshMouvements(); }
    else if (event.table === 'fournisseurs') refreshFournisseurs();
  }, [refreshArticles, refreshMouvements, refreshFournisseurs]);

  useRealtime(handleRealtimeEvent);

  const createArticle = useCallback(async (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newArticle = await api.post<Article>('/articles', article);
      setArticles(prev => [...prev, newArticle]);
      if (article.quantite_stock && article.quantite_stock > 0) {
        try {
          const mouvement = await api.post<Mouvement>('/mouvements', {
            type: 'ENTREE', quantite: article.quantite_stock, article_id: newArticle.id,
            utilisateur: 'Système - Stock initial', commentaire: "Stock initial lors de la création de l'article",
          });
          setMouvements(prev => [...prev, mouvement]);
        } catch {}
      }
      return newArticle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const updateArticle = useCallback(async (id: string, data: Partial<Article>) => {
    try {
      let ancienneQuantite = 0;
      if (data.quantite_stock !== undefined) {
        const articleActuel = articles.find(a => a.id === id);
        if (articleActuel) ancienneQuantite = articleActuel.quantite_stock || 0;
      }
      const updatedArticle = await api.put<Article>(`/articles/${id}`, data);
      setArticles(prev => prev.map(a => a.id === id ? updatedArticle : a));
      if (data.quantite_stock !== undefined && data.quantite_stock !== ancienneQuantite) {
        const difference = data.quantite_stock - ancienneQuantite;
        if (difference !== 0) {
          let utilisateurNom = 'Utilisateur inconnu';
          if (user?.prenom && user?.nom) utilisateurNom = `${user.prenom.trim()} ${user.nom.trim()}`.trim();
          else if (user?.email) utilisateurNom = user.email;
          try {
            const mouvementType = difference > 0 ? 'ENTREE' : 'SORTIE';
            const mouvement = await api.post<Mouvement>('/mouvements', {
              type: mouvementType, quantite: Math.abs(difference),
              article_id: id, utilisateur: utilisateurNom,
              commentaire: `Ajustement de stock: ${ancienneQuantite} → ${data.quantite_stock}`,
            });
            setMouvements(prev => [...prev, mouvement]);
            if (onStockChange) {
              onStockChange(updatedArticle.nom, updatedArticle.quantite_stock, mouvementType, updatedArticle.seuil_minimum);
            }
          } catch {}
        }
      }
      return updatedArticle;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, [articles, user, onStockChange]);

  const deleteArticle = useCallback(async (id: string, force: boolean = false) => {
    try {
      const url = force ? `/articles/${id}?force=true` : `/articles/${id}`;
      const result = await api.delete(url);
      setArticles(prev => prev.filter(a => a.id !== id));
      return result;
    } catch (err: any) {
      if (err.response?.status === 409) throw { ...err, canForceDelete: true, data: err.response.data };
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const createMouvement = useCallback(async (mouvement: CreateMouvementData) => {
    try {
      const newMouvement = await api.post<Mouvement>('/mouvements', mouvement);
      setMouvements(prev => [...prev, newMouvement]);
      const articlesResponse = await api.get<Article[]>('/articles');
      setArticles(articlesResponse);
      if (onStockChange && mouvement.article_id) {
        const articleConcerne = articlesResponse.find(a => a.id === mouvement.article_id);
        if (articleConcerne) onStockChange(articleConcerne.nom, articleConcerne.quantite_stock, mouvement.type, articleConcerne.seuil_minimum);
      }
      return newMouvement;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, [onStockChange]);

  const createFournisseur = useCallback(async (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newFournisseur = await api.post<Fournisseur>('/fournisseurs', fournisseur);
      setFournisseurs(prev => [...prev, newFournisseur]);
      return newFournisseur;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const updateFournisseur = useCallback(async (id: string, data: Partial<Fournisseur>) => {
    try {
      const updatedFournisseur = await api.put<Fournisseur>(`/fournisseurs/${id}`, data);
      setFournisseurs(prev => prev.map(f => f.id === id ? updatedFournisseur : f));
      return updatedFournisseur;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const deleteFournisseur = useCallback(async (id: string) => {
    try {
      await api.delete(`/fournisseurs/${id}`);
      setFournisseurs(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshArticles(), refreshMouvements(), refreshFournisseurs(), fetchData(), refreshUsers()]);
  }, [refreshArticles, refreshMouvements, refreshFournisseurs, fetchData, refreshUsers]);

  return {
    articles, mouvements, fournisseurs, localisations, users, loading, error,
    createArticle, updateArticle, deleteArticle, createMouvement,
    createFournisseur, updateFournisseur, deleteFournisseur,
    refreshArticles, refreshMouvements, refreshFournisseurs,
    refreshLocalisations: fetchData, refreshUsers, refreshAll,
  };
}

export function StockProvider({ children, onStockChange }: { children: ReactNode; onStockChange?: StockNotificationCallback }) {
  const { user } = useAuth();
  const value = useStockState(user, onStockChange);
  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock(): StockContextValue {
  const ctx = useContext(StockContext);
  if (!ctx) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return ctx;
}
