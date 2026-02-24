import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { logger } from '../lib/logger';
import { setToken, getToken, clearToken, hasValidToken, startTokenExpiryCheck } from '../lib/tokenManager';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Variable globale pour éviter les appels multiples
let isCheckingAuth = false;
let authPromise: Promise<User | null> | null = null;

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const token = getToken();
    return {
      user: null,
      loading: !!token,
      error: null,
      isAuthenticated: false
    };
  });

  // Surveillance automatique de l'expiration du token
  useEffect(() => {
    const stopCheck = startTokenExpiryCheck(() => {
      logger.warn('Token expiré - déconnexion automatique');
      setState({
        user: null,
        loading: false,
        error: 'Session expirée',
        isAuthenticated: false
      });
    });
    return stopCheck;
  }, []);

  const checkAuth = useCallback(async () => {
    // Si une vérification est déjà en cours, attendre le résultat
    if (authPromise) {
      logger.debug('checkAuth - Attente de la vérification en cours...');
      try {
        const user = await authPromise;
        if (user) {
          setState({
            user,
            loading: false,
            error: null,
            isAuthenticated: true
          });
        } else {
          setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
        }
      } catch (error) {
        setState({
          user: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Erreur de vérification de session',
          isAuthenticated: false
        });
      }
      return;
    }

    if (isCheckingAuth) {
      logger.debug('checkAuth - Vérification déjà en cours, ignore');
      return;
    }

    logger.debug('checkAuth - Début de la vérification');
    isCheckingAuth = true;

    // Timeout spécial pour mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 10000 : 5000; // 10s sur mobile, 5s sur desktop

    authPromise = (async (): Promise<User | null> => {
      try {
        const token = getToken();
        logger.debug('checkAuth - Token trouvé:', token ? 'Oui' : 'Non');
        logger.debug('checkAuth - Plateforme:', isMobile ? 'Mobile' : 'Desktop');
        
        if (!token) {
          return null;
        }

        logger.debug(`checkAuth - Vérification du profil (timeout: ${timeout}ms)...`);
        
        // Promise avec timeout
        const profilePromise = api.getProfile();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout après ${timeout/1000}s - Vérifiez votre connexion`)), timeout);
        });

        const profile = await Promise.race([profilePromise, timeoutPromise]);
        return profile;
      } catch (error: any) {
        logger.error('Error checking auth:', error);
        logger.debug('checkAuth - Suppression du token invalide');
        clearToken();
        
        // Messages d'erreur spécifiques pour mobile
        if (isMobile) {
          if (error.message?.includes('Timeout')) {
            throw new Error('Connexion lente détectée. Essayez de vous reconnecter.');
          } else if (error.message?.includes('Certificate') || error.message?.includes('SSL')) {
            throw new Error('Problème de sécurité. Essayez en HTTP sur mobile.');
          } else if (error.message?.includes('Network')) {
            throw new Error('Problème réseau. Vérifiez votre connexion.');
          }
        }
        throw error;
      }
    })();

    try {
      const user = await authPromise;
      if (user) {
        setState({
          user,
          loading: false,
          error: null,
          isAuthenticated: true
        });
      } else {
        setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      }
    } catch (error) {
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de vérification de session',
        isAuthenticated: false
      });
    } finally {
      isCheckingAuth = false;
      authPromise = null;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      logger.debug('signIn - Tentative de connexion pour:', email);
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { token, user } = await api.login(email, password);
      setToken(token);
      logger.info('signIn - Connexion réussie pour:', user.email);
      setState({
        user,
        loading: false,
        error: null,
        isAuthenticated: true
      });
      // Réinitialiser les flags globaux
      isCheckingAuth = false;
      authPromise = null;
      return { token, user };
    } catch (error) {
      logger.error('Error signing in:', error);
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de connexion',
        isAuthenticated: false
      });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
      clearToken();
      setState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false
      });
      // Réinitialiser les flags globaux
      isCheckingAuth = false;
      authPromise = null;
    } catch (error) {
      logger.error('Error signing out:', error);
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de déconnexion',
        isAuthenticated: false
      });
      // Réinitialiser les flags globaux même en cas d'erreur
      isCheckingAuth = false;
      authPromise = null;
      throw error;
    }
  }, []);

  useEffect(() => {
    if (hasValidToken() && !state.isAuthenticated && !isCheckingAuth) {
      checkAuth();
    }
  }, [checkAuth, state.isAuthenticated]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    signIn,
    signOut
  };
}
