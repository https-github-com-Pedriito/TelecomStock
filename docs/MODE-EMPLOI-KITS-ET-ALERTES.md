# Mode d'emploi — QR codes de kits et alertes e-mail

Ce document couvre deux besoins :

1. **Suivre les entrées et sorties par QR code**, y compris un **QR global par kit** qui déduit automatiquement tous ses composants du stock.
2. **Être prévenu par e-mail** quand un article passe sous son seuil.

> **État des lieux.** Les alertes e-mail et le scan de QR à l'article existaient déjà dans l'application. Seuls les **kits** ont dû être ajoutés. La section « Alertes e-mail » décrit donc une fonctionnalité qu'il suffit de configurer, pas de développer.

---

## 1. Les kits en une phrase

Un kit n'est **pas** stocké comme un article. C'est une **nomenclature** : une liste de composants avec leurs quantités. Quand vous scannez le QR d'un kit et indiquez « 2 », l'application éclate la nomenclature et décrémente chaque composant de sa quantité × 2.

Exemple pour `KIT-NAT-DIR` défini comme 1 antenne, 2 manchons, 1 collier, 40 m de câble et 4 connecteurs :

| Kits sortis | Antenne | Manchon | Collier | Câble | Connecteur |
|---|---|---|---|---|---|
| 1 | −1 | −2 | −1 | −40 | −4 |
| **2** | **−2** | **−4** | **−2** | **−80** | **−8** |

Chaque composant reçoit **son propre mouvement** dans l'historique, tous portant le même commentaire (`Sortie kit : 2 × KIT-NAT-DIR (…)`), ce qui permet de retrouver une expédition complète d'un coup d'œil.

---

## 2. Mise en route — à faire une seule fois

### Étape 1 — Créer les articles composants

Les kits ne créent pas d'articles : ils consomment des articles existants. Dans **Équipements**, assurez-vous que chaque composant existe avec un stock et un **seuil minimum**.

Pour un article vendu au mètre (le câble), créez-le avec le mètre comme unité : « Câble coaxial (m) », stock `500` = 500 mètres. Les quantités de kit sont des **entiers**, donc 40 m se saisit `40`.

### Étape 2 — Créer les kits

1. Menu **Kits** → **Nouveau kit**.
2. **Code** : `KIT-NAT-DIR` (c'est ce qui sera encodé dans le QR code).
3. **Nom** : `Kit antenne directionnelle`.
4. **Nomenclature** : ajoutez une ligne par composant et sa quantité **pour 1 kit**.
5. Enregistrer.

Répétez pour `KIT-NAT-OMN` (kit antenne omnidirectionnelle).

> Le code est automatiquement passé en majuscules. `kit-nat-dir` et `KIT-NAT-DIR` désignent le même kit.

### Étape 3 — Imprimer les QR codes

Sur la page **Kits** :

- **Imprimer tous les QR** → une feuille A4 avec tous les kits, deux par ligne.
- Bouton **Imprimer** sur une carte → la fiche d'un seul kit.

Chaque étiquette imprimée contient le nom du kit, son code, le QR code et le rappel de la nomenclature. Collez-la sur le carton, le bac ou le classeur d'atelier.

Le QR encode le texte `KIT:KIT-NAT-DIR`. Le préfixe `KIT:` est ce qui permet à l'application de distinguer un kit d'un code-barres d'article. Si vous imprimez vos QR avec un outil tiers, un QR contenant simplement `KIT-NAT-DIR` est également reconnu.

---

## 3. Usage quotidien

### Sortir ou entrer des kits au scanner

1. Menu **Scanner** → **JE RETIRE** (sortie) ou **JE DÉPOSE** (entrée).
2. Scanner le QR du kit.
3. Une fenêtre s'ouvre avec le nom du kit. Saisir le **nombre de kits**.
4. L'écran affiche **avant validation** le détail exact de ce qui sera déduit ou ajouté.
5. Renseigner éventuellement le projet / chantier et un commentaire, puis **Valider**.

### Sans scanner (depuis un poste fixe)

Page **Kits** → bouton **Entrée / Sortie** sur la carte du kit. Même fenêtre, même résultat.

### Si le stock ne suffit pas

La sortie est **refusée en bloc** : aucun composant n'est décrémenté. C'est volontaire — une sortie partielle laisserait le stock dans un état incohérent, avec des antennes déduites et pas le câble.

La fenêtre liste alors précisément les composants manquants :

```
Câble coaxial (m) — requis 80, disponible 50
```

Deux choix :

- **Annuler**, réapprovisionner, recommencer.
- **Forcer la sortie** : la sortie est enregistrée quand même, et tout stock qui passerait sous zéro est ramené à 0. À réserver aux régularisations, quand le matériel est physiquement parti mais que le stock informatique était faux. **Réservé aux rôles Admin et Manager** — un technicien reçoit un refus.

Le tout-ou-rien est garanti par une transaction : soit les composants sont tous déduits, soit aucun ne l'est, même si la base tombe en cours d'écriture. Les articles concernés sont par ailleurs verrouillés le temps de l'opération, donc deux sorties simultanées du même kit se suivent au lieu de s'écraser.

Le nombre de kits par mouvement est plafonné à **10 000**, une borne technique destinée à transformer une saisie aberrante en message d'erreur clair plutôt qu'en erreur serveur.

### Modifier une nomenclature

Page **Kits** → **Modifier**. La nomenclature est remplacée en bloc par ce que vous validez.

**Important** : modifier un kit ne change **pas** les mouvements déjà enregistrés. Les sorties passées restent historisées avec les quantités de l'époque. Le nouveau contenu ne s'applique qu'aux sorties suivantes.

### Désactiver un kit

Décochez **Kit actif** dans la fenêtre d'édition. Le kit reste visible et son historique intact, mais un scan le refuse. Préférez cela à la suppression pour un kit qui n'est plus commercialisé.

---

## 4. Alertes e-mail au seuil

### Ce qui se déclenche, et quand

À chaque mouvement de stock — y compris chaque composant d'une sortie de kit — l'application compare la nouvelle quantité au **seuil minimum** de l'article :

| Situation | Niveau | E-mail |
|---|---|---|
| quantité > seuil | `ok` | aucun |
| 0 < quantité ≤ seuil | `critique` | « ⚠️ Stock critique — <article> » |
| quantité = 0 | `rupture` | « 🔴 Rupture de stock — <article> » |

Une sortie de kit qui fait passer trois composants sous leur seuil envoie **trois e-mails**, un par article, pour que chacun soit actionnable.

### Qui reçoit les e-mails

Tous les utilisateurs **actifs** du compte ayant le rôle **Admin** ou **Manager**. Il n'y a pas de liste de diffusion à gérer : ajoutez ou retirez quelqu'un dans **Utilisateurs** et la distribution suit.

Les techniciens ne reçoivent pas les alertes.

### Régler les seuils

Le seuil se règle **par article**, dans **Équipements** → fiche article → champ **Seuil minimum**.

Pour un import en masse, la colonne `seuil_minimum` du modèle CSV est reconnue par l'import (**Équipements** → **Importer**).

Conseil de réglage : positionnez le seuil au nombre de pièces consommées pendant votre délai de réapprovisionnement. Pour une antenne consommée à raison de 2/semaine avec 3 semaines de délai fournisseur, un seuil de 6 vous prévient juste à temps.

### Configuration technique (une seule fois, par l'administrateur)

Les e-mails passent par [Resend](https://resend.com). Trois variables d'environnement :

| Variable | Rôle | Exemple |
|---|---|---|
| `RESEND_API_KEY` | Clé API Resend | `re_…` |
| `RESEND_FROM_EMAIL` | Expéditeur affiché | `Telecom Stock <no-reply@votre-domaine.com>` |
| `NEXT_PUBLIC_BASE_URL` | Base des liens « Voir les articles » dans l'e-mail | `https://votre-domaine.com` |

En production (Vercel) : *Project Settings → Environment Variables*, puis redéployer.

Le domaine de `RESEND_FROM_EMAIL` doit être vérifié dans Resend, sinon les e-mails partent en spam ou sont rejetés.

**Si `RESEND_API_KEY` n'est pas renseignée**, l'application fonctionne normalement : les mouvements sont enregistrés, et seule une ligne d'avertissement est écrite dans les logs serveur (`RESEND_API_KEY non configuré — email alerte stock non envoyé`). Aucune erreur n'est renvoyée à l'utilisateur et aucun mouvement n'est perdu.

### Vérifier que ça marche

1. Prenez un article de test avec un seuil de `5` et un stock de `6`.
2. Enregistrez une sortie de `2`.
3. Le stock tombe à `4` ≤ `5` → un e-mail « Stock critique » doit arriver sur les boîtes admin/manager en quelques secondes.
4. Si rien n'arrive : vérifiez les logs serveur, puis l'onglet *Logs* du tableau de bord Resend.

---

## 5. Rôles et droits

| Action | Admin | Manager | Technicien |
|---|---|---|---|
| Voir les kits et imprimer les QR | ✅ | ✅ | ✅ |
| Scanner un kit (entrée/sortie) | ✅ | ✅ | ✅ |
| Créer / modifier une nomenclature | ✅ | ✅ | ❌ |
| Forcer une sortie en stock insuffisant | ✅ | ✅ | ❌ |
| Supprimer un kit | ✅ | ❌ | ❌ |
| Recevoir les alertes e-mail | ✅ | ✅ | ❌ |

Un technicien peut donc exécuter les expéditions au scanner sans pouvoir altérer ce qui est déduit du stock.

### Le compte Super Admin ne peut rien écrire

Un **Super Admin** n'est rattaché à aucun compte client. Il voit les données de tous les comptes, mais **toute écriture lui est refusée** avec le message :

> Aucun tenant sélectionné

Cela vaut pour les kits comme pour le reste de l'application : articles, mouvements, fournisseurs, dépôts, inventaires, utilisateurs. Ce n'est pas un défaut des kits, c'est la règle générale de l'application — un super admin administre les comptes, il n'opère pas dedans.

L'interface peut induire en erreur : elle ouvre au Super Admin l'ensemble des écrans de gestion de stock, et ce n'est qu'au moment de valider que le serveur refuse.

**Pour agir dans un compte, connectez-vous avec un utilisateur de ce compte** (rôle Admin ou Manager). C'est la seule façon aujourd'hui de créer un kit, d'enregistrer un mouvement ou de modifier un article.

---

## 6. En cas de problème

| Symptôme | Cause probable | Correctif |
|---|---|---|
| « Kit inconnu » au scan | Le code du QR ne correspond à aucun kit du compte | Vérifiez le code sur la page Kits ; réimprimez l'étiquette depuis l'application |
| Le scan ouvre la fenêtre « article » au lieu du kit | QR imprimé sans le préfixe `KIT:` **et** code ne commençant pas par `KIT-` | Renommez le kit avec un code commençant par `KIT-`, puis réimprimez |
| Bouton « Entrée / Sortie » grisé | Kit inactif, ou nomenclature vide | Réactivez le kit ou ajoutez-lui des composants |
| Aucun e-mail d'alerte | `RESEND_API_KEY` absente, ou aucun admin/manager actif | Voir § Configuration technique, et vérifiez la page Utilisateurs |
| QR blanc sur la feuille imprimée | L'impression a été lancée avant le rendu | Relancez **Imprimer** ; n'utilisez pas `Ctrl+P` du navigateur directement |

---

## 7. Référence technique

Pour les développeurs qui reprendront le sujet :

| Élément | Fichier |
|---|---|
| Entités | `entities/Kit.ts`, `entities/KitLigne.ts` |
| Logique QR + éclatement de nomenclature | `lib/kits.ts` |
| Envoi des alertes (partagé article/kit) | `lib/stockAlerts.ts` |
| Gabarit des e-mails | `lib/mailer.ts` (`sendStockAlertEmail`) |
| Calcul du niveau de stock | `lib/stock.ts` (`getStockLevel`) |
| API CRUD des kits | `app/api/kits/route.ts`, `app/api/kits/[id]/route.ts` |
| API mouvement de kit | `app/api/kits/mouvement/route.ts` |
| Écran Kits | `src-pages/Kits.tsx`, `app/(app)/kits/page.tsx` |
| Fenêtres | `components/KitModal.tsx`, `components/KitMouvementModal.tsx` |
| Scan des QR de kit | `src-pages/Scanner.tsx` |
| Tests unitaires | `lib/kits.test.ts`, `app/api/kits/route.test.ts`, `app/api/kits/[id]/route.test.ts`, `app/api/kits/mouvement/route.test.ts` |
| Tests d'intégration (vrai Postgres) | `test/integration/kit-concurrency.test.ts` |

### API — sortie de kits

```http
POST /api/kits/mouvement
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "KIT-NAT-DIR",
  "quantite": 2,
  "type": "SORTIE",
  "utilisateur": "Jane Doe",
  "projet": "Site Nantes",
  "force": false
}
```

Réponses : `201` avec les mouvements créés et les articles mis à jour · `400` saisie invalide (quantité non entière, au-delà du plafond, composant hors du compte) · `403` technicien tentant de forcer · `404` kit inconnu · `409` kit désactivé, ou `code: "STOCK_INSUFFISANT"` accompagné de la liste `manques`.

### Schéma de base

Les tables `kits` et `kit_lignes` sont créées automatiquement au démarrage (`synchronize: true` dans `lib/db.ts`). Aucune migration manuelle n'est nécessaire. Création vérifiée sur une base vierge par le test d'intégration.

### Tests d'intégration

Les tests unitaires utilisent un faux dépôt en mémoire : ils valident la logique, jamais les garanties de la base. Or le tout-ou-rien d'une sortie de kit est précisément une garantie base. Un second jeu de tests s'exécute donc contre un vrai PostgreSQL 17 :

```bash
npm run test:int:up     # démarre un postgres:17-alpine jetable sur le port 55432
npm run test:int        # rejoue les scénarios de concurrence
npm run test:int:down   # arrête et supprime le conteneur
```

Sans conteneur joignable, la suite s'ignore d'elle-même — la CI n'a pas besoin de Docker.

Ce que ces tests démontrent, mesuré en retirant le verrou du code :

| Scénario | Avec verrou | Sans verrou |
|---|---|---|
| 2 sorties simultanées sur 10 antennes | 8 restantes | 9 — une déduction perdue |
| Stock d'un seul kit, 2 sorties simultanées | 1 acceptée, 1 refusée | **2 acceptées** |
| 10 sorties simultanées sur 10 antennes | 0 restante | 9 — neuf déductions perdues |

Autrement dit, sans `SELECT … FOR UPDATE`, deux techniciens scannant le même kit au même instant produisent un stock faux. C'est le défaut que cette suite verrouille.
