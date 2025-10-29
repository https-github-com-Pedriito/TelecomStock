# Guide de Configuration - IA Locale avec Ollama

## ✅ Avantages d'Ollama (modèle local)

- **100% Gratuit** - Aucun coût API
- **Privé** - Vos données restent sur votre machine
- **Pas de limite** - Utilisez autant que vous voulez
- **Offline** - Fonctionne sans connexion internet
- **Performant** - Rapide si vous avez un bon CPU/GPU

## 🚀 Démarrage Rapide

### 1. Démarrer les services

```powershell
cd docker
docker compose up -d
```

Cela va :
- Télécharger l'image Ollama
- Démarrer le conteneur
- Configurer l'API pour utiliser Ollama par défaut

### 2. Télécharger un modèle IA

Entrez dans le conteneur Ollama :

```powershell
docker exec -it telecomstock_ollama ollama pull llama3.2
```

**Modèles recommandés :**

| Modèle | Taille | Qualité | Vitesse | Recommandé pour |
|--------|--------|---------|---------|-----------------|
| `llama3.2` | 2GB | ⭐⭐⭐⭐ | 🚀🚀🚀 | **Meilleur choix** - Rapide et précis |
| `llama3.1` | 4.7GB | ⭐⭐⭐⭐⭐ | 🚀🚀 | Plus précis mais plus lent |
| `mistral` | 4.1GB | ⭐⭐⭐⭐ | 🚀🚀🚀 | Excellent alternatif |
| `phi3` | 2.3GB | ⭐⭐⭐ | 🚀🚀🚀🚀 | Ultra rapide, bonne qualité |
| `qwen2.5` | 4.7GB | ⭐⭐⭐⭐⭐ | 🚀🚀 | Excellent pour le français |

### 3. Tester l'assistant

L'assistant devrait maintenant fonctionner automatiquement avec le modèle local !

## ⚙️ Configuration Avancée

### Changer de modèle

Éditez `docker/.env` :

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=mistral
```

Puis redémarrez :

```powershell
docker compose restart api
```

### Utiliser OpenAI au lieu d'Ollama

Si vous préférez utiliser OpenAI (payant mais plus puissant) :

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-votre-cle-ici
```

### Support GPU (optionnel)

Pour accélérer les réponses avec une carte NVIDIA :

1. Installez [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

2. Décommentez dans `docker-compose.yml` :

```yaml
ollama:
  image: ollama/ollama:latest
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

3. Redémarrez :

```powershell
docker compose down
docker compose up -d
```

## 🐛 Dépannage

### "Model not found"

Téléchargez le modèle :

```powershell
docker exec -it telecomstock_ollama ollama pull llama3.2
```

### Réponses trop lentes

1. Utilisez un modèle plus petit (`phi3`)
2. Activez le GPU si vous en avez un
3. Augmentez la RAM allouée à Docker (Docker Desktop → Settings → Resources)

### Vérifier que Ollama fonctionne

```powershell
docker exec -it telecomstock_ollama ollama list
```

Devrait afficher les modèles téléchargés.

### Tester manuellement Ollama

```powershell
docker exec -it telecomstock_ollama ollama run llama3.2 "Bonjour, comment vas-tu ?"
```

## 📊 Comparaison Ollama vs OpenAI

| Critère | Ollama (Local) | OpenAI (Cloud) |
|---------|----------------|----------------|
| **Coût** | 💚 Gratuit | 💰 ~$0.01-0.05/conversation |
| **Vitesse** | 🟡 Variable (CPU/GPU) | 🟢 Rapide (~2-3s) |
| **Qualité** | 🟡 Bonne (dépend du modèle) | 🟢 Excellente |
| **Vie privée** | 💚 100% privé | 🟡 Données envoyées à OpenAI |
| **Connexion** | 💚 Fonctionne offline | 🔴 Nécessite internet |
| **Configuration** | 🟡 Téléchargement initial | 🟢 Clé API seulement |

## 💡 Astuces

### Lister les modèles disponibles

```powershell
docker exec -it telecomstock_ollama ollama list
```

### Supprimer un modèle

```powershell
docker exec -it telecomstock_ollama ollama rm mistral
```

### Voir les logs Ollama

```powershell
docker logs telecomstock_ollama
```

### Tester différents modèles facilement

Sans redémarrer, changez juste la variable :

```powershell
$env:OLLAMA_MODEL="phi3"
docker compose restart api
```

## 🎯 Modèles recommandés par usage

- **Meilleur équilibre** : `llama3.2` (2GB)
- **Maximum de qualité** : `qwen2.5` ou `llama3.1` (4.7GB)
- **Rapidité maximale** : `phi3` (2.3GB)
- **Peu de RAM disponible** : `tinyllama` (637MB) - qualité moindre

## 📖 Ressources

- [Bibliothèque de modèles Ollama](https://ollama.com/library)
- [Documentation Ollama](https://github.com/ollama/ollama)
- [Comparer les modèles](https://ollama.com/search)

---

**Par défaut, TelecomStock utilise Ollama avec le modèle `llama3.2` - gratuit et performant !** 🚀
