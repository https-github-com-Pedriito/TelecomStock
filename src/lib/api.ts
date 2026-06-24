import { User } from '../types';
import { logger, logApiRequest, logApiResponse, logApiError } from './logger';
import { getToken, setToken, clearToken } from './tokenManager';

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    // Utiliser la variable d'environnement avec fallback temporaire
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';

    if (!import.meta.env.VITE_API_URL) {
      logger.warn('VITE_API_URL non trouve dans .env, utilisation du fallback /api');
    }
    this.token = getToken();
  }

  private async requestWithFallback(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Plus de fallback nécessaire - HTTPS fonctionne sur mobile
    return await this.request(endpoint, options);
  }

  private inFlightRequests: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private CACHE_DURATION = 500; // 500ms pour éviter les rafales

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const isGet = !options.method || options.method === 'GET';
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;

    // 1. Dépendance du cache pour les GET rapides
    if (isGet) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        // console.log(`[DEDUPE] Serving from cache: ${endpoint}`);
        return cached.data;
      }
    }

    // 2. Déduplication des requêtes en vol
    if (this.inFlightRequests.has(cacheKey)) {
      // console.log(`[DEDUPE] Joining in-flight request: ${endpoint}`);
      return this.inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...options.headers,
        };

        const url = `${this.baseUrl}${endpoint}`;
        const fetchOptions = {
          ...options,
          headers,
          mode: 'cors' as RequestMode,
          credentials: 'include' as RequestCredentials
        };

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText || `Erreur HTTP ${response.status}` };
          }

          logger.error('API Error:', { status: response.status, url });
          const error = new Error(errorData.message || 'Une erreur est survenue');
          (error as any).response = { status: response.status, data: errorData };
          throw error;
        }

        if (response.status === 204) return null;

        const text = await response.text();
        if (!text || text.trim() === '') return null;

        try {
          const jsonData = JSON.parse(text);
          
          // Mettre en cache pour les GET
          if (isGet) {
            this.cache.set(cacheKey, { data: jsonData, timestamp: Date.now() });
          }
          
          return jsonData;
        } catch (error) {
          return text;
        }
      } finally {
        // Toujours nettoyer les requêtes en vol
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.token = response.token;
    setToken(response.token);
    return response;
  }

  // Méthodes CRUD génériques avec fallback
  async get<T>(endpoint: string) {
    return this.requestWithFallback(endpoint) as Promise<T>;
  }

  async post<T>(endpoint: string, data: any) {
    logApiRequest('POST', endpoint, data);
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
    clearToken();
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Demande de réinitialisation de mot de passe (transmise à un administrateur)
  async forgotPassword(email: string) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
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
    // Mapper les champs selon le modèle backend User
    const apiData = {
      email: data.email,
      password: (data as any).password, // Le password est passé mais pas dans le type User
      nom: data.nom,
      prenom: data.prenom,
      role: data.role.toUpperCase(), // ADMIN, MANAGER, TECHNICIEN
      is_active: data.is_active !== undefined ? data.is_active : true
    };
    
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(apiData),
    });
  }

  // Articles
  async getArticles() {
    return this.request('/articles');
  }

  // Upload d'image relayé par le backend (la clé ImgBB reste côté serveur)
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${this.baseUrl}/articles/upload-image`, {
      method: 'POST',
      headers: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: formData,
      mode: 'cors',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Erreur lors de l\'upload de l\'image' };
      }
      throw new Error(errorData.message || 'Erreur lors de l\'upload de l\'image');
    }

    return response.json();
  }

  async createArticle(article: any) {
    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify(article),
    });
  }

  async updateArticle(id: string, article: any) {
    return this.request(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(article),
    });
  }

  async deleteArticle(id: string) {
    return this.request(`/articles/${id}`, {
      method: 'DELETE',
    });
  }

  async handleForceDeleteArticle(id: string) {
    return this.request(`/articles/${id}/force`, {
      method: 'DELETE',
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

  async deleteMouvement(id: string) {
    return this.request(`/mouvements/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventaires
  async getInventaires() {
    return this.request('/inventaires');
  }

  async getCurrentInventaire() {
    return this.request('/inventaires/current');
  }

  async createInventaire(inventaire: any) {
    return this.request('/inventaires', {
      method: 'POST',
      body: JSON.stringify(inventaire),
    });
  }

  async getInventaire(id: string) {
    return this.request(`/inventaires/${id}`);
  }

  async getInventaireEntries(id: string) {
    return this.request(`/inventaires/${id}/entries`);
  }

  async addInventaireEntry(inventaireId: string, entry: any) {
    return this.request(`/inventaires/${inventaireId}/entries`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  async finalizeInventaire(id: string) {
    return this.request(`/inventaires/${id}/finalize`, {
      method: 'PUT',
    });
  }

  async deleteInventaireEntry(inventaireId: string, entryId: string) {
    return this.request(`/inventaires/${inventaireId}/entries/${entryId}`, {
      method: 'DELETE',
    });
  }

  // Méthodes pour les localisations
  async getLocalisations() {
    return this.request('/localisations');
  }

  async getLocalisation(id: string) {
    return this.request(`/localisations/${id}`);
  }

  async createLocalisation(localisation: any) {
    return this.request('/localisations', {
      method: 'POST',
      body: JSON.stringify(localisation),
    });
  }

  async updateLocalisation(id: string, localisation: any) {
    return this.request(`/localisations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(localisation),
    });
  }

  async deleteLocalisation(id: string) {
    return this.request(`/localisations/${id}`, {
      method: 'DELETE',
    });
  }

  // Méthodes pour les fournisseurs
  async getFournisseurs() {
    return this.request('/fournisseurs');
  }

  async getFournisseur(id: string) {
    return this.request(`/fournisseurs/${id}`);
  }

  async createFournisseur(fournisseur: any) {
    return this.request('/fournisseurs', {
      method: 'POST',
      body: JSON.stringify(fournisseur),
    });
  }

  async updateFournisseur(id: string, fournisseur: any) {
    return this.request(`/fournisseurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fournisseur),
    });
  }

  async deleteFournisseur(id: string) {
    return this.request(`/fournisseurs/${id}`, {
      method: 'DELETE',
    });
  }

  // Changement de mot de passe utilisateur
  async changePassword(oldPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

}

export const api = new ApiService();
