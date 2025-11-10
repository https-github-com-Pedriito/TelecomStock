import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  // Vite charge automatiquement les variables préfixées par VITE_ depuis le fichier .env
  envPrefix: 'VITE_'
})
