# Optimisations Nginx pour Rechargements Rapides

## 🚀 Optimisations Appliquées

### 1. **Keep-Alive & Connexions Persistantes**
- **Upstream avec keep-alive**: 64 connexions vers Vite, 32 vers l'API
- **Évite les reconnexions TLS** à chaque requête (gain: ~100-300ms par requête)
- `keepalive_timeout 65s` + `keepalive_requests 1000`

### 2. **TLS Optimisé pour le Dev**
```nginx
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;  # Évite des lenteurs/alertes
```
- Cache de session TLS partagé (évite handshake complet à chaque requête)
- Pas de OCSP stapling en dev (évite les timeouts DNS/réseau)
- Pas de HSTS (évite que le navigateur force HTTPS en permanence)

### 3. **Buffering Intelligent**
```nginx
proxy_buffering on;
proxy_buffers 32 4k;
```
- Nginx bufferise les réponses pour réduire les TTFB "hachés"
- 32 buffers de 4KB = 128KB total (idéal pour HMR)

### 4. **WebSocket/HMR Optimisé**
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_read_timeout 86400;  # 24h pour HMR
```
- Connexion WebSocket maintenue ouverte pour Hot Module Replacement
- Timeout de 24h pour éviter les déconnexions intempestives

### 5. **Cache Headers pour Dev**
```nginx
# API: pas de cache
Cache-Control "private, no-cache, no-store, must-revalidate"

# Frontend: revalidate immédiat
Cache-Control "private, max-age=0, must-revalidate"
```
- Force le navigateur à revalider à chaque F5
- Évite les contenus "stale" en dev

### 6. **Compression Gzip**
```nginx
gzip on;
gzip_comp_level 5;
gzip_min_length 256;
```
- Compresse JS/CSS/JSON (gain: ~70% de réduction)
- Niveau 5 = bon compromis CPU/compression pour le dev

### 7. **Network Stack Optimisé**
```nginx
sendfile on;
tcp_nopush on;
tcp_nodelay on;
```
- `sendfile`: transfert direct kernel→socket (évite copies en userspace)
- `tcp_nopush`: regroupe les paquets (réduit overhead TCP)
- `tcp_nodelay`: désactive Nagle (réduit latence pour petites requêtes)

## 📊 Gains de Performance Attendus

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| TTFB (Time To First Byte) | ~300-500ms | ~50-100ms | **-70%** |
| Handshake TLS | ~100-300ms | ~0-50ms (cached) | **-80%** |
| Temps de rechargement complet | ~2-3s | ~500ms-1s | **-60%** |
| HMR (Hot Module Reload) | ~500ms-1s | ~100-300ms | **-70%** |

## 🔍 Diagnostic des Lenteurs

### Ouvrir DevTools > Network

1. **Vérifier TTFB (Time To First Byte)**
   - Si élevé dès la 1ère requête → handshake TLS / proxy / DNS
   - Si élevé sur toutes → cache désactivé / keep-alive coupé

2. **Tester le cache TLS**
   - Hard refresh (Ctrl+Shift+R) puis refresh normal (F5)
   - Si le 2e refresh est lent → session TLS pas cachée

3. **Vérifier les connexions**
   - Onglet Network > filter par "All" ou "WS"
   - Les WebSockets doivent rester "Pending" (connexion ouverte)
   - Si elles se ferment/rouvrent → keep-alive coupé

### Logs Nginx

```bash
# Voir les connexions actives
docker exec -it telecomstock_nginx nginx -T | grep keepalive

# Logs en temps réel
docker logs -f telecomstock_nginx

# Statistiques de connexion
docker exec -it telecomstock_nginx cat /var/log/nginx/access.log | tail -100
```

## 🛠️ Alternatives Plus Rapides (Mode Local)

Si Nginx est encore trop lent, tu peux servir directement depuis Vite en HTTPS :

### Option 1: Vite HTTPS natif
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./docker/nginx/certs/privkey.pem'),
      cert: fs.readFileSync('./docker/nginx/certs/fullchain.pem'),
    },
    host: '0.0.0.0',
    port: 5173,
  },
});
```

### Option 2: Accès direct mobile avec IP locale
```bash
# Générer un cert avec l'IP locale
cd docker/nginx/certs
mkcert 192.168.1.49 localhost 127.0.0.1

# Accéder depuis mobile
https://192.168.1.49:5173
```

## 🚨 Pièges à Éviter en Dev

### ❌ Ne JAMAIS activer en dev:
- `Strict-Transport-Security` (HSTS) - force HTTPS permanent
- `ssl_stapling on` sans resolver configuré - timeouts DNS
- `proxy_buffering off` avec HMR - dégrade les perfs
- `Connection: close` - casse le keep-alive

### ✅ Toujours activer:
- `ssl_session_cache` - évite handshakes TLS répétés
- `keepalive` sur les upstreams - garde connexions ouvertes
- `tcp_nodelay` - réduit latence petites requêtes
- `gzip` - réduit bande passante (sauf pour HMR WebSocket)

## 📈 Monitoring

### Mesurer les temps de réponse
```bash
# Temps total requête HTTPS via Nginx
time curl -k https://localhost/api/articles -H "Authorization: Bearer TOKEN"

# Comparer avec accès direct API
time curl http://localhost:3080/api/articles -H "Authorization: Bearer TOKEN"

# DevTools Network tab
# - Blue line = TTFB (serveur)
# - Green line = téléchargement
# - Si Blue domine → problème proxy/TLS
# - Si Green domine → problème réseau/compression
```

## 🔄 Appliquer les Changements

```bash
# Recharger la config Nginx (sans downtime)
docker exec telecomstock_nginx nginx -s reload

# Ou redémarrer le conteneur
docker restart telecomstock_nginx

# Vérifier la syntaxe avant
docker exec telecomstock_nginx nginx -t
```

## 🎯 Checklist Rapide

- [x] Keep-alive activé sur upstreams (64 pour Vite, 32 pour API)
- [x] TLS session cache configuré (10m shared)
- [x] OCSP stapling désactivé (évite timeouts en dev)
- [x] Pas de HSTS (évite comportement forcé du navigateur)
- [x] Buffering activé (32x4k buffers)
- [x] WebSocket timeout élevé (86400s = 24h)
- [x] Gzip activé niveau 5
- [x] Cache-Control dev-friendly (max-age=0)
- [x] tcp_nodelay + tcp_nopush + sendfile activés
- [x] keepalive_timeout 65s + 1000 requêtes

## 📚 Ressources

- [Nginx Keep-Alive](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)
- [TLS Session Resumption](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_session_cache)
- [Proxy Buffering](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_buffering)
- [WebSocket Proxying](https://nginx.org/en/docs/http/websocket.html)
