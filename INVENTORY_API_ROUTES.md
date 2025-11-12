# Routes API Inventaire - Documentation

## 📋 Routes Disponibles

Toutes les routes requièrent une authentification via Bearer Token.

### 1. **GET** `/inventaires`
- **Description**: Récupérer tous les inventaires
- **Authentification**: Requise
- **Réponse**: Liste des inventaires avec relations (created_by, finalized_by)

### 2. **POST** `/inventaires`
- **Description**: Créer un nouvel inventaire
- **Authentification**: Requise
- **Body**:
  ```json
  {
    "nom": "Inventaire Novembre 2025",
    "description": "Inventaire mensuel",
    "mois": 11,
    "annee": 2025
  }
  ```
- **Validation**: Vérifie qu'aucun inventaire n'est déjà EN_COURS
- **Réponse**: Inventaire créé avec statut EN_COURS

### 3. **GET** `/inventaires/current`
- **Description**: Récupérer l'inventaire actuellement en cours
- **Authentification**: Requise
- **Réponse**: Inventaire avec statut EN_COURS ou null

### 4. **GET** `/inventaires/{id}`
- **Description**: Récupérer un inventaire spécifique
- **Authentification**: Requise
- **Paramètres**: `id` (UUID)
- **Réponse**: Inventaire avec relations complètes

### 5. **GET** `/inventaires/{id}/entries`
- **Description**: Récupérer toutes les entrées d'un inventaire
- **Authentification**: Requise
- **Paramètres**: `id` (UUID de l'inventaire)
- **Réponse**: Liste des entrées avec relations (article, utilisateur)
- **Tri**: Par date de création (DESC)

### 6. **POST** `/inventaires/{id}/entries`
- **Description**: Ajouter ou mettre à jour une entrée d'inventaire
- **Authentification**: Requise
- **Paramètres**: `id` (UUID de l'inventaire)
- **Body**:
  ```json
  {
    "article_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantite_comptee": 25,
    "commentaire": "Stock vérifié dans l'entrepôt A"
  }
  ```
- **Comportement**:
  - Si l'utilisateur a déjà une entrée pour cet article → **MISE À JOUR**
  - Sinon → **CRÉATION**
  - Récupère automatiquement `quantite_theorique` depuis l'article
- **Validation**:
  - Inventaire doit être EN_COURS
  - Article doit exister
- **Réponse**: Entrée créée/mise à jour avec relations

### 7. **PUT** `/inventaires/{id}/finalize`
- **Description**: Finaliser un inventaire (action irréversible)
- **Authentification**: Requise
- **Paramètres**: `id` (UUID de l'inventaire)
- **Comportement**:
  - Change le statut à FINALISE
  - Enregistre l'utilisateur et la date de finalisation
- **Validation**: Inventaire doit être EN_COURS
- **Réponse**: Inventaire finalisé

### 8. **DELETE** `/inventaires/{id}/entries/{entryId}`
- **Description**: Supprimer une entrée d'inventaire
- **Authentification**: Requise
- **Paramètres**: 
  - `id` (UUID de l'inventaire)
  - `entryId` (UUID de l'entrée)
- **Restrictions**:
  - ⚠️ **Seul l'utilisateur qui a créé l'entrée peut la supprimer**
  - Inventaire doit être EN_COURS
- **Réponse**: 204 No Content (succès)
- **Erreurs**:
  - 404: Inventaire non EN_COURS, entrée non trouvée, ou pas propriétaire

### 9. **GET** `/inventaires/{id}/export`
- **Description**: Exporter un inventaire en Excel
- **Authentification**: Requise
- **Paramètres**: `id` (UUID de l'inventaire)
- **Réponse**: Fichier Excel (.xlsx)
- **Contenu**:
  - Feuille 1: Informations générales
  - Feuille 2: Détails avec écarts et statistiques

## 🔧 Implémentation Frontend

### Hook `useInventaire`

```typescript
// ✅ Ajouter une entrée (POST /inventaires/:id/entries)
await addEntry({
  article_id: "uuid",
  quantite_comptee: 10,
  commentaire: "optionnel"
});

// ✅ Supprimer une entrée (DELETE /inventaires/:id/entries/:entryId)
await deleteEntry(entryId);

// ✅ Finaliser (PUT /inventaires/:id/finalize)
await finalizeInventaire(applyAdjustments);
```

### Gestion des Erreurs

#### Suppression d'Entrée
```typescript
try {
  await deleteEntry(entryId);
} catch (err) {
  // 404 = Vous n'êtes pas propriétaire de cette entrée
  // 401 = Non authentifié
}
```

## 🔐 Sécurité

1. **Authentification**: Toutes les routes requièrent un Bearer Token
2. **Ownership**: Seul le créateur peut supprimer une entrée
3. **État**: Les modifications ne sont possibles que sur les inventaires EN_COURS
4. **Validation**: Vérification de l'existence des ressources (inventaire, article)

## 📝 Notes Importantes

- Une entrée par (utilisateur, article, inventaire) → évite les doublons
- La quantité théorique est automatiquement récupérée depuis l'article
- La finalisation est irréversible
- Les exports Excel incluent des statistiques et des écarts colorés
- Le localStorage est utilisé comme sauvegarde temporaire côté frontend

## 🐛 Débogage

### Erreur 404 lors de la suppression
**Cause**: L'utilisateur tente de supprimer une entrée créée par quelqu'un d'autre
**Solution**: Vérifier que `entry.utilisateur_id === currentUser.id`

### Inventaire non modifiable
**Cause**: Le statut n'est pas EN_COURS
**Solution**: Créer un nouvel inventaire ou vérifier le statut actuel
