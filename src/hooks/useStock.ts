import { useState, useCallback, useEffect } from 'react';
import { Article, Mouvement, Fournisseur, CreateMouvementData } from '../types';
import { api } from '../lib/api';
import { useAuth } from './useAuth';
import { useRealtimeSync } from './useRealtimeSync';

// Type pour le callback de notification
type StockNotificationCallback = (articleNom: string, nouvelleQuantite: number, type: 'ENTREE' | 'SORTIE', seuilMinimum?: number) => void;

export function useStock(onStockChange?: StockNotificationCallback) {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronisation temps réel (utilisé pour ses effets de bord)
  useRealtimeSync({
    onArticlesChange: async () => {
      console.log('🔄 Articles changés - rechargement...');
      try {
        const response = await api.get<Article[]>('/articles');
        setArticles(response);
      } catch (err) {
        console.error('Erreur lors du rechargement des articles:', err);
      }
    },
    onMouvementsChange: async () => {
      console.log('🔄 Mouvements changés - rechargement...');
      try {
        const response = await api.get<Mouvement[]>('/mouvements');
        setMouvements(response);
      } catch (err) {
        console.error('Erreur lors du rechargement des mouvements:', err);
      }
    },
    onFournisseursChange: async () => {
      console.log('🔄 Fournisseurs changés - rechargement...');
      try {
        const response = await api.get<Fournisseur[]>('/fournisseurs');
        setFournisseurs(response);
      } catch (err) {
        console.error('Erreur lors du rechargement des fournisseurs:', err);
      }
    }
  });

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Chargement des articles...');
        const articlesResponse = await api.get<Article[]>('/articles');
        console.log('Articles reçus:', articlesResponse);
        setArticles(articlesResponse);

        console.log('Chargement des mouvements...');
        const mouvementsResponse = await api.get<Mouvement[]>('/mouvements');
        console.log('Mouvements reçus:', mouvementsResponse);
        setMouvements(mouvementsResponse);

        console.log('Chargement des fournisseurs...');
        const fournisseursResponse = await api.get<Fournisseur[]>('/fournisseurs');
        console.log('Fournisseurs reçus:', fournisseursResponse);
        setFournisseurs(fournisseursResponse);
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Articles
  const createArticle = useCallback(async (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Création d\'un nouvel article:', article);
      const newArticle = await api.post<Article>('/articles', article);
      console.log('Article créé:', newArticle);
      setArticles(prev => [...prev, newArticle]);
      
      // Si l'article a un stock initial > 0, créer automatiquement un mouvement d'ENTRÉE
      if (article.quantite_stock && article.quantite_stock > 0) {
        console.log('Création automatique d\'un mouvement d\'ENTRÉE pour le stock initial:', article.quantite_stock);
        const mouvementData = {
          type: 'ENTREE' as const,
          quantite: article.quantite_stock,
          article_id: newArticle.id,
          utilisateur: 'Système - Stock initial',
          commentaire: `Stock initial lors de la création de l'article`
        };
        
        try {
          const mouvement = await api.post<Mouvement>('/mouvements', mouvementData);
          console.log('Mouvement d\'entrée automatique créé:', mouvement);
          setMouvements(prev => [...prev, mouvement]);
        } catch (mouvErr) {
          console.error('Erreur lors de la création du mouvement automatique:', mouvErr);
          // Ne pas faire échouer la création de l'article pour cela
        }
      }
      
      return newArticle;
    } catch (err) {
      console.error('Erreur lors de la création de l\'article:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  const updateArticle = useCallback(async (id: string, data: Partial<Article>) => {
    try {
      console.log('Mise à jour de l\'article:', id, data);
      
      // Si on modifie la quantité de stock, on doit créer un mouvement
      let ancienneQuantite = 0;
      if (data.quantite_stock !== undefined) {
        const articleActuel = articles.find(a => a.id === id);
        if (articleActuel) {
          ancienneQuantite = articleActuel.quantite_stock || 0;
        }
      }
      
      const updatedArticle = await api.put<Article>(`/articles/${id}`, data);
      console.log('Article mis à jour:', updatedArticle);
      setArticles(prev => prev.map(a => a.id === id ? updatedArticle : a));
      
      // Créer un mouvement si la quantité a changé
      if (data.quantite_stock !== undefined && data.quantite_stock !== ancienneQuantite) {
        const difference = data.quantite_stock - ancienneQuantite;
        if (difference !== 0) {
          console.log('Quantité modifiée de', ancienneQuantite, 'à', data.quantite_stock, '- différence:', difference);
          
          // Gestion robuste du nom d'utilisateur
          let utilisateurNom = 'Utilisateur inconnu';
          if (user && user.prenom && user.nom) {
            utilisateurNom = `${user.prenom.trim()} ${user.nom.trim()}`.trim();
          } else if (user && user.email) {
            utilisateurNom = user.email;
          }
          
          const mouvementData = {
            type: difference > 0 ? 'ENTREE' as const : 'SORTIE' as const,
            quantite: Math.abs(difference),
            article_id: id,
            utilisateur: utilisateurNom,
            commentaire: `Ajustement de stock: ${ancienneQuantite} → ${data.quantite_stock}`
          };
          
          try {
            const mouvement = await api.post<Mouvement>('/mouvements', mouvementData);
            console.log('Mouvement automatique créé:', mouvement);
            setMouvements(prev => [...prev, mouvement]);
          } catch (mouvErr) {
            console.error('Erreur lors de la création du mouvement automatique:', mouvErr);
            // Ne pas faire échouer la mise à jour de l'article pour cela
          }
        }
      }
      
      return updatedArticle;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'article:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, [articles, user]);

  const deleteArticle = useCallback(async (id: string, force: boolean = false) => {
    try {
      console.log('Suppression de l\'article:', id, 'force:', force);
      
      const url = force ? `/articles/${id}?force=true` : `/articles/${id}`;
      const result = await api.delete(url);
      
      console.log('Article supprimé, résultat:', result);
      setArticles(prev => prev.filter(a => a.id !== id));
      
      return result;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'article:', err);
      
      // Si c'est une erreur 409 (conflit), c'est qu'il y a des mouvements associés
      if (err.response?.status === 409) {
        // Retourner l'erreur avec les options pour permettre à l'UI de gérer
        throw {
          ...err,
          canForceDelete: true,
          data: err.response.data
        };
      }
      
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, []);

  // Mouvements
  const createMouvement = useCallback(async (mouvement: CreateMouvementData) => {
    try {
      console.log('useStock - Création d\'un nouveau mouvement:', mouvement);
      
      const newMouvement = await api.post<Mouvement>('/mouvements', mouvement);
      console.log('useStock - Mouvement créé:', newMouvement);
      setMouvements(prev => [...prev, newMouvement]);
      
      // La mise à jour de l'article est maintenant gérée par le backend
      // Rafraîchissons la liste des articles pour avoir les quantités à jour
      const articlesResponse = await api.get<Article[]>('/articles');
      setArticles(articlesResponse);

      // Trouver l'article concerné et afficher la notification
      if (onStockChange && mouvement.article_id) {
        const articleConcerne = articlesResponse.find(a => a.id === mouvement.article_id);
        if (articleConcerne) {
          onStockChange(
            articleConcerne.nom,
            articleConcerne.quantite_stock,
            mouvement.type,
            articleConcerne.seuil_minimum
          );
        }
      }

      return newMouvement;
    } catch (err) {
      console.error('useStock - Erreur lors de la création du mouvement:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      throw err;
    }
  }, [onStockChange]);

  // Fournisseurs
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

  // Fonctions de rafraîchissement
  const refreshArticles = useCallback(async () => {
    try {
      console.log('Rafraîchissement des articles...');
      const articlesResponse = await api.get<Article[]>('/articles');
      console.log('Articles rafraîchis:', articlesResponse);
      setArticles(articlesResponse);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement des articles:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  const refreshMouvements = useCallback(async () => {
    try {
      console.log('Rafraîchissement des mouvements...');
      const mouvementsResponse = await api.get<Mouvement[]>('/mouvements');
      console.log('Mouvements rafraîchis:', mouvementsResponse);
      setMouvements(mouvementsResponse);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement des mouvements:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  const refreshFournisseurs = useCallback(async () => {
    try {
      console.log('Rafraîchissement des fournisseurs...');
      const fournisseursResponse = await api.get<Fournisseur[]>('/fournisseurs');
      console.log('Fournisseurs rafraîchis:', fournisseursResponse);
      setFournisseurs(fournisseursResponse);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement des fournisseurs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshArticles(),
        refreshMouvements(),
        refreshFournisseurs()
      ]);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement complet:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshArticles, refreshMouvements, refreshFournisseurs]);

  // Synchronisation temps réel
  useRealtimeSync({
    onArticlesChange: refreshArticles,
    onMouvementsChange: refreshMouvements, 
    onFournisseursChange: refreshFournisseurs,
    debug: true
  });

  return {
    articles,
    mouvements,
    fournisseurs,
    loading,
    error,
    createArticle,
    updateArticle,
    deleteArticle,
    createMouvement,
    createFournisseur,
    updateFournisseur,
    deleteFournisseur,
    refreshArticles,
    refreshMouvements,
    refreshFournisseurs,
    refreshAll,
  };
}