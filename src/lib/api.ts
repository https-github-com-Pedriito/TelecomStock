import { User } from '../types';

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    // Utiliser la variable d'environnement avec fallback temporaire
    this.baseUrl = import.meta.env.VITE_API_URL;

    if (!import.meta.env.VITE_API_URL) {
      console.warn('⚠️ VITE_API_URL non trouvé dans .env, utilisation du fallback');
    }
    this.token = localStorage.getItem('auth_token');
  }

  private async requestWithFallback(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Plus de fallback nécessaire - HTTPS fonctionne sur mobile
    return await this.request(endpoint, options);
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
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
        const jsonData = JSON.parse(text);
        //console.log('[DEBUG] Response data:', jsonData);
        return jsonData;
      } catch (error) {
        console.warn('Failed to parse response as JSON:', text);
        return text;
      }
    } catch (error) {
      console.error('❌ Request failed:', {
        endpoint,
        baseUrl: this.baseUrl,
        fullUrl: `${this.baseUrl}${endpoint}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof TypeError ? 'Network Error (CORS/SSL?)' : 'Other Error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Si c'est une erreur réseau (TypeError), donner plus de détails
      if (error instanceof TypeError) {
        const networkError = new Error(
          `Impossible de joindre l'API, ` +
          `Vérifiez La connexion réseau ou les certificats`
        );
        (networkError as any).originalError = error;
        throw networkError;
      }

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

}

export const api = new ApiService();
