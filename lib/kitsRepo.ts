import { In, type DataSource, type EntityManager } from 'typeorm';
import { Kit } from '@/entities/Kit';
import { KitLigne } from '@/entities/KitLigne';

/**
 * Charge les nomenclatures des kits donnés et les attache à `kit.lignes`.
 *
 * Kit ne declare volontairement pas de `@OneToMany` (voir entities/Kit.ts :
 * le cycle d'imports casse le bundle serveur, et la relation par nom en
 * chaine ne survit pas a la minification). Les lignes se chargent donc par une
 * requete explicite — une seule pour tout le lot, pas une par kit.
 *
 * Les objets passes sont modifies sur place et renvoyes, pour que les
 * appelants puissent chainer.
 */
export async function chargerLignesDesKits<T extends Kit>(
  db: DataSource | EntityManager,
  kits: T[]
): Promise<T[]> {
  if (kits.length === 0) return kits;

  const lignes = await db.getRepository(KitLigne).find({
    where: { kit_id: In(kits.map(k => k.id)) },
    relations: { article: true },
  });

  const parKit = new Map<string, KitLigne[]>();
  for (const ligne of lignes) {
    const lot = parKit.get(ligne.kit_id);
    if (lot) lot.push(ligne);
    else parKit.set(ligne.kit_id, [ligne]);
  }

  for (const kit of kits) {
    kit.lignes = parKit.get(kit.id) ?? [];
  }
  return kits;
}

/** Variante pour un kit seul ; renvoie null tel quel. */
export async function chargerLignesDuKit<T extends Kit>(
  db: DataSource | EntityManager,
  kit: T | null
): Promise<T | null> {
  if (!kit) return null;
  await chargerLignesDesKits(db, [kit]);
  return kit;
}
