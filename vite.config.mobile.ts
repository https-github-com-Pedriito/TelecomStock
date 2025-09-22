import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration pour développement mobile (HTTP pur)
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['./src/hooks/useAuth.ts'],
  },
  server: {
    port: 5175, // Port différent pour la version mobile
    host: true, // nécessaire pour accéder depuis d'autres appareils
    // Pas de HTTPS pour éviter les problèmes de certificats sur mobile
  },
  define: {
    // Configuration API pour mobile (HTTP)
    __API_PROTOCOL__: JSON.stringify('http'),
    __API_HOST__: JSON.stringify('192.168.1.53'),
    __API_PORT__: JSON.stringify('3080'),
  }
});
