# Test de l'Assistant IA avec Ollama

## ✅ Installation réussie !

Votre assistant IA TelecomStock fonctionne maintenant avec **Ollama et Llama 3.2** (100% gratuit et local).

### 🧪 Tests de validation

1. **✅ Ollama démarré** : Container `telecomstock_ollama` actif
2. **✅ Modèle téléchargé** : `llama3.2:latest` (2.0 GB)
3. **✅ Test en français** : Répond correctement
4. **✅ API backend** : Configurée pour utiliser Ollama par défaut
5. **✅ Erreurs TypeScript** : Toutes corrigées

### 🎯 Comment tester l'assistant maintenant

#### Option 1 : Via l'interface web (recommandé)

1. Ouvrez TelecomStock dans votre navigateur : `https://localhost` ou `http://localhost`
2. Connectez-vous avec vos identifiants
3. Le chat assistant apparaît en bas à droite de l'écran
4. Posez une question, par exemple :
   - "Quels articles sont en stock ?"
   - "Combien d'articles avons-nous ?"
   - "Liste les mouvements récents"

#### Option 2 : Test API direct (pour debugging)

```powershell
# Obtenir un token JWT (remplacez user/password par vos vraies credentials)
$token = (Invoke-RestMethod -Uri "https://localhost:3443/auth/login" -Method POST -Body (@{username="admin"; password="admin"} | ConvertTo-Json) -ContentType "application/json" -SkipCertificateCheck).token

# Tester l'assistant
$headers = @{ Authorization = "Bearer $token" }
$body = @{ question = "Combien d'articles avons-nous en stock ?" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://localhost:3443/assistant/chat" -Method POST -Headers $headers -Body $body -ContentType "application/json" -SkipCertificateCheck
```

### 📊 Comparaison de votre setup actuel

| Composant | État | Configuration |
|-----------|------|---------------|
| **Provider IA** | ✅ Ollama | Local, gratuit |
| **Modèle** | ✅ Llama 3.2 | 2 GB, rapide |
| **Coût** | 💚 **0€** | Illimité |
| **Vie privée** | 💚 **100% local** | Données sécurisées |
| **Vitesse** | 🟢 Bonne | ~2-5s par réponse (CPU) |

### 🚀 Commandes utiles

```powershell
# Voir les logs de l'API (pour debug)
docker logs -f telecomstock_api

# Voir les logs Ollama
docker logs -f telecomstock_ollama

# Tester directement Ollama
docker exec -it telecomstock_ollama ollama run llama3.2 "Résume-moi l'état du stock"

# Redémarrer l'API si besoin
docker compose restart api

# Tester un autre modèle (optionnel)
docker exec -it telecomstock_ollama ollama pull mistral
# Puis éditez docker/.env : OLLAMA_MODEL=mistral
# Et redémarrez : docker compose restart api
```

### 🎨 Personnalisation

#### Changer de modèle

Éditez `docker/.env` :

```env
OLLAMA_MODEL=mistral  # ou phi3, qwen2.5, etc.
```

Puis :

```powershell
docker compose restart api
```

#### Revenir à OpenAI

Si vous voulez tester OpenAI (nécessite clé API payante) :

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-votre-cle-ici
```

### 🐛 Si l'assistant ne répond pas

1. Vérifiez que l'API tourne :
   ```powershell
   docker ps
   ```

2. Vérifiez les logs :
   ```powershell
   docker logs telecomstock_api
   ```

3. Testez la santé de l'assistant :
   ```powershell
   curl https://localhost:3443/assistant/health -k
   ```

4. Assurez-vous qu'Ollama est accessible :
   ```powershell
   curl http://localhost:11434/api/tags
   ```

### ✨ Félicitations !

Vous avez maintenant un **assistant IA totalement gratuit et privé** pour gérer votre stock TelecomStock ! 🎉

---

**Note** : Le premier appel peut être un peu plus lent (chargement du modèle en mémoire), les suivants seront beaucoup plus rapides.
