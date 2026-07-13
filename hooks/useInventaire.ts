'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Inventaire, InventaireEntry } from '@/types';

export const useInventaire = () => {
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [currentInventaire, setCurrentInventaire] = useState<Inventaire | null>(null);
  const [currentEntries, setCurrentEntries] = useState<InventaireEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadCurrentEntries = useCallback(async (inventaireId: string) => {
    try {
      const entries = await api.getInventaireEntries(inventaireId);
      setCurrentEntries(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des entrées');
    }
  }, []);

  const loadCurrentInventaire = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCurrentInventaire();
      setCurrentInventaire(data);
      if (data) await loadCurrentEntries(data.id);
      else setCurrentEntries([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement de l'inventaire actuel");
    } finally {
      setLoading(false);
    }
  }, [loadCurrentEntries]);

  const createInventaire = useCallback(async (inventaireData: { nom: string; description: string; mois: number; annee: number }) => {
    try {
      setLoading(true);
      const newInventaire = await api.createInventaire(inventaireData);
      setCurrentInventaire(newInventaire);
      setCurrentEntries([]);
      await loadInventaires();
      return newInventaire;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la création de l'inventaire";
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loadInventaires]);

  const addEntry = useCallback(async (entryData: { article_id: string; quantite_comptee: number; commentaire?: string }) => {
    if (!currentInventaire) throw new Error('Aucun inventaire actuel');
    try {
      const newEntry = await api.addInventaireEntry(currentInventaire.id, entryData);
      setCurrentEntries(prev => {
        const existingIndex = prev.findIndex(e => e.article_id === entryData.article_id && e.utilisateur_id === newEntry.utilisateur_id);
        if (existingIndex >= 0) { const updated = [...prev]; updated[existingIndex] = newEntry; return updated; }
        return [...prev, newEntry];
      });
      return newEntry;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'ajout de l'entrée";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentInventaire]);

  const deleteEntry = useCallback(async (entryId: string) => {
    if (!currentInventaire) throw new Error('Aucun inventaire actuel');
    try {
      await api.deleteInventaireEntry(currentInventaire.id, entryId);
      setCurrentEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur lors de la suppression de l'entrée";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [currentInventaire]);

  const finalizeInventaire = useCallback(async (applyAdjustments: boolean = true, utilisateurNom?: string) => {
    if (!currentInventaire) throw new Error('Aucun inventaire actuel');
    try {
      setLoading(true);
      if (applyAdjustments && currentEntries.length > 0) {
        for (const entry of currentEntries) {
          const difference = entry.quantite_comptee - entry.quantite_theorique;
          if (difference !== 0) {
            try {
              await api.createMouvement({
                article_id: entry.article_id,
                type: difference > 0 ? 'ENTREE' : 'SORTIE',
                quantite: Math.abs(difference),
                commentaire: entry.commentaire || `Différence détectée lors de l'inventaire (Théorique: ${entry.quantite_theorique}, Compté: ${entry.quantite_comptee})`,
                utilisateur: utilisateurNom || 'Utilisateur inconnu',
              });
              await api.updateArticle(entry.article_id, { quantite_stock: entry.quantite_comptee });
            } catch {}
          }
        }
      }
      const finalizedInventaire = await api.finalizeInventaire(currentInventaire.id);
      setCurrentInventaire(null);
      setCurrentEntries([]);
      await loadInventaires();
      return finalizedInventaire;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la finalisation';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentInventaire, currentEntries, loadInventaires]);

  useEffect(() => {
    const init = async () => { await loadCurrentInventaire(); await loadInventaires(); };
    init();
  }, [loadInventaires, loadCurrentInventaire]);

  return { inventaires, currentInventaire, currentEntries, loading, error, createInventaire, addEntry, deleteEntry, finalizeInventaire, loadInventaires, loadCurrentInventaire, clearError: () => setError(null) };
};
