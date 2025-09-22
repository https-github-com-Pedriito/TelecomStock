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
      await api.deleteInventaireEntry(currentInventaire.id, entryId);
      
      // Mettre à jour les entrées locales
      setCurrentEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'entrée';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentInventaire]);

  // Finaliser l'inventaire actuel
  const finalizeInventaire = useCallback(async () => {
    if (!currentInventaire) {
      throw new Error('Aucun inventaire actuel');
    }

    try {
      setLoading(true);
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
  }, [currentInventaire, loadInventaires]);

  // Sauvegarder localement (localStorage) pour persistance
  const saveToLocalStorage = useCallback(() => {
    if (currentInventaire && currentEntries.length > 0) {
      const inventaireData = {
        inventaire: currentInventaire,
        entries: currentEntries,
        lastSaved: Date.now()
      };
      localStorage.setItem('inventaire_en_cours', JSON.stringify(inventaireData));
    }
  }, [currentInventaire, currentEntries]);

  // Charger depuis localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('inventaire_en_cours');
      if (saved) {
        const data = JSON.parse(saved);
        // Vérifier que les données ne sont pas trop anciennes (24h)
        const isRecent = Date.now() - data.lastSaved < 24 * 60 * 60 * 1000;
        
        if (isRecent && data.inventaire && data.entries) {
          setCurrentInventaire(data.inventaire);
          setCurrentEntries(data.entries);
          return true;
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement depuis localStorage:', err);
    }
    return false;
  }, []);

  // Effacer le localStorage
  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem('inventaire_en_cours');
  }, []);

  // Auto-sauvegarder quand les entrées changent
  useEffect(() => {
    if (currentInventaire && currentEntries.length > 0) {
      const timeoutId = setTimeout(saveToLocalStorage, 1000); // Délai de 1s
      return () => clearTimeout(timeoutId);
    }
  }, [currentEntries, currentInventaire, saveToLocalStorage]);

  // Charger les données au montage
  useEffect(() => {
    const init = async () => {
      // D'abord essayer de charger depuis localStorage
      const hasLocalData = loadFromLocalStorage();
      
      // Ensuite charger depuis l'API
      if (!hasLocalData) {
        await loadCurrentInventaire();
      }
      await loadInventaires();
    };
    
    init();
  }, [loadInventaires, loadCurrentInventaire, loadFromLocalStorage]);

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
    
    // Persistence locale
    saveToLocalStorage,
    clearLocalStorage,
    
    // Helper pour nettoyer les erreurs
    clearError: () => setError(null)
  };
};