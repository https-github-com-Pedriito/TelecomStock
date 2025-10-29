# 🔧 Dépannage - Assistant IA "Non configuré"

## ❌ Problème : "Impossible de vérifier la configuration de l'assistant"

### 🎯 Solution rapide

```powershell
cd docker
docker compose restart api
```

Puis **rafraîchissez votre navigateur** (`Ctrl+F5`).

---

## 📋 Checklist complète

### 1️⃣ Vérifier qu'Ollama tourne

```powershell
docker ps | findstr ollama
```

✅ Devrait afficher : `telecomstock_ollama`

### 2️⃣ Vérifier que le modèle est téléchargé

```powershell
docker exec -it telecomstock_ollama ollama list
```

✅ Devrait afficher : `llama3.2:latest    a80c4f17acd5    2.0 GB`

### 3️⃣ Vérifier que l'API peut joindre Ollama

```powershell
docker network inspect docker_telecomstock_network --format '{{range .Containers}}{{.Name}} {{end}}'
```

✅ Devrait afficher à la fois `telecomstock_api` et `telecomstock_ollama`

### 4️⃣ Redémarrer l'API

```powershell
cd docker
docker compose restart api
```

Attendez 5-10 secondes que l'API redémarre.

### 5️⃣ Vérifier les logs de l'API

```powershell
docker logs telecomstock_api --tail 20
```

✅ Devrait afficher :
```
✅ HTTPS Server running on port 3443
```

### 6️⃣ Rafraîchir le navigateur

Appuyez sur `Ctrl+F5` pour forcer le rechargement.

---

## 🧪 Test manuel de l'assistant

Une fois l'API redémarrée :

1. Ouvrez le chat (bouton bleu en bas à droite)
2. Le statut devrait passer de "Vérification..." à "En ligne"
3. Tapez "Bonjour" et envoyez

---

## 🐛 Si ça ne fonctionne toujours pas

### Vérifier la variable d'environnement

```powershell
cat docker/.env
```

Devrait contenir :
```
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

### Redémarrer TOUS les services

```powershell
cd docker
docker compose down
docker compose up -d
```

Attendez 30 secondes, puis rafraîchissez le navigateur.

### Vérifier les logs Ollama

```powershell
docker logs telecomstock_ollama --tail 30
```

### Test direct d'Ollama

```powershell
docker exec -it telecomstock_ollama ollama run llama3.2 "Test"
```

Si ça fonctionne, Ollama marche. Le problème est la communication entre l'API et Ollama.

---

## 💡 Pourquoi ça arrive ?

L'API démarre parfois **avant** qu'Ollama soit complètement prêt. Dans ce cas, l'initialisation du client Ollama échoue.

**Solution** : Redémarrer l'API après qu'Ollama soit opérationnel.

---

## ✅ Statuts possibles

| Statut | Signification | Action |
|--------|---------------|--------|
| **Vérification...** | Le frontend teste la connexion | Attendre 2-3 secondes |
| **En ligne** ✅ | Tout fonctionne ! | Posez une question |
| **Non configuré** ⚠️ | L'API ne peut pas joindre Ollama | Redémarrer l'API |
| **Service indisponible** ❌ | L'API est down | Vérifier `docker ps` |

---

## 🚀 Commande miracle

Si vraiment rien ne marche :

```powershell
cd docker
docker compose down
docker compose up -d --build
# Attendez 3 minutes
docker compose restart api
# Attendez 10 secondes
# Rafraîchissez le navigateur (Ctrl+F5)
```

---

## 📞 Dernière option : Tester avec OpenAI

Si vous avez une clé API OpenAI, éditez `docker/.env` :

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-votre-cle-ici
```

Puis :

```powershell
docker compose restart api
```

L'assistant utilisera OpenAI au lieu d'Ollama (payant mais plus fiable).

---

## ✨ Une fois que ça fonctionne

Le statut devrait afficher "En ligne" avec une coche verte ✅.

Vous pourrez alors poser des questions comme :
- "Combien d'articles en stock ?"
- "Liste les alertes"
- "Résume l'état du stock"
