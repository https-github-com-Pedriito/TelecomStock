const isDevelopment = process.env.NODE_ENV === 'development';

interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
}

export const logger: Logger = {
  log: (...args: any[]) => { if (isDevelopment) console.log(...args); },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    } else {
      console.error(...args.map(a => a instanceof Error ? a.message : typeof a === 'object' ? '[Object]' : a));
    }
  },
  warn: (...args: any[]) => { if (isDevelopment) console.warn(...args); },
  info: (...args: any[]) => { if (isDevelopment) console.info(...args); },
  debug: (...args: any[]) => { if (isDevelopment) console.debug(...args); },
};

export const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  const sensitiveKeys = ['password', 'token', 'auth', 'api_key', 'apikey', 'secret', 'authorization'];
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***HIDDEN***';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  });
  return sanitized;
};

export const logApiRequest = (method: string, url: string, data?: any) => {
  if (isDevelopment) logger.log(`[API ${method}]`, url, data ? sanitizeForLog(data) : '');
};

export const logApiResponse = (method: string, url: string, response: any) => {
  if (isDevelopment) logger.log(`[API ${method} Response]`, url, sanitizeForLog(response));
};

export const logApiError = (method: string, url: string, error: any) => {
  logger.error(`[API ${method} Error]`, url, error instanceof Error ? error.message : 'Unknown error');
};
