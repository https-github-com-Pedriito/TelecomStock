'use client';

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const TOKEN_LIFETIME = 30 * 60 * 1000;

export const setToken = (token: string): void => {
  try {
    const payload = decodeJWT(token);
    const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + TOKEN_LIFETIME;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  } catch {
    console.error('Erreur lors du stockage du token');
  }
};

export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiryStr) return null;
    const expiresAt = parseInt(expiryStr, 10);
    if (Date.now() >= expiresAt) {
      clearToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const hasValidToken = (): boolean => getToken() !== null;

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    console.error('Erreur lors de la suppression du token');
  }
};

export const refreshTokenExpiry = (): void => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, (Date.now() + TOKEN_LIFETIME).toString());
  }
};

export const getTokenTimeRemaining = (): number => {
  try {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) return 0;
    const remaining = parseInt(expiryStr, 10) - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
};

export const isTokenExpiringSoon = (): boolean => {
  const remaining = getTokenTimeRemaining();
  return remaining > 0 && remaining < 5 * 60 * 1000;
};

export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const startTokenExpiryCheck = (onExpiry: () => void): (() => void) => {
  const interval = setInterval(() => {
    if (!hasValidToken()) onExpiry();
  }, 60000);
  return () => clearInterval(interval);
};
