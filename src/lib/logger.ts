/**
 * Utilitaire de logging sécurisé
 * 
 * Les logs sont automatiquement désactivés en production pour:
 * - Éviter l'exposition d'informations sensibles
 * - Améliorer les performances
 * - Respecter les bonnes pratiques de sécurité
 */

const isDevelopment = import.meta.env.MODE === 'development';

interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

/**
 * Logger sécurisé qui désactive les logs en production
 * Utilisation: import { logger } from '../lib/logger';
 * logger.log('Mon message'); // Affiché seulement en dev
 */
export const logger: Logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Les erreurs sont toujours loguées mais sans données sensibles en prod
    if (isDevelopment) {
      console.error(...args);
    } else {
      // En production, loguer uniquement le message d'erreur sans détails
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === 'object') {
          return '[Object]';
        }
        return arg;
      });
      console.error(...sanitizedArgs);
    }
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

/**
 * Fonction pour sanitiser les données sensibles avant de les logger
 * Masque automatiquement: tokens, passwords, clés API, etc.
 */
export const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'auth', 'api_key', 'apikey', 'secret', 'authorization'];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '***HIDDEN***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Logger pour les requêtes API avec sanitisation automatique
 */
export const logApiRequest = (method: string, url: string, data?: any) => {
  if (isDevelopment) {
    logger.log(`[API ${method}]`, url, data ? sanitizeForLog(data) : '');
  }
};

export const logApiResponse = (method: string, url: string, response: any) => {
  if (isDevelopment) {
    logger.log(`[API ${method} Response]`, url, sanitizeForLog(response));
  }
};

export const logApiError = (method: string, url: string, error: any) => {
  logger.error(`[API ${method} Error]`, url, error instanceof Error ? error.message : 'Unknown error');
};
