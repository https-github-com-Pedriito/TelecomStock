import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Configuration hybride : HTTPS frontend + HTTP API
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync('192.168.1.46-key.pem'),
      cert: fs.readFileSync('192.168.1.46.pem'),
    }
  },
  define: {
    // API en HTTPS - les logs montrent que ça marche !
    'import.meta.env.VITE_API_URL': '"https://192.168.1.46:3443"',
    'import.meta.env.VITE_API_URL_HTTPS': '"https://192.168.1.46:3443"',
  }
})
