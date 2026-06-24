/**
 * Utilitaire de gestion sécurisée des tokens JWT
 * 
 * Fonctionnalités:
 * - Stockage avec expiration automatique
 * - Validation de tokens
 * - Nettoyage automatique des tokens expirés
 * - Protection contre les attaques XSS (Partielle - localStorage est accessible via JS)
 * 
 * NOTE DE SÉCURITÉ: Le stockage dans localStorage est vulnérable aux attaques XSS. 
 * Il est recommandé de migrer vers des cookies HttpOnly pour une sécurité maximale.
 */

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';
const TOKEN_LIFETIME = 30 * 60 * 1000; // Repli si le JWT n'a pas de claim "exp" décodable


/**
 * Stocke un token avec une date d'expiration
 * L'expiration est alignée sur le claim "exp" du JWT (durée réelle côté serveur),
 * avec un repli sur TOKEN_LIFETIME si le token ne peut pas être décodé.
 */
export const setToken = (token: string): void => {
  try {
    const payload = decodeJWT(token);
    const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + TOKEN_LIFETIME;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  } catch (error) {
    console.error('Erreur lors du stockage du token');
  }
};

/**
 * Récupère le token s'il est encore valide
 * Retourne null si le token est expiré ou invalide
 */
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (!token || !expiryStr) {
      return null;
    }

    const expiresAt = parseInt(expiryStr, 10);
    
    // Vérifier si le token est expiré
    if (Date.now() >= expiresAt) {
      clearToken();
      return null;
    }

    return token;
  } catch (error) {
    console.error('Erreur lors de la récupération du token');
    return null;
  }
};

/**
 * Vérifie si un token valide existe
 */
export const hasValidToken = (): boolean => {
  return getToken() !== null;
};

/**
 * Supprime le token et ses métadonnées
 */
export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    console.error('Erreur lors de la suppression du token');
  }
};

/**
 * Rafraîchit la date d'expiration du token
 * Utile lors d'une activité utilisateur
 */
export const refreshTokenExpiry = (): void => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const expiresAt = Date.now() + TOKEN_LIFETIME;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
  }
};

/**
 * Obtient le temps restant avant expiration (en millisecondes)
 * Retourne 0 si le token est expiré ou inexistant
 */
export const getTokenTimeRemaining = (): number => {
  try {
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiryStr) {
      return 0;
    }

    const expiresAt = parseInt(expiryStr, 10);
    const remaining = expiresAt - Date.now();
    
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Vérifie si le token expire bientôt (moins de 5 minutes)
 */
export const isTokenExpiringSoon = (): boolean => {
  const remaining = getTokenTimeRemaining();
  return remaining > 0 && remaining < 5 * 60 * 1000; // Moins de 5 minutes
};

/**
 * Décoder un JWT (sans validation - pour affichage uniquement)
 * ATTENTION: Ne jamais faire confiance aux données décodées côté client
 */
export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Démarre un intervalle de vérification automatique de l'expiration
 * Retourne une fonction pour arrêter l'intervalle
 */
export const startTokenExpiryCheck = (onExpiry: () => void): (() => void) => {
  const interval = setInterval(() => {
    if (!hasValidToken()) {
      onExpiry();
    }
  }, 60000); // Vérifier toutes les minutes

  return () => clearInterval(interval);
};
