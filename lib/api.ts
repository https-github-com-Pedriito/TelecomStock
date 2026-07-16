'use client';

import { User } from '@/types';
import { logger, logApiRequest } from '@/lib/logger';
import { getToken, setToken, clearToken } from '@/lib/tokenManager';

class ApiService {
  private baseUrl = '/api';
  private token: string | null;

  constructor() {
    this.token = getToken();
  }

  private inFlightRequests: Map<string, Promise<any>> = new Map();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 500;

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const isGet = !options.method || options.method === 'GET';
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;

    if (isGet) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.data;
    }

    if (this.inFlightRequests.has(cacheKey)) return this.inFlightRequests.get(cacheKey);

    const requestPromise = (async () => {
      try {
        const token = getToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        };

        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[API] Raw error response:', errorText.slice(0, 500));
          let errorData;
          try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText || `Erreur HTTP ${response.status}` }; }
          if (response.status === 402 && errorData.code === 'SUBSCRIPTION_INACTIVE') {
            window.dispatchEvent(new CustomEvent('subscription-inactive'));
          }
          const error = new Error(errorData.message || errorData.stack || 'Une erreur est survenue');
          (error as any).response = { status: response.status, data: errorData };
          throw error;
        }

        if (response.status === 204) return null;
        const text = await response.text();
        if (!text || text.trim() === '') return null;

        try {
          const jsonData = JSON.parse(text);
          if (isGet) this.cache.set(cacheKey, { data: jsonData, timestamp: Date.now() });
          return jsonData;
        } catch { return text; }
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.token = response.token;
    setToken(response.token);
    return response;
  }

  async get<T>(endpoint: string) { return this.request(endpoint) as Promise<T>; }
  async post<T>(endpoint: string, data: any) {
    logApiRequest('POST', endpoint, data);
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }) as Promise<T>;
  }
  async put<T>(endpoint: string, data: any) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }) as Promise<T>; }
  async delete(endpoint: string) { return this.request(endpoint, { method: 'DELETE' }); }

  async logout() { this.token = null; clearToken(); }
  async getProfile() { return this.request('/auth/profile'); }
  async forgotPassword(email: string) { return this.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }

  async getTenantInfo() { return this.request('/tenant'); }
  async getBillingPortalUrl(): Promise<{ url: string }> { return this.request('/stripe/portal'); }

  async getAllUsers() { return this.request('/admin/users'); }
  async assignUserToTenant(userId: string, tenantId: string | null) {
    return this.request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify({ tenant_id: tenantId }) });
  }

  async getUsers() { return this.request('/users'); }
  async updateUser(id: string, data: Partial<User>) { return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteUser(id: string) { return this.request(`/users/${id}`, { method: 'DELETE' }); }
  async createUser(data: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    return this.request('/users', { method: 'POST', body: JSON.stringify({ ...data, role: data.role.toUpperCase() }) });
  }

  async getTenantUsers(tenantId: string) { return this.request(`/admin/tenants/${tenantId}/users`); }
  async createTenantUser(tenantId: string, data: { nom: string; prenom: string; email: string; role: string; is_active?: boolean }) {
    return this.request(`/admin/tenants/${tenantId}/users`, { method: 'POST', body: JSON.stringify(data) });
  }

  async getArticles() { return this.request('/articles'); }

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const token = getToken();
    const response = await fetch(`${this.baseUrl}/articles/upload-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erreur lors de l'upload" }));
      throw new Error(errorData.message);
    }
    return response.json();
  }

  async createArticle(article: any) { return this.request('/articles', { method: 'POST', body: JSON.stringify(article) }); }
  async updateArticle(id: string, article: any) { return this.request(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(article) }); }
  async deleteArticle(id: string) { return this.request(`/articles/${id}`, { method: 'DELETE' }); }
  async handleForceDeleteArticle(id: string) { return this.request(`/articles/${id}?force=true`, { method: 'DELETE' }); }

  async getMouvements() { return this.request('/mouvements'); }
  async createMouvement(mouvement: any) { return this.request('/mouvements', { method: 'POST', body: JSON.stringify(mouvement) }); }
  async deleteMouvement(id: string) { return this.request(`/mouvements/${id}`, { method: 'DELETE' }); }

  async getInventaires() { return this.request('/inventaires'); }
  async getCurrentInventaire() { return this.request('/inventaires/current'); }
  async createInventaire(inventaire: any) { return this.request('/inventaires', { method: 'POST', body: JSON.stringify(inventaire) }); }
  async getInventaire(id: string) { return this.request(`/inventaires/${id}`); }
  async getInventaireEntries(id: string) { return this.request(`/inventaires/${id}/entries`); }
  async addInventaireEntry(inventaireId: string, entry: any) { return this.request(`/inventaires/${inventaireId}/entries`, { method: 'POST', body: JSON.stringify(entry) }); }
  async finalizeInventaire(id: string) { return this.request(`/inventaires/${id}/finalize`, { method: 'PUT' }); }
  async deleteInventaireEntry(inventaireId: string, entryId: string) { return this.request(`/inventaires/${inventaireId}/entries/${entryId}`, { method: 'DELETE' }); }

  async getLocalisations() { return this.request('/localisations'); }
  async getLocalisation(id: string) { return this.request(`/localisations/${id}`); }
  async createLocalisation(localisation: any) { return this.request('/localisations', { method: 'POST', body: JSON.stringify(localisation) }); }
  async updateLocalisation(id: string, localisation: any) { return this.request(`/localisations/${id}`, { method: 'PUT', body: JSON.stringify(localisation) }); }
  async deleteLocalisation(id: string) { return this.request(`/localisations/${id}`, { method: 'DELETE' }); }

  async getFournisseurs() { return this.request('/fournisseurs'); }
  async getFournisseur(id: string) { return this.request(`/fournisseurs/${id}`); }
  async createFournisseur(fournisseur: any) { return this.request('/fournisseurs', { method: 'POST', body: JSON.stringify(fournisseur) }); }
  async updateFournisseur(id: string, fournisseur: any) { return this.request(`/fournisseurs/${id}`, { method: 'PUT', body: JSON.stringify(fournisseur) }); }
  async deleteFournisseur(id: string) { return this.request(`/fournisseurs/${id}`, { method: 'DELETE' }); }

  async changePassword(oldPassword: string, newPassword: string) { return this.request('/auth/change-password', { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) }); }
}

export const api = new ApiService();
