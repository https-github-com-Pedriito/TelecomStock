# 🚀 Guide de déploiement sur Fly.io

## Prérequis

1. **Installer Fly CLI**
   ```bash
   # Windows (PowerShell)
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   
   # Linux/Mac
   curl -L https://fly.io/install.sh | sh
   ```

2. **Se connecter à Fly.io**
   ```bash
   fly auth login
   ```

## Déploiement initial

### 1. Créer l'application

```bash
fly launch
```

Répondez aux questions :
- **App name** : `telecomstock-api` (ou votre choix)
- **Region** : `cdg` (Paris) recommandé
- **PostgreSQL** : Non (vous utilisez déjà votre propre base de données)
- **Redis** : Non

### 2. Configurer les secrets (variables d'environnement)

```bash
# Base de données (OBLIGATOIRE)
fly secrets set DB_HOST=votre-host-postgres
fly secrets set DB_PORT=5432
fly secrets set DB_USER=admin
fly secrets set DB_PASSWORD=votre-mot-de-passe
fly secrets set DB_NAME=telecomstock

# JWT (OBLIGATOIRE)
fly secrets set JWT_SECRET=votre-jwt-secret-super-long-et-securise

# IA Ollama (OPTIONNEL)
fly secrets set AI_PROVIDER=ollama
fly secrets set OLLAMA_HOST=http://votre-serveur-ollama:11434
fly secrets set OLLAMA_MODEL=phi3:3.8b

# Ou IA OpenAI (OPTIONNEL)
fly secrets set AI_PROVIDER=openai
fly secrets set OPENAI_API_KEY=sk-votre-clé-openai
```

### 3. Déployer

```bash
fly deploy
```

### 4. Vérifier le déploiement

```bash
# Voir les logs
fly logs

# Vérifier le statut
fly status

# Ouvrir l'application
fly open

# Accéder à Swagger
fly open /api-docs
```

## Mise à jour de l'application

```bash
# Après modification du code
fly deploy
```

## Gestion des secrets

```bash
# Lister les secrets (noms uniquement, pas les valeurs)
fly secrets list

# Modifier un secret
fly secrets set DB_PASSWORD=nouveau-mot-de-passe

# Supprimer un secret
fly secrets unset NOM_DU_SECRET
```

## Configuration de la base de données

### Option 1 : Utiliser Fly Postgres (recommandé)

```bash
# Créer une base de données PostgreSQL sur Fly
fly postgres create --name telecomstock-db --region cdg

# Attacher la base de données à votre app
fly postgres attach telecomstock-db

# Fly configurera automatiquement DATABASE_URL
# Vous devrez alors modifier src/data-source.ts pour utiliser DATABASE_URL
```

### Option 2 : Base de données externe

Si vous utilisez une base de données externe (Render, Railway, Supabase, etc.), configurez les secrets comme indiqué dans l'étape 2.

## Scaling

```bash
# Définir le nombre d'instances
fly scale count 2

# Définir la taille de la VM
fly scale vm shared-cpu-1x  # 256 MB RAM
fly scale vm shared-cpu-2x  # 512 MB RAM
fly scale vm shared-cpu-4x  # 1 GB RAM
```

## Monitoring

```bash
# Logs en temps réel
fly logs

# Métriques
fly dashboard
```

## Health checks

L'application expose un endpoint `/health` qui est automatiquement vérifié par Fly.io toutes les 30 secondes.

## CORS et domaines personnalisés

### Ajouter un domaine personnalisé

```bash
fly certs add votre-domaine.com
```

Suivez les instructions pour configurer vos DNS.

### Configurer CORS

Modifiez `src/index.ts` pour autoriser votre domaine frontend :

```typescript
const corsOptions = {
  origin: ['https://votre-frontend.com', 'https://www.votre-frontend.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
```

## Dépannage

### Voir les logs d'erreur

```bash
fly logs --tail
```

### Se connecter à la machine

```bash
fly ssh console
```

### Redémarrer l'application

```bash
fly apps restart
```

### Vérifier la configuration

```bash
fly config show
```

## Coûts

- **Machines** : Auto-stop/start inclus (0$ quand inactif)
- **Trafic** : 100 GB/mois gratuit
- **PostgreSQL Fly** : ~5$/mois pour petit volume

Voir les prix détaillés : https://fly.io/docs/about/pricing/

## URLs importantes

- **Dashboard** : https://fly.io/dashboard
- **Documentation** : https://fly.io/docs/
- **API** : `https://votre-app.fly.dev`
- **Swagger** : `https://votre-app.fly.dev/api-docs`

## Support

En cas de problème : https://community.fly.io/
