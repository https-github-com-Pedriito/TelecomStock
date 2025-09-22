import { User } from '../types';

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    // Configuration HTTPS complète basée sur les variables d'environnement Vite
    const apiUrl = import.meta.env.VITE_API_URL;
    const apiUrlHttps = import.meta.env.VITE_API_URL_HTTPS;
    
    // Utiliser les variables d'environnement en priorité, sinon détection automatique
    if (apiUrl) {
      this.baseUrl = apiUrl;
      console.log('[DEBUG] API URL from environment:', apiUrl);
    } else if (apiUrlHttps) {
      this.baseUrl = apiUrlHttps;
      console.log('[DEBUG] API HTTPS URL from environment:', apiUrlHttps);
    } else {
      // Fallback: détection automatique
      const host = window.location.hostname;
      const isSecureContext = window.location.protocol === 'https:';
      
      if (host === 'localhost' || host === '127.0.0.1') {
        this.baseUrl = isSecureContext ? `https://${host}:3443` : `http://${host}:3080`;
      } else {
        // Utiliser HTTPS par défaut pour les accès distants
        this.baseUrl = `https://${host}:3443`;
      }
      console.log('[DEBUG] API URL auto-detected:', this.baseUrl);
    }
    
    console.log('[DEBUG] Final API Configuration:', {
      baseUrl: this.baseUrl,
      protocol: this.baseUrl.startsWith('https') ? 'HTTPS' : 'HTTP',
      isSecureContext: window.location.protocol === 'https:',
      host: window.location.hostname
    });
    this.token = localStorage.getItem('auth_token');
  }

  private async requestWithFallback(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Plus de fallback nécessaire - HTTPS fonctionne sur mobile
    return await this.request(endpoint, options);
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      console.log('=== API Request Start ===');
      console.log('User Agent:', navigator.userAgent);
      console.log('Window Location:', {
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
        port: window.location.port
      });
      
      const headers = {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options.headers,
      };

      const url = `${this.baseUrl}${endpoint}`;
      console.log('[DEBUG] Fetching:', url); // Pour le débogage

      const fetchOptions = {
        ...options,
        headers,
        mode: 'cors' as RequestMode,
        credentials: 'include' as RequestCredentials
      };

      console.log('[DEBUG] Fetch options:', fetchOptions);

      const response = await fetch(url, fetchOptions);

      console.log('[DEBUG] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Erreur HTTP ${response.status}` };
        }
        
        console.error('[DEBUG] API Error:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          url
        });
        
        // Créer une erreur avec toutes les informations
        const error = new Error(errorData.message || 'Une erreur est survenue');
        (error as any).response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        throw error;
      }

      // Gérer les réponses vides (comme 204 No Content)
      if (response.status === 204) {
        return null;
      }

      // Vérifier s'il y a du contenu à parser
      const text = await response.text();
      if (!text || text.trim() === '') {
        return null;
      }

      // Essayer de parser le JSON
      try {
        return JSON.parse(text);
      } catch (error) {
        console.warn('Failed to parse response as JSON:', text);
        return text;
      }
    } catch (error) {
      console.error('Request failed:', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = response.token;
    localStorage.setItem('auth_token', response.token);
    return response;
  }

  // Méthodes CRUD génériques avec fallback
  async get<T>(endpoint: string) {
    return this.requestWithFallback(endpoint) as Promise<T>;
  }

  async post<T>(endpoint: string, data: any) {
    console.log('API POST request:', { endpoint, data });
    return this.requestWithFallback(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<T>;
  }

  async put<T>(endpoint: string, data: any) {
    return this.requestWithFallback(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<T>;
  }

  async delete(endpoint: string) {
    const response = await this.requestWithFallback(endpoint, {
      method: 'DELETE',
    });
    // Pour DELETE, on ne s'attend pas forcément à du contenu
    return response;
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Articles
  async getArticles() {
    return this.request('/articles');
  }

  async createArticle(article: any) {
    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  }

  // Mouvements
  async getMouvements() {
    return this.request('/mouvements');
  }

  async createMouvement(mouvement: any) {
    return this.request('/mouvements', {
      method: 'POST',
      body: JSON.stringify(mouvement),
    });
  }

}

export const api = new ApiService();
