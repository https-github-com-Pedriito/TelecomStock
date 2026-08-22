'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';
import { logger } from '@/lib/logger';
import { setToken, getToken, clearToken, hasValidToken, startTokenExpiryCheck } from '@/lib/tokenManager';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ token: string; user: User }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let isCheckingAuth = false;
let authPromise: Promise<User | null> | null = null;

function useAuthState(): AuthContextValue {
  const [state, setState] = useState<AuthState>(() => {
    const token = typeof window !== 'undefined' ? getToken() : null;
    return { user: null, loading: !!token, error: null, isAuthenticated: false };
  });

  useEffect(() => {
    const stopCheck = startTokenExpiryCheck(() => {
      logger.warn('Token expiré - déconnexion automatique');
      document.cookie = 'token=; path=/; max-age=0';
      setState({ user: null, loading: false, error: 'Session expirée', isAuthenticated: false });
    });
    return stopCheck;
  }, []);

  const checkAuth = useCallback(async () => {
    if (authPromise) {
      try {
        const user = await authPromise;
        if (user) setState({ user, loading: false, error: null, isAuthenticated: true });
        else setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      } catch (error) {
        setState({ user: null, loading: false, error: error instanceof Error ? error.message : 'Erreur de vérification de session', isAuthenticated: false });
      }
      return;
    }

    if (isCheckingAuth) return;
    isCheckingAuth = true;

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 10000 : 5000;

    authPromise = (async (): Promise<User | null> => {
      try {
        const token = getToken();
        if (!token) return null;

        const profilePromise = api.getProfile();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout après ${timeout / 1000}s - Vérifiez votre connexion`)), timeout);
        });

        return await Promise.race([profilePromise, timeoutPromise]);
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) clearToken();
        throw error;
      }
    })();

    try {
      const user = await authPromise;
      if (user) setState({ user, loading: false, error: null, isAuthenticated: true });
      else setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
    } catch (error) {
      setState({ user: null, loading: false, error: error instanceof Error ? error.message : 'Erreur de vérification de session', isAuthenticated: false });
    } finally {
      isCheckingAuth = false;
      authPromise = null;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { token, user } = await api.login(email, password);
      setToken(token);
      document.cookie = `token=${token}; path=/; SameSite=Lax; max-age=86400`;
      setState({ user, loading: false, error: null, isAuthenticated: true });
      isCheckingAuth = false;
      authPromise = null;
      return { token, user };
    } catch (error) {
      setState({ user: null, loading: false, error: error instanceof Error ? error.message : 'Erreur de connexion', isAuthenticated: false });
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
      clearToken();
      document.cookie = 'token=; path=/; max-age=0';
      setState({ user: null, loading: false, error: null, isAuthenticated: false });
      isCheckingAuth = false;
      authPromise = null;
    } catch (error) {
      clearToken();
      document.cookie = 'token=; path=/; max-age=0';
      setState({ user: null, loading: false, error: error instanceof Error ? error.message : 'Erreur de déconnexion', isAuthenticated: false });
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

  return { user: state.user, loading: state.loading, error: state.error, isAuthenticated: state.isAuthenticated, signIn, signOut };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
