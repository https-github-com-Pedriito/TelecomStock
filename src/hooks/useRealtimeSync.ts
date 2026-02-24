import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export interface UseRealtimeSyncOptions {
  onArticlesChange?: () => void;
  onMouvementsChange?: () => void;
  onFournisseursChange?: () => void;
  onUsersChange?: () => void;
  debug?: boolean;
}

// Cooldown pour éviter les rechargements inutiles après une action locale
const lastLocalAction = new Map<string, number>();

export const notifyRealtimeLocalAction = (table: string) => {
  lastLocalAction.set(table, Date.now());
};

export function useRealtimeSync(options: UseRealtimeSyncOptions = {}) {
  const { 
    onArticlesChange, 
    onMouvementsChange, 
    onFournisseursChange, 
    onUsersChange,
    debug = false 
  } = options;

  const { isConnected, lastEvent, subscribe, subscribeToAll } = useWebSocket({ 
    autoConnect: true,
    debug 
  });

  // Callback générique pour tous les changements
  const handleDatabaseChange = useCallback((event: any) => {
    const now = Date.now();
    const lastLocal = lastLocalAction.get(event.table) || 0;
    
    // Si une action locale a eu lieu il y a moins de 2 secondes, on ignore l'event WS
    if (now - lastLocal < 2000) {
      if (debug) console.log(`[REALTIME] Ignoring remote event for ${event.table} (recent local action)`);
      return;
    }

    if (debug) {
      console.log('🔄 Changement distant détecté:', event);
    }

    switch (event.table) {
      case 'article':
        if (onArticlesChange) {
          console.log('📦 Rafraîchissement des articles...');
          onArticlesChange();
        }
        break;
      case 'mouvement':
        if (onMouvementsChange) {
          console.log('📋 Rafraîchissement des mouvements...');
          onMouvementsChange();
        }
        break;
      case 'fournisseur':
        if (onFournisseursChange) {
          console.log('🏢 Rafraîchissement des fournisseurs...');
          onFournisseursChange();
        }
        break;
      case 'user':
        if (onUsersChange) {
          console.log('👥 Rafraîchissement des utilisateurs...');
          onUsersChange();
        }
        break;
    }
  }, [onArticlesChange, onMouvementsChange, onFournisseursChange, onUsersChange, debug]);

  // S'abonner aux changements
  useEffect(() => {
    const unsubscribe = subscribeToAll(handleDatabaseChange);
    return unsubscribe;
  }, [subscribeToAll, handleDatabaseChange]);

  // Fonctions spécialisées pour s'abonner à des tables spécifiques
  const subscribeToArticles = useCallback((callback: () => void) => {
    return subscribe('article', callback);
  }, [subscribe]);

  const subscribeToMouvements = useCallback((callback: () => void) => {
    return subscribe('mouvement', callback);
  }, [subscribe]);

  const subscribeToFournisseurs = useCallback((callback: () => void) => {
    return subscribe('fournisseur', callback);
  }, [subscribe]);

  const subscribeToUsers = useCallback((callback: () => void) => {
    return subscribe('user', callback);
  }, [subscribe]);

  return {
    isConnected,
    lastEvent,
    subscribeToArticles,
    subscribeToMouvements,
    subscribeToFournisseurs,
    subscribeToUsers
  };
}