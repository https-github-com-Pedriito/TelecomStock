'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useRealtime';
import type { Kit, KitInput, KitMouvementData, KitMouvementResult } from '@/types';

/**
 * Charge et manipule les kits du tenant courant.
 *
 * Volontairement hors du StockContext : les kits ne sont consultes que par
 * l'ecran dedie et le scanner, les charger a chaque montage de l'app
 * alourdirait le demarrage pour tous les autres ecrans.
 */
export function useKits() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Aucun setState avant le premier await : appele depuis un effet, un
    // setState synchrone declencherait un rendu en cascade (react-hooks/
    // set-state-in-effect).
    try {
      const data = await api.get<Kit[]>('/kits');
      setKits(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleRealtimeEvent = useCallback(
    (event: { table: string }) => {
      if (event.table === 'kits' || event.table === 'kit') refresh();
    },
    [refresh]
  );
  useRealtime(handleRealtimeEvent);

  const createKit = useCallback(async (input: KitInput) => {
    const kit = await api.post<Kit>('/kits', input);
    setKits(prev => [...prev, kit].sort((a, b) => a.code.localeCompare(b.code)));
    return kit;
  }, []);

  const updateKit = useCallback(async (id: string, input: Partial<KitInput>) => {
    const kit = await api.put<Kit>(`/kits/${id}`, input);
    setKits(prev => prev.map(k => (k.id === id ? kit : k)));
    return kit;
  }, []);

  const deleteKit = useCallback(async (id: string) => {
    await api.delete(`/kits/${id}`);
    setKits(prev => prev.filter(k => k.id !== id));
  }, []);

  /**
   * Enregistre une entree/sortie de kits. Le stock des composants change,
   * l'appelant doit donc rafraichir les articles apres coup.
   */
  const moveKit = useCallback(async (data: KitMouvementData) => {
    return api.post<KitMouvementResult>('/kits/mouvement', data);
  }, []);

  return { kits, loading, error, refresh, createKit, updateKit, deleteKit, moveKit };
}
