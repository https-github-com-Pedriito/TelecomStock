import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { getToken } from '../lib/tokenManager';

export interface DatabaseChangeEvent {
  type: 'create' | 'update' | 'delete';
  table: string;
  data?: any;
  id?: number | string;
  timestamp: Date;
  userId?: string;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  debug?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, debug = false } = options;
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<DatabaseChangeEvent | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  
  // Callbacks pour les différents types d'événements
  const eventCallbacks = useRef<{
    [key: string]: Array<(event: DatabaseChangeEvent) => void>
  }>({});

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[WebSocket] ${message}`, data || '');
    }
  }, [debug]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      log('❌ Utilisateur non authentifié, connexion WebSocket annulée');
      return;
    }

    if (socketRef.current?.connected) {
      log('⚠️ WebSocket déjà connecté');
      return;
    }

    // Déterminer l'URL du WebSocket selon l'environnement
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      log('VITE_API_URL non configuree, connexion WebSocket annulee');
      return;
    }
    const wsUrl = apiUrl.replace('/api', ''); // Enlever /api si présent
    
    log(`🔗 Connexion WebSocket vers: ${wsUrl}`);

    socketRef.current = io(wsUrl, {
      transports: ['websocket', 'polling'], // Fallback sur polling si WebSocket échoue
      upgrade: true,
      secure: wsUrl.startsWith('https'),
      rejectUnauthorized: false, // Pour les certificats auto-signés en dev
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      log('✅ WebSocket connecté');
      setIsConnected(true);
      setConnectionAttempts(0);
      
      // Authentifier immédiatement avec le vrai JWT (le serveur vérifie le
      // token plutôt que de faire confiance à un userId/role envoyé par le client)
      const token = getToken();
      if (token) {
        socket.emit('authenticate', { token });
      }
    });

    socket.on('disconnect', (reason) => {
      log(`🔌 WebSocket déconnecté: ${reason}`);
      setIsConnected(false);
    });

    socket.on('authenticated', (data) => {
      log('🔐 WebSocket authentifié', data);
    });

    socket.on('connect_error', (error) => {
      log(`❌ Erreur connexion WebSocket: ${error.message}`);
      setConnectionAttempts(prev => prev + 1);
    });

    // Écouter tous les changements de base de données
    socket.on('database_change', (event: DatabaseChangeEvent) => {
      log('📢 Changement BDD reçu', event);
      setLastEvent(event);
      
      // Appeler les callbacks appropriés
      const tableCallbacks = eventCallbacks.current[event.table] || [];
      const allCallbacks = eventCallbacks.current['*'] || [];
      
      [...tableCallbacks, ...allCallbacks].forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Erreur dans callback WebSocket:', error);
        }
      });
    });

    // Écouter les événements spécifiques par table
    ['articles_changed', 'mouvements_changed', 'fournisseurs_changed', 'users_changed'].forEach(eventName => {
      socket.on(eventName, (event: DatabaseChangeEvent) => {
        log(`📊 ${eventName}`, event);
        setLastEvent(event);
      });
    });

    // Maintenir la connexion avec ping/pong
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    socket.on('pong', () => {
      log('🏓 Pong reçu');
    });

    // Nettoyage lors de la déconnexion
    return () => {
      clearInterval(pingInterval);
    };

  }, [isAuthenticated, user, log]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('🔌 Déconnexion WebSocket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, [log]);

  // S'abonner à des événements spécifiques
  const subscribe = useCallback((table: string, callback: (event: DatabaseChangeEvent) => void) => {
    if (!eventCallbacks.current[table]) {
      eventCallbacks.current[table] = [];
    }
    eventCallbacks.current[table].push(callback);
    
    log(`📝 Abonnement aux changements de table: ${table}`);

    // Retourner une fonction de désabonnement
    return () => {
      const callbacks = eventCallbacks.current[table];
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
          log(`❌ Désabonnement de la table: ${table}`);
        }
      }
    };
  }, [log]);

  // S'abonner à tous les événements
  const subscribeToAll = useCallback((callback: (event: DatabaseChangeEvent) => void) => {
    return subscribe('*', callback);
  }, [subscribe]);

  // Effet pour gérer la connexion automatique
  useEffect(() => {
    if (autoConnect && isAuthenticated && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, user, connect, disconnect]);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastEvent,
    connectionAttempts,
    connect,
    disconnect,
    subscribe,
    subscribeToAll,
    socket: socketRef.current
  };
}
