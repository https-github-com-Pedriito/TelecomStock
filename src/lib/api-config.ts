// Configuration API dynamique avec auto-détection et fallback

interface UrlConfig {
  url: string;
  ip: string;
  type: 'primary' | 'fallback' | 'http-fallback';
  protocol: 'https' | 'http';
}

interface HealthStatus {
  healthy: boolean;
  timestamp: number;
  status?: number;
  error?: string;
}

class ApiConfigManager {
  private baseUrls: UrlConfig[];
  private currentUrl: UrlConfig | null;
  private fallbackIndex: number;
  private healthCheckCache: Map<string, HealthStatus>;
  private healthCheckTimeout: number;

  constructor() {
    this.baseUrls = this.getConfiguredUrls();
    this.currentUrl = null;
    this.fallbackIndex = 0;
    this.healthCheckCache = new Map();
    this.healthCheckTimeout = 5000; // 5 secondes
  }

  // Récupérer les URLs configurées depuis l'environnement
  getConfiguredUrls(): UrlConfig[] {
    const primaryIP = import.meta.env.VITE_PRIMARY_IP;
    const fallbackIPs = import.meta.env.VITE_FALLBACK_IPS?.split(',') || [];
    
    // Construction des URLs avec priorité
    const urls: UrlConfig[] = [];
    
    // URL principale si définie
    if (primaryIP) {
      urls.push({
        url: `https://${primaryIP}:3443`,
        ip: primaryIP,
        type: 'primary',
        protocol: 'https'
      });
    }
    
    // URLs de fallback
    if (fallbackIPs.length > 0) {
      fallbackIPs.forEach((ip: string) => {
        if (ip && ip !== primaryIP) {
          urls.push({
            url: `https://${ip}:3443`,
            ip: ip,
            type: 'fallback',
            protocol: 'https'
          });
        }
      });
    }
    
    // Fallback vers les URLs par défaut si aucune IP configurée
    if (urls.length === 0) {
      const defaultUrls = [
        'https://192.168.1.46:3443',
        'https://172.24.112.1:3443',
        'https://localhost:3443'
      ];
      
      defaultUrls.forEach((url, index) => {
        const match = url.match(/(\d+\.\d+\.\d+\.\d+|localhost)/);
        const ip = match ? match[0] : 'localhost';
        urls.push({
          url,
          ip,
          type: index === 0 ? 'primary' : 'fallback',
          protocol: 'https'
        });
      });
    }
    
    // Ajouter les variantes HTTP pour chaque IP (fallback mobile)
    const httpsUrls = [...urls];
    httpsUrls.forEach(config => {
      if (config.protocol === 'https') {
        urls.push({
          url: `http://${config.ip}:3080`,
          ip: config.ip,
          type: 'http-fallback',
          protocol: 'http'
        });
      }
    });
    
    return urls;
  }

  // Test de santé d'une URL
  async healthCheck(urlConfig: UrlConfig, useCache = true): Promise<boolean> {
    const cacheKey = urlConfig.url;
    
    if (useCache && this.healthCheckCache.has(cacheKey)) {
      const cached = this.healthCheckCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 30000) { // Cache 30s
        return cached.healthy;
      }
    }

    try {
      console.log(`🔍 Test de santé: ${urlConfig.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);

      const response = await fetch(`${urlConfig.url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      const healthy = response.ok;
      this.healthCheckCache.set(cacheKey, {
        healthy,
        timestamp: Date.now(),
        status: response.status
      });

      console.log(`${healthy ? '✅' : '❌'} ${urlConfig.url} - Status: ${response.status}`);
      return healthy;
      
    } catch (error: any) {
      console.log(`❌ ${urlConfig.url} - Erreur: ${error?.message || 'Erreur inconnue'}`);
      
      this.healthCheckCache.set(cacheKey, {
        healthy: false,
        timestamp: Date.now(),
        error: error?.message || 'Erreur inconnue'
      });
      
      return false;
    }
  }

  // Trouver la meilleure URL disponible
  async findBestUrl(): Promise<UrlConfig | null> {
    console.log('🔍 Recherche de la meilleure API URL...');
    
    // Tester les URLs par ordre de priorité
    for (const urlConfig of this.baseUrls) {
      const healthy = await this.healthCheck(urlConfig, false);
      if (healthy) {
        console.log(`🎯 URL sélectionnée: ${urlConfig.url} (${urlConfig.type})`);
        this.currentUrl = urlConfig;
        return urlConfig;
      }
    }
    
    // Aucune URL disponible
    console.warn('⚠️ Aucune API URL disponible');
    return null;
  }

  // Obtenir l'URL actuelle ou la détecter
  async getCurrentUrl(): Promise<UrlConfig | null> {
    if (!this.currentUrl) {
      this.currentUrl = await this.findBestUrl();
    }
    return this.currentUrl;
  }

  // Basculer vers l'URL suivante en cas d'erreur
  async switchToNextUrl(): Promise<UrlConfig | null> {
    console.log('🔄 Basculement vers l\'URL de fallback...');
    
    if (!this.currentUrl) {
      return await this.findBestUrl();
    }
    
    const currentIndex = this.baseUrls.findIndex(config => 
      config.url === this.currentUrl?.url
    );
    
    // Essayer les URLs suivantes
    for (let i = 1; i < this.baseUrls.length; i++) {
      const nextIndex = (currentIndex + i) % this.baseUrls.length;
      const nextConfig = this.baseUrls[nextIndex];
      
      const healthy = await this.healthCheck(nextConfig, false);
      if (healthy) {
        console.log(`🔄 Basculement vers: ${nextConfig.url}`);
        this.currentUrl = nextConfig;
        return nextConfig;
      }
    }
    
    console.warn('⚠️ Aucune URL de fallback disponible');
    return null;
  }

  // Réinitialiser le cache et forcer une nouvelle détection
  reset() {
    this.healthCheckCache.clear();
    this.currentUrl = null;
    this.fallbackIndex = 0;
  }

  // Obtenir des informations de débogage
  getDebugInfo() {
    return {
      configuredUrls: this.baseUrls,
      currentUrl: this.currentUrl,
      healthCache: Array.from(this.healthCheckCache.entries()),
      environment: {
        primaryIP: import.meta.env.VITE_PRIMARY_IP,
        fallbackIPs: import.meta.env.VITE_FALLBACK_IPS,
        allIPs: import.meta.env.VITE_ALL_IPS,
        usagePattern: import.meta.env.VITE_USAGE_PATTERN
      }
    };
  }
}

// Instance globale
const apiConfigManager = new ApiConfigManager();

// Fonction helper pour obtenir l'URL API
export async function getApiUrl() {
  const config = await apiConfigManager.getCurrentUrl();
  return config ? config.url : null;
}

// Fonction helper pour basculer en cas d'erreur
export async function switchApiUrl() {
  const config = await apiConfigManager.switchToNextUrl();
  return config ? config.url : null;
}

// Fonction helper pour réinitialiser
export function resetApiConfig() {
  apiConfigManager.reset();
}

// Fonction helper pour le débogage
export function getApiDebugInfo() {
  return apiConfigManager.getDebugInfo();
}

export default apiConfigManager;