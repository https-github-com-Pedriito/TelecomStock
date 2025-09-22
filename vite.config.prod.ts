import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration for production deployment on Render
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['./src/hooks/useAuth.ts'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'react-toastify'],
        },
      },
    },
  },
  define: {
    // Use environment variable for API URL in production
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'import.meta.env.VITE_API_URL_HTTPS': JSON.stringify(process.env.VITE_API_URL || ''),
  },
});