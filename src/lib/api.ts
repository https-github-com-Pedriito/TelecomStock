import { User } from '../types';

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    // Configuration de l'API
    const host = window.location.hostname;
    const protocol = 'https:'; // Forcer HTTPS pour l'API
    const apiPort = '3443';    // Port de l'API
    
    // En développement, on utilise localhost
    // En production, on utilise l'IP ou le nom de domaine du serveur
    if (host === 'localhost' || host === '127.0.0.1') {
      // En local, on pointe toujours vers localhost:3443
      this.baseUrl = `${protocol}//localhost:${apiPort}`;
    } else {
      // Sur mobile ou en production, on utilise l'adresse du serveur
      this.baseUrl = `${protocol}//${host}:${apiPort}`;
    }
    
    console.log('API Configuration:', {
      url: this.baseUrl,
      protocol: protocol,
      host: host
    });

    console.log('API URL:', this.baseUrl); // Pour le débogage
    this.token = localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
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
      console.log('Fetching:', url); // Pour le débogage

      const fetchOptions = {
        ...options,
        headers,
        mode: 'cors' as RequestMode,
        credentials: 'include' as RequestCredentials
      };

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || 'Une erreur est survenue';
        } catch {
          errorMessage = errorText || `Erreur HTTP ${response.status}`;
        }
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          url
        });
        throw new Error(errorMessage);
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

  // Méthodes CRUD génériques
  async get<T>(endpoint: string) {
    return this.request(endpoint) as Promise<T>;
  }

  async post<T>(endpoint: string, data: any) {
    console.log('API POST request:', { endpoint, data });
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }) as Promise<T>;
  }

  async put<T>(endpoint: string, data: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }) as Promise<T>;
  }

  async delete(endpoint: string) {
    const response = await this.request(endpoint, {
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
