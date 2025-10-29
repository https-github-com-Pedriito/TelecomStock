²# Assistant IA de Stock TelecomStock

## 🤖 Aperçu

L'assistant IA est un chatbot intelligent intégré à TelecomStock qui peut répondre aux questions sur l'état du stock en consultant directement la base de données en temps réel.

## ✨ Fonctionnalités

- **Consultation du stock** : Informations sur les articles, quantités, localisations
- **Alertes intelligentes** : Identification des articles en stock faible
- **Analyse des mouvements** : Historique et tendances des entrées/sorties
- **Informations fournisseurs** : Liste et détails des fournisseurs actifs
- **Statistiques** : Vue d'ensemble et métriques globales

## 🚀 Configuration

### 1. Obtenir une clé API OpenAI

1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
2. Naviguez vers [API Keys](https://platform.openai.com/api-keys)
3. Cliquez sur "Create new secret key"
4. Copiez la clé générée

### 2. Configurer la clé API

Créez un fichier `.env` dans le dossier `docker/` :

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
```

Ou exportez la variable d'environnement :

**Windows (PowerShell)** :
```powershell
$env:OPENAI_API_KEY="sk-your-actual-api-key-here"
```

**Linux/Mac** :
```bash
export OPENAI_API_KEY="sk-your-actual-api-key-here"
```

### 3. Redémarrer les services

```bash
cd docker
docker compose down
docker compose up --build -d
```

## 💬 Utilisation

Une fois connecté à TelecomStock, le chat assistant apparaît en bas à droite de l'interface.

### Exemples de questions

- "Quels articles sont en alerte de stock ?"
- "Quel est l'état global du stock ?"
- "Liste des derniers mouvements"
- "Combien d'articles avons-nous en stock ?"
- "Quels sont les fournisseurs actifs ?"
- "Combien d'unités de [nom d'article] reste-t-il ?"

## 🔧 Architecture Technique

### Backend (`api/src/`)

- **`services/stock-assistant.ts`** : Service principal qui :
  - Interroge la base de données TypeORM
  - Construit le contexte pour l'IA
  - Communique avec l'API OpenAI
  - Supporte le streaming pour les réponses en temps réel

- **`routes/assistant.ts`** : Endpoints REST :
  - `POST /assistant/chat` : Envoie une question, reçoit une réponse
  - `POST /assistant/stream` : Streaming Server-Sent Events
  - `GET /assistant/health` : Vérifie la configuration

### Frontend (`src/components/`)

- **`StockChatAssistant.tsx`** : Interface utilisateur du chat
  - Messages utilisateur/assistant
  - Indicateurs de chargement
  - Questions suggérées
  - Gestion d'erreurs

## 📊 Données Consultées

L'assistant a accès aux informations suivantes :

- **Articles** : Nom, référence, quantité, seuil d'alerte, fournisseur, localisation
- **Mouvements** : Type, quantité, date, utilisateur, commentaires
- **Fournisseurs** : Nom, contact, email, statut
- **Localisations** : Nom, type, description
- **Statistiques** : Totaux, alertes, agrégations

## 🔐 Sécurité

- L'accès à l'assistant nécessite une authentification
- La clé API OpenAI doit être stockée de manière sécurisée
- Les données de la base ne sont jamais envoyées à OpenAI de manière persistante
- Chaque requête construit un contexte temporaire

## 💰 Coûts

L'assistant utilise le modèle `gpt-4o-mini` d'OpenAI :

- ~$0.15 / 1M tokens d'entrée
- ~$0.60 / 1M tokens de sortie

Estimation : **~$0.01-0.05 par conversation** selon la complexité.

## 🛠️ Personnalisation

### Changer le modèle IA

Éditez `api/src/services/stock-assistant.ts` :

```typescript
model: 'gpt-4o-mini', // ou 'gpt-4', 'gpt-4-turbo', etc.
```

### Ajuster le contexte

Modifiez `gatherStockContext()` pour inclure ou exclure des données.

### Limiter le nombre d'articles

Ajustez le paramètre `take` dans les requêtes TypeORM :

```typescript
const articles = await articleRepo.find({
  relations: ['fournisseur', 'localisation'],
  take: 50 // au lieu de 100
});
```

## 🐛 Dépannage

### "Assistant IA non configuré"

- Vérifiez que `OPENAI_API_KEY` est défini dans `.env`
- Redémarrez les conteneurs Docker
- Vérifiez les logs : `docker compose logs api`

### Réponses lentes

- Le modèle `gpt-4` est plus lent mais plus précis
- `gpt-4o-mini` est plus rapide et moins cher
- Utilisez le streaming pour une meilleure UX

### Erreur "Rate limit exceeded"

- Vous avez dépassé les limites de votre compte OpenAI
- Attendez quelques secondes ou upgradez votre plan

## 📝 TODO / Améliorations futures

- [ ] Mode streaming dans l'UI pour réponses en temps réel
- [ ] Historique des conversations (stockage local/DB)
- [ ] Commandes spéciales (ex: `/stats`, `/alerts`)
- [ ] Support multi-langue
- [ ] Intégration avec d'autres LLM (Claude, Mistral)
- [ ] Feedback utilisateur sur les réponses
- [ ] Cache intelligent pour réduire les coûts API

## 📄 Licence

Partie intégrante de TelecomStock - Même licence que le projet principal.
