import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Configuration des certificats
function getHttpsConfig() {
  try {
    console.log('🔐 Chargement des certificats SSL...');
    return {
      key: fs.readFileSync('./192.168.1.46-key.pem'),
      cert: fs.readFileSync('./192.168.1.46.pem'),
    };
  } catch (error: any) {
    console.warn('⚠️ Certificats principaux non trouvés. Exécutez: npm run cert:generate');
    
    // Fallback vers les anciens certificats si disponibles
    const fallbackCerts = ['192.168.1.53+2.pem', 'localhost+2.pem', 'localhost+1.pem'];
    for (const fallbackCert of fallbackCerts) {
      const fallbackKey = fallbackCert.replace('.pem', '-key.pem');
      if (fs.existsSync(fallbackCert) && fs.existsSync(fallbackKey)) {
        console.log(`🔄 Utilisation du certificat de fallback: ${fallbackCert}`);
        return {
          key: fs.readFileSync(fallbackKey),
          cert: fs.readFileSync(fallbackCert),
        };
      }
    }
    
    throw new Error('❌ Aucun certificat SSL disponible. Exécutez: npm run cert:generate');
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['./src/hooks/useAuth.ts'],
  },
  server: {
    port: 5173,
    host: true, // nécessaire pour accéder depuis d'autres appareils
    https: getHttpsConfig(),
  },
  define: {
    // Configuration API HTTPS pour tous les environnements
    // L'API doit être accessible depuis le réseau Wi-Fi pour les mobiles
    'import.meta.env.VITE_API_URL': '"https://192.168.1.46:3443"',
    'import.meta.env.VITE_API_URL_HTTPS': '"https://192.168.1.46:3443"',
  }
});
