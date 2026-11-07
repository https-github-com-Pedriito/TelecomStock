import { describe, expect, it } from 'vitest';
import { diffKitLignes, formatKitDiff, kitDiffEstVide, summarizeKitMovement } from './kits';

const nom = (id: string) => ({ a: 'Câble', b: 'Prise', c: 'Vis' }[id] ?? id);

describe('diffKitLignes', () => {
  it('detecte composants ajoutés, retirés et modifiés', () => {
    const diff = diffKitLignes(
      [{ article_id: 'a', quantite: 2 }, { article_id: 'b', quantite: 1 }],
      [{ article_id: 'a', quantite: 4 }, { article_id: 'c', quantite: 3 }]
    );
    expect(diff.ajoutes).toEqual([{ article_id: 'c', quantite: 3 }]);
    expect(diff.retires).toEqual([{ article_id: 'b', quantite: 1 }]);
    expect(diff.modifies).toEqual([{ article_id: 'a', avant: 2, apres: 4 }]);
  });

  it('est vide quand la nomenclature ne change pas, quel que soit l\'ordre', () => {
    const diff = diffKitLignes(
      [{ article_id: 'a', quantite: 2 }, { article_id: 'b', quantite: 1 }],
      [{ article_id: 'b', quantite: 1 }, { article_id: 'a', quantite: 2 }]
    );
    expect(kitDiffEstVide(diff)).toBe(true);
  });

  it('additionne les lignes en double d\'un même article', () => {
    const diff = diffKitLignes([{ article_id: 'a', quantite: 1 }], [
      { article_id: 'a', quantite: 1 },
      { article_id: 'a', quantite: 1 },
    ]);
    expect(diff.modifies).toEqual([{ article_id: 'a', avant: 1, apres: 2 }]);
  });
});

describe('formatKitDiff', () => {
  it('formule les trois types de changement', () => {
    const texte = formatKitDiff(
      {
        ajoutes: [{ article_id: 'c', quantite: 3 }],
        retires: [{ article_id: 'b', quantite: 1 }],
        modifies: [{ article_id: 'a', avant: 2, apres: 4 }],
      },
      nom
    );
    expect(texte).toBe('Ajouté : 3 × Vis · Retiré : Prise · Quantité modifiée : Câble 2 → 4');
  });
});

describe('summarizeKitMovement', () => {
  const base = {
    kit: { code: 'KIT-1', nom: 'Poste' },
    nb_kits: 2,
    type: 'SORTIE' as const,
  };

  it('détaille chaque composant avec le stock restant', () => {
    const r = summarizeKitMovement({
      ...base,
      mouvements: [{ quantite: 4, article: { id: 'a', nom: 'Câble' } }],
      articles: [{ id: 'a', nom: 'Câble', quantite_stock: 16, seuil_minimum: 5 }],
    });
    expect(r.level).toBe('success');
    expect(r.title).toBe('Sortie de kit confirmée');
    expect(r.message).toContain('2 × KIT-1');
    expect(r.message).toContain('Câble −4 (reste 16)');
  });

  it('signale une rupture et un niveau critique', () => {
    const rupture = summarizeKitMovement({
      ...base,
      mouvements: [{ quantite: 4, article: { id: 'a', nom: 'Câble' } }],
      articles: [{ id: 'a', nom: 'Câble', quantite_stock: 0, seuil_minimum: 5 }],
    });
    expect(rupture.level).toBe('error');
    expect(rupture.message).toContain('Rupture : Câble');

    const critique = summarizeKitMovement({
      ...base,
      type: 'ENTREE',
      mouvements: [{ quantite: 1, article: { id: 'a', nom: 'Câble' } }],
      articles: [{ id: 'a', nom: 'Câble', quantite_stock: 3, seuil_minimum: 5 }],
    });
    expect(critique.level).toBe('warning');
    expect(critique.title).toBe('Entrée de kit confirmée');
    expect(critique.message).toContain('Câble +1');
  });
});

import { computeKitStock } from './kits';

describe('computeKitStock', () => {
  const stock = (entries: Array<[string, string, number]>) =>
    new Map(entries.map(([id, nom, quantite_stock]) => [id, { id, nom, quantite_stock }]));

  it('le composant le plus rare plafonne le nombre de kits', () => {
    const r = computeKitStock(
      [{ article_id: 'a', quantite: 2 }, { article_id: 'b', quantite: 1 }],
      stock([['a', 'Câble', 7], ['b', 'Prise', 20]])
    );
    expect(r.disponibles).toBe(3); // 7 / 2 = 3, contre 20 prises
    expect(r.limitant?.nom).toBe('Câble');
  });

  it('vaut 0 quand un composant est en rupture', () => {
    const r = computeKitStock(
      [{ article_id: 'a', quantite: 1 }, { article_id: 'b', quantite: 1 }],
      stock([['a', 'Câble', 50], ['b', 'Prise', 0]])
    );
    expect(r.disponibles).toBe(0);
    expect(r.limitant?.nom).toBe('Prise');
  });

  it('additionne deux lignes du même article, comme à la sortie', () => {
    const r = computeKitStock(
      [{ article_id: 'a', quantite: 1 }, { article_id: 'a', quantite: 2 }],
      stock([['a', 'Câble', 10]])
    );
    expect(r.disponibles).toBe(3);
    expect(r.composants).toHaveLength(1);
  });

  it('ne dépasse jamais un stock négatif ou fractionnaire', () => {
    expect(computeKitStock([{ article_id: 'a', quantite: 1 }], stock([['a', 'Câble', -4]])).disponibles).toBe(0);
  });

  it('est indéterminé (null) pour une nomenclature vide ou un article encore inconnu', () => {
    expect(computeKitStock([], stock([])).disponibles).toBeNull();
    expect(computeKitStock([{ article_id: 'zz', quantite: 1 }], stock([['a', 'Câble', 5]])).disponibles).toBeNull();
  });
});
