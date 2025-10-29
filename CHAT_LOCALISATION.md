# 💬 Où se trouve le Chat Assistant IA ?

## 🎯 Localisation du Chat

Le chat assistant IA se trouve maintenant sous forme d'un **bouton flottant bleu** en bas à droite de votre écran.

### 📍 Position exacte

```
┌─────────────────────────────────────────┐
│                                         │
│        Votre Interface TelecomStock     │
│                                         │
│                                         │
│                                         │
│                                         │
│                                         │
│                                    [💬] │ ← Bouton bleu rond
│                                         │   (bas à droite)
└─────────────────────────────────────────┘
```

### 🔵 Le bouton ressemble à ça :

- **Forme** : Cercle bleu avec icône de message
- **Couleur** : Dégradé bleu (from-blue-600 to-blue-700)
- **Taille** : 56x56 pixels (assez visible)
- **Position** : 1rem (16px) depuis le bas et la droite
- **Animation** : Point vert qui pulse en haut à droite du bouton
- **Effet hover** : S'agrandit légèrement au survol

### 🎬 Comment l'utiliser

1. **Cliquez sur le bouton bleu** en bas à droite
2. **Le panneau de chat s'ouvre** (396px de large × 600px de haut)
3. **Posez votre question** dans le champ en bas
4. **Fermez** en cliquant sur le ✕ en haut à droite du panneau

### 📱 Sur mobile/tablette

Le chat s'adapte automatiquement :
- Largeur : `max-w-[calc(100vw-2rem)]` (presque plein écran)
- Hauteur : `max-h-[calc(100vh-2rem)]` (presque plein écran)

### 🐛 Si vous ne voyez toujours pas le bouton

#### Étape 1 : Vérifier que vous êtes connecté

Le chat n'apparaît **QUE si vous êtes authentifié**. Sur l'écran de login, il n'y aura pas de bouton.

#### Étape 2 : Rafraîchir la page

Appuyez sur `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac) pour forcer le rechargement.

#### Étape 3 : Vérifier dans la console du navigateur

1. Appuyez sur `F12` pour ouvrir les DevTools
2. Allez dans l'onglet **Console**
3. Cherchez des erreurs en rouge

Si vous voyez une erreur du type :
```
Failed to load module script: Expected a JavaScript module script...
```

Alors faites :

```powershell
cd docker
docker compose restart frontend nginx
```

#### Étape 4 : Vérifier que le frontend est bien reconstruit

```powershell
docker logs telecomstock_frontend --tail 50
```

Vous devriez voir :
```
✓ built in 3m 1s
```

#### Étape 5 : Inspecter l'élément

1. `F12` → Onglet **Elements** (ou **Éléments**)
2. `Ctrl+F` pour chercher dans le HTML
3. Tapez `ChatAssistantWidget`

Si vous trouvez le composant, le bouton existe mais peut-être qu'il est caché par CSS.

### 🔍 Vérification rapide

Ouvrez la console JavaScript (`F12` → Console) et tapez :

```javascript
document.querySelector('button[title="Ouvrir l\'assistant IA"]')
```

Si ça retourne `null`, le composant n'est pas chargé.
Si ça retourne un élément, alors il existe mais peut-être invisible.

### 🎨 Couleurs du bouton

Pour être sûr de le voir :
- **Fond** : Bleu (#2563eb to #1d4ed8)
- **Icône** : Blanc
- **Point vert** : #22c55e (animé)
- **Ombre** : Grande ombre portée (shadow-lg)

### ⚡ Force le rechargement complet

Si vraiment rien ne marche :

```powershell
cd docker
docker compose down
docker compose up -d --build
```

Puis attendez ~3 minutes que le frontend se construise.

### 📸 Capture d'écran attendue

Une fois connecté, vous devriez voir :

```
┌─────────────────────────────────────────┐
│ TelecomStock        [Utilisateur ▼]    │
├─────────────────────────────────────────┤
│ Dashboard / Articles / Mouvements...    │
│                                         │
│    [Vos données de stock ici]          │
│                                         │
│                                         │
│                                    ┏━━━┓│
│                                    ┃💬 ┃│ ← Bouton bleu
│                                    ┗━━━┛│   avec point vert
└─────────────────────────────────────────┘
```

### 🎯 Position Z-Index

Le bouton a `z-50`, donc il devrait être **AU-DESSUS** de tout le reste.

Si un autre élément le cache, vérifiez dans les DevTools les `z-index` des autres éléments.

---

## 🚀 Test rapide

1. Connectez-vous à TelecomStock
2. Regardez en bas à droite
3. Cliquez sur le bouton bleu rond
4. Le panneau devrait s'ouvrir avec le message de bienvenue
5. Tapez "Bonjour" et envoyez

Si ça fonctionne → **Vous êtes prêt !** 🎉

Si ça ne fonctionne pas → Suivez les étapes de débogage ci-dessus.
