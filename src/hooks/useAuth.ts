import { useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false
  });

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      const profile = await api.getProfile();
      setState({
        user: profile,
        loading: false,
        error: null,
        isAuthenticated: true
      });
    } catch (error) {
      console.error('Error checking auth:', error);
      localStorage.removeItem('auth_token');
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de vérification de session',
        isAuthenticated: false
      });
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const { token, user } = await api.login(email, password);
      localStorage.setItem('auth_token', token);
      setState({
        user,
        loading: false,
        error: null,
        isAuthenticated: true
      });
      return { token, user };
    } catch (error) {
      console.error('Error signing in:', error);
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
    } catch (error) {
      console.error('Error signing out:', error);
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur de déconnexion',
        isAuthenticated: false
      });
      throw error;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    signIn,
    signOut
  };
} 
