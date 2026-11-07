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

/** Composant dont la quantite par kit differe entre deux versions d'une nomenclature. */
export interface KitLigneModifiee {
  article_id: string;
  avant: number;
  apres: number;
}

export interface KitLignesDiff {
  ajoutes: KitLigneLike[];
  retires: KitLigneLike[];
  modifies: KitLigneModifiee[];
}

function quantitesParArticle(lignes: KitLigneLike[]): Map<string, number> {
  const parArticle = new Map<string, number>();
  for (const { article_id, quantite } of lignes) {
    parArticle.set(article_id, (parArticle.get(article_id) ?? 0) + Number(quantite));
  }
  return parArticle;
}

/** Ce qui change entre l'ancienne et la nouvelle nomenclature d'un kit. */
export function diffKitLignes(avant: KitLigneLike[], apres: KitLigneLike[]): KitLignesDiff {
  const ancien = quantitesParArticle(avant);
  const nouveau = quantitesParArticle(apres);
  const diff: KitLignesDiff = { ajoutes: [], retires: [], modifies: [] };

  for (const [article_id, quantite] of nouveau) {
    const q = ancien.get(article_id);
    if (q === undefined) diff.ajoutes.push({ article_id, quantite });
    else if (q !== quantite) diff.modifies.push({ article_id, avant: q, apres: quantite });
  }
  for (const [article_id, quantite] of ancien) {
    if (!nouveau.has(article_id)) diff.retires.push({ article_id, quantite });
  }
  return diff;
}

export function kitDiffEstVide(diff: KitLignesDiff): boolean {
  return diff.ajoutes.length === 0 && diff.retires.length === 0 && diff.modifies.length === 0;
}

/** Phrase lisible decrivant les composants ajoutes, retires et modifies. */
export function formatKitDiff(diff: KitLignesDiff, nomDe: (articleId: string) => string): string {
  const parties: string[] = [];
  if (diff.ajoutes.length > 0) {
    parties.push(`Ajouté : ${diff.ajoutes.map(l => `${l.quantite} × ${nomDe(l.article_id)}`).join(', ')}`);
  }
  if (diff.retires.length > 0) {
    parties.push(`Retiré : ${diff.retires.map(l => nomDe(l.article_id)).join(', ')}`);
  }
  if (diff.modifies.length > 0) {
    parties.push(
      `Quantité modifiée : ${diff.modifies.map(l => `${nomDe(l.article_id)} ${l.avant} → ${l.apres}`).join(', ')}`
    );
  }
  return parties.join(' · ');
}

export interface KitMovementSummaryInput {
  kit: { code: string; nom: string };
  nb_kits: number;
  type: 'ENTREE' | 'SORTIE';
  mouvements: Array<{ quantite: number; article?: { id: string; nom: string } | null }>;
  articles: Array<{ id: string; nom: string; quantite_stock: number; seuil_minimum: number }>;
}

/**
 * Message de confirmation d'une entree/sortie de kit : chaque composant avec la
 * variation appliquee et le stock restant, et un niveau d'alerte si l'un d'eux
 * passe en rupture ou sous son seuil.
 */
export function summarizeKitMovement(result: KitMovementSummaryInput): {
  level: 'success' | 'warning' | 'error';
  title: string;
  message: string;
} {
  const signe = result.type === 'SORTIE' ? '−' : '+';
  const stockParArticle = new Map(result.articles.map(a => [a.id, a]));

  const composants = result.mouvements.map(m => {
    const article = m.article ? stockParArticle.get(m.article.id) ?? m.article : undefined;
    const nom = article?.nom ?? 'Article';
    const reste = stockParArticle.get(m.article?.id ?? '')?.quantite_stock;
    return `${nom} ${signe}${m.quantite}${reste !== undefined ? ` (reste ${reste})` : ''}`;
  });

  const enRupture = result.articles.filter(a => a.quantite_stock <= 0);
  const critiques = result.articles.filter(a => a.quantite_stock > 0 && a.quantite_stock <= a.seuil_minimum);
  const alerte = enRupture.length > 0
    ? ` Rupture : ${enRupture.map(a => a.nom).join(', ')}.`
    : critiques.length > 0
      ? ` Niveau critique : ${critiques.map(a => a.nom).join(', ')}.`
      : '';

  return {
    level: enRupture.length > 0 ? 'error' : critiques.length > 0 ? 'warning' : 'success',
    title: `${result.type === 'SORTIE' ? 'Sortie' : 'Entrée'} de kit confirmée`,
    message: `${result.nb_kits} × ${result.kit.code} (${result.kit.nom}) : ${composants.join(', ')}.${alerte}`,
  };
}

/** Un composant d'un kit, avec le nombre de kits que son stock permet de former. */
export interface KitComposantStock {
  article_id: string;
  nom: string;
  /** Quantité consommée par UN kit. */
  requis: number;
  /** Stock courant de l'article. */
  disponible: number;
  /** Kits complets que ce seul composant permet de former. */
  kitsPossibles: number;
}

export interface KitStock {
  /**
   * Nombre de kits complets constituables avec le stock actuel (le composant le
   * plus rare décide). `null` quand il est impossible à établir : nomenclature
   * vide, ou article encore inconnu (stock en cours de chargement).
   */
  disponibles: number | null;
  /** Composant qui plafonne le nombre de kits, `null` si `disponibles` l'est. */
  limitant: KitComposantStock | null;
  composants: KitComposantStock[];
}

/**
 * Combien de kits peut-on sortir avec le stock actuel ?
 * Les lignes visant le même article sont additionnées, comme à la sortie.
 */
export function computeKitStock(
  lignes: KitLigneLike[],
  articlesById: Map<string, ArticleStockLike>
): KitStock {
  const composants: KitComposantStock[] = [];
  let inconnu = false;

  for (const [article_id, requis] of quantitesParArticle(lignes)) {
    if (!Number.isFinite(requis) || requis <= 0) continue;
    const article = articlesById.get(article_id);
    if (!article) {
      inconnu = true;
      continue;
    }
    const disponible = Math.max(0, article.quantite_stock ?? 0);
    composants.push({
      article_id,
      nom: article.nom,
      requis,
      disponible,
      kitsPossibles: Math.floor(disponible / requis),
    });
  }

  if (inconnu || composants.length === 0) return { disponibles: null, limitant: null, composants };

  const limitant = composants.reduce((min, c) => (c.kitsPossibles < min.kitsPossibles ? c : min));
  return { disponibles: limitant.kitsPossibles, limitant, composants };
}
