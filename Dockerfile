# Dockerfile optimisé pour Fly.io
FROM node:18-alpine AS builder

# Installer les dépendances système nécessaires pour les packages natifs
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./

# Installer les dépendances
RUN npm ci --only=production && \
    npm cache clean --force

# Copier le code source
COPY src ./src

# Compiler TypeScript
RUN npm run build

# Stage de production
FROM node:18-alpine

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier node_modules et le code compilé depuis le builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port (Fly.io utilise le port 8080 par défaut)
EXPOSE 8080

# Variables d'environnement par défaut (peuvent être surchargées par Fly.io)
ENV NODE_ENV=production
ENV PORT=8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer l'application
CMD ["node", "dist/index.js"]
