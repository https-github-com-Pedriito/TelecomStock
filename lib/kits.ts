/**
 * Logique métier des kits (nomenclatures).
 *
 * Volontairement pur : pas d'accès base ni de dépendance Next, pour que
 * l'éclatement d'une nomenclature et le décodage d'un QR code soient testables
 * directement et réutilisables côté client comme côté serveur.
 */

/** Préfixe qui distingue un QR de kit d'un code-barres d'article. */
export const KIT_QR_PREFIX = 'KIT:';

/**
 * Plafond du nombre de kits par mouvement.
 *
 * Les quantités éclatées atterrissent dans des colonnes `int4` : au-delà, c'est
 * la base qui refuserait l'écriture, avec une 500 incompréhensible plutôt
 * qu'une erreur de saisie claire. 10 000 kits d'un coup dépasse déjà largement
 * tout usage réel.
 */
export const MAX_KITS_PAR_MOUVEMENT = 10_000;

/** Un article consommé par un kit, et en quelle quantité pour UN kit. */
export interface KitLigneLike {
  article_id: string;
  quantite: number;
}

/** Ligne de mouvement à appliquer au stock après éclatement. */
export interface MouvementLigne {
  article_id: string;
  quantite: number;
}

/** Stock connu d'un article, pour le contrôle de disponibilité. */
export interface ArticleStockLike {
  id: string;
  nom: string;
  quantite_stock: number;
}

export interface ManqueStock {
  article_id: string;
  nom: string;
  requis: number;
  disponible: number;
}

/**
 * Construit le contenu à encoder dans le QR code d'un kit.
 * Le code est normalisé en majuscules : les lecteurs optiques et la saisie
 * manuelle ne doivent pas produire deux kits distincts.
 */
export function buildKitQrPayload(code: string): string {
  return `${KIT_QR_PREFIX}${normalizeKitCode(code)}`;
}

/** Normalise un code kit (majuscules, sans espaces superflus). */
export function normalizeKitCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

/**
 * Décode un QR scanné et renvoie le code du kit, ou null si ce n'est pas un kit.
 *
 * Accepte la forme canonique `KIT:KIT-NAT-DIR` ainsi que le code nu
 * `KIT-NAT-DIR` : des QR codes peuvent avoir été imprimés par un outil tiers
 * sans le préfixe, et un code commençant par `KIT-` est sans ambiguïté.
 */
export function parseKitQrPayload(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  const upper = value.toUpperCase();
  if (upper.startsWith(KIT_QR_PREFIX)) {
    const code = normalizeKitCode(value.slice(KIT_QR_PREFIX.length));
    return code || null;
  }
  if (upper.startsWith('KIT-')) return upper;
  return null;
}

/** Vrai si le contenu scanné désigne un kit plutôt qu'un article. */
export function isKitQrPayload(raw: string): boolean {
  return parseKitQrPayload(raw) !== null;
}

/**
 * Éclate une nomenclature en lignes de mouvement pour `nbKits` kits.
 *
 * Les lignes visant le même article sont fusionnées : une nomenclature peut
 * lister deux fois le même connecteur pour des raisons de lisibilité, le stock
 * ne doit être décrémenté qu'une fois du total.
 */
export function explodeKit(lignes: KitLigneLike[], nbKits: number): MouvementLigne[] {
  if (!Number.isInteger(nbKits) || nbKits <= 0) {
    throw new Error('Le nombre de kits doit être un entier strictement positif');
  }

  const parLigne = new Map<string, number>();
  for (const ligne of lignes) {
    const quantite = Number(ligne.quantite);
    if (!Number.isFinite(quantite) || quantite <= 0) continue;
    parLigne.set(ligne.article_id, (parLigne.get(ligne.article_id) ?? 0) + quantite * nbKits);
  }

  return [...parLigne.entries()].map(([article_id, quantite]) => ({ article_id, quantite }));
}

/**
 * Vérifie que le stock couvre une sortie de kit.
 * Renvoie la liste des articles manquants ; vide si la sortie est possible.
 */
export function checkKitAvailability(
  mouvements: MouvementLigne[],
  articlesById: Map<string, ArticleStockLike>
): ManqueStock[] {
  const manques: ManqueStock[] = [];
  for (const { article_id, quantite } of mouvements) {
    const article = articlesById.get(article_id);
    if (!article) {
      manques.push({ article_id, nom: 'Article introuvable', requis: quantite, disponible: 0 });
      continue;
    }
    const disponible = article.quantite_stock ?? 0;
    if (disponible < quantite) {
      manques.push({ article_id, nom: article.nom, requis: quantite, disponible });
    }
  }
  return manques;
}

/** Résumé lisible d'une nomenclature, pour les écrans et les e-mails. */
export function formatKitResume(
  mouvements: MouvementLigne[],
  articlesById: Map<string, ArticleStockLike>
): string {
  return mouvements
    .map(({ article_id, quantite }) => `${quantite} × ${articlesById.get(article_id)?.nom ?? article_id}`)
    .join(', ');
}
