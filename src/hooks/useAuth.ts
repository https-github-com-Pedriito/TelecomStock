import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

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
    const token = localStorage.getItem('auth_token');
    return {
      user: null,
      loading: !!token,
      error: null,
      isAuthenticated: false
    };
  });

  const checkAuth = useCallback(async () => {
    // Si une vérification est déjà en cours, attendre le résultat
    if (authPromise) {
      console.log('[DEBUG] checkAuth - Attente de la vérification en cours...');
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
      console.log('[DEBUG] checkAuth - Vérification déjà en cours, ignore');
      return;
    }

    console.log('[DEBUG] checkAuth - Début de la vérification');
    isCheckingAuth = true;

    // Timeout spécial pour mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 10000 : 5000; // 10s sur mobile, 5s sur desktop

    authPromise = (async (): Promise<User | null> => {
      try {
        const token = localStorage.getItem('auth_token');
        console.log('checkAuth - Token trouvé:', token ? 'Oui' : 'Non');
        console.log('checkAuth - Plateforme:', isMobile ? 'Mobile' : 'Desktop');
        
        if (!token) {
          return null;
        }

        console.log(`checkAuth - Vérification du profil (timeout: ${timeout}ms)...`);
        
        // Promise avec timeout
        const profilePromise = api.getProfile();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout après ${timeout/1000}s - Vérifiez votre connexion`)), timeout);
        });

        const profile = await Promise.race([profilePromise, timeoutPromise]);
        return profile;
      } catch (error: any) {
        console.error('Error checking auth:', error);
        console.log('checkAuth - Suppression du token invalide');
        localStorage.removeItem('auth_token');
        
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
      console.log('[DEBUG] signIn - Tentative de connexion pour:', email);
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { token, user } = await api.login(email, password);
      localStorage.setItem('auth_token', token);
      console.log('[DEBUG] signIn - Connexion réussie pour:', user.email);
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
      console.error('[DEBUG] Error signing in:', error);
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
      localStorage.removeItem('auth_token');
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
      console.error('Error signing out:', error);
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
    const token = localStorage.getItem('auth_token');
    if (token && !state.isAuthenticated && !isCheckingAuth) {
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
