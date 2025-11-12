import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Inventaire, InventaireEntry } from '../types';

export const useInventaire = () => {
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(null);
  const [currentEntries, setCurrentEntries] = useState<InventaireEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger tous les inventaires
  const loadInventaires = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getInventaires();
      setInventaires(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des inventaires');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger l'inventaire actuel (en cours)
  const loadCurrentInventaire = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCurrentInventaire();
      setCurrentInventaire(data);
      
      // Si un inventaire est en cours, charger ses entrées
      if (data) {
        await loadCurrentEntries(data.id);
      } else {
        setCurrentEntries([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de l\'inventaire actuel');
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les entrées de l'inventaire actuel
  const loadCurrentEntries = useCallback(async (inventaireId: string) => {
    try {
      const entries = await api.getInventaireEntries(inventaireId);
      setCurrentEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des entrées');
    }
  }, []);

  // Créer un nouvel inventaire
  const createInventaire = useCallback(async (inventaireData: {
    nom: string;
    description: string;
    mois: number;
    annee: number;
  }) => {
    try {
      setLoading(true);
      const newInventaire = await api.createInventaire(inventaireData);
      setCurrentInventaire(newInventaire);
      setCurrentEntries([]);
      await loadInventaires(); // Recharger la liste
      return newInventaire;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la création de l\'inventaire';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadInventaires]);

  // Ajouter une entrée à l'inventaire actuel
  const addEntry = useCallback(async (entryData: {
    article_id: string;
    quantite_comptee: number;
    commentaire?: string;
  }) => {
    if (!currentInventaire) {
      throw new Error('Aucun inventaire actuel');
    }

    try {
      const newEntry = await api.addInventaireEntry(currentInventaire.id, entryData);
      
      // Mettre à jour les entrées locales
      setCurrentEntries(prev => {
        const existingIndex = prev.findIndex(e => 
          e.article_id === entryData.article_id && 
          e.utilisateur_id === newEntry.utilisateur_id
        );
        
        if (existingIndex >= 0) {
          // Remplacer l'entrée existante
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          return updated;
        } else {
          // Ajouter nouvelle entrée
          return [...prev, newEntry];
        }
      });

      return newEntry;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'entrée';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentInventaire]);

  // Supprimer une entrée
  const deleteEntry = useCallback(async (entryId: string) => {
    if (!currentInventaire) {
      throw new Error('Aucun inventaire actuel');
    }

    try {
      // Appel à l'API backend : DELETE /inventaires/:id/entries/:entryId
      await api.deleteInventaireEntry(currentInventaire.id, entryId);
      
      // Mettre à jour les entrées locales après succès de l'API
      setCurrentEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'entrée';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentInventaire]);

  // Finaliser l'inventaire actuel avec réajustement des stocks
  const finalizeInventaire = useCallback(async (applyAdjustments: boolean = true) => {
    if (!currentInventaire) {
      throw new Error('Aucun inventaire actuel');
    }

    try {
      setLoading(true);
      
      // Si on doit appliquer les réajustements
      if (applyAdjustments && currentEntries.length > 0) {
        // Pour chaque entrée avec une différence, créer un mouvement et mettre à jour le stock
        for (const entry of currentEntries) {
          const difference = entry.quantite_comptee - entry.quantite_theorique;
          
          if (difference !== 0) {
            // Créer un mouvement de réajustement d'inventaire
            const mouvementData = {
              article_id: entry.article_id,
              type: difference > 0 ? 'ENTREE' : 'SORTIE',
              quantite: Math.abs(difference),
              description: `Réajustement inventaire: ${currentInventaire.nom}`,
              commentaire: entry.commentaire || `Différence détectée lors de l'inventaire (Théorique: ${entry.quantite_theorique}, Compté: ${entry.quantite_comptee})`
            };
            
            try {
              // Créer le mouvement via l'API
              await api.createMouvement(mouvementData);
              
              // Mettre à jour l'article avec la nouvelle quantité
              await api.updateArticle(entry.article_id, {
                quantite_stock: entry.quantite_comptee
              });
            } catch (moveError) {
              console.error(`Erreur lors du réajustement de l'article ${entry.article_id}:`, moveError);
              // Continuer avec les autres entrées même si une échoue
            }
          }
        }
      }
      
      // Finaliser l'inventaire dans la base de données
      const finalizedInventaire = await api.finalizeInventaire(currentInventaire.id);
      setCurrentInventaire(null);
      setCurrentEntries([]);
      await loadInventaires(); // Recharger la liste
      return finalizedInventaire;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la finalisation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentInventaire, currentEntries, loadInventaires]);

  // Charger les données au montage
  useEffect(() => {
    const init = async () => {
      await loadCurrentInventaire();
      await loadInventaires();
    };
    
    init();
  }, [loadInventaires, loadCurrentInventaire]);

  return {
    // États
    inventaires,
    currentInventaire,
    currentEntries,
    loading,
    error,
    
    // Actions
    createInventaire,
    addEntry,
    deleteEntry,
    finalizeInventaire,
    loadInventaires,
    loadCurrentInventaire,
    
    // Helper pour nettoyer les erreurs
    clearError: () => setError(null)
  };
};