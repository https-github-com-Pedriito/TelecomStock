import { describe, it, expect } from 'vitest';
import {
  buildKitQrPayload,
  checkKitAvailability,
  explodeKit,
  formatKitResume,
  isKitQrPayload,
  normalizeKitCode,
  parseKitQrPayload,
} from './kits';

describe('normalizeKitCode', () => {
  it('trims and upper-cases', () => {
    expect(normalizeKitCode('  kit-nat-dir ')).toBe('KIT-NAT-DIR');
  });
});

describe('buildKitQrPayload / parseKitQrPayload', () => {
  it('round-trips a kit code', () => {
    expect(parseKitQrPayload(buildKitQrPayload('KIT-NAT-DIR'))).toBe('KIT-NAT-DIR');
  });

  it('normalises a lower-case payload', () => {
    expect(parseKitQrPayload('kit:kit-nat-omn')).toBe('KIT-NAT-OMN');
  });

  it('accepts a bare KIT- code printed without the prefix', () => {
    expect(parseKitQrPayload('KIT-NAT-DIR')).toBe('KIT-NAT-DIR');
  });

  it('rejects an article barcode', () => {
    expect(parseKitQrPayload('3760123456789')).toBeNull();
    expect(isKitQrPayload('3760123456789')).toBe(false);
  });

  it('rejects an empty payload', () => {
    expect(parseKitQrPayload('')).toBeNull();
    expect(parseKitQrPayload('KIT:')).toBeNull();
  });
});

describe('explodeKit', () => {
  // La nomenclature de l'exemple métier : KIT-NAT-DIR.
  const nomenclature = [
    { article_id: 'antenne', quantite: 1 },
    { article_id: 'manchon', quantite: 2 },
    { article_id: 'collier', quantite: 1 },
    { article_id: 'cable', quantite: 40 },
    { article_id: 'connecteur', quantite: 4 },
  ];

  it('multiplies every line by the number of kits', () => {
    const result = explodeKit(nomenclature, 2);
    expect(result).toEqual([
      { article_id: 'antenne', quantite: 2 },
      { article_id: 'manchon', quantite: 4 },
      { article_id: 'collier', quantite: 2 },
      { article_id: 'cable', quantite: 80 },
      { article_id: 'connecteur', quantite: 8 },
    ]);
  });

  it('merges duplicate lines targeting the same article', () => {
    const result = explodeKit(
      [
        { article_id: 'connecteur', quantite: 2 },
        { article_id: 'connecteur', quantite: 2 },
      ],
      3
    );
    expect(result).toEqual([{ article_id: 'connecteur', quantite: 12 }]);
  });

  it('ignores lines with a null or negative quantity', () => {
    const result = explodeKit(
      [
        { article_id: 'antenne', quantite: 1 },
        { article_id: 'fantome', quantite: 0 },
        { article_id: 'negatif', quantite: -3 },
      ],
      1
    );
    expect(result).toEqual([{ article_id: 'antenne', quantite: 1 }]);
  });

  it('rejects a non-positive or fractional kit count', () => {
    expect(() => explodeKit(nomenclature, 0)).toThrow();
    expect(() => explodeKit(nomenclature, -1)).toThrow();
    expect(() => explodeKit(nomenclature, 1.5)).toThrow();
  });
});

describe('checkKitAvailability', () => {
  const articles = new Map([
    ['antenne', { id: 'antenne', nom: 'Antenne directionnelle', quantite_stock: 5 }],
    ['cable', { id: 'cable', nom: 'Câble coaxial (m)', quantite_stock: 50 }],
  ]);

  it('returns no shortage when stock covers the exit', () => {
    expect(
      checkKitAvailability([{ article_id: 'antenne', quantite: 5 }], articles)
    ).toEqual([]);
  });

  it('reports the articles that fall short', () => {
    const manques = checkKitAvailability(
      [
        { article_id: 'antenne', quantite: 2 },
        { article_id: 'cable', quantite: 80 },
      ],
      articles
    );
    expect(manques).toEqual([
      { article_id: 'cable', nom: 'Câble coaxial (m)', requis: 80, disponible: 50 },
    ]);
  });

  it('reports an unknown article as fully missing', () => {
    const manques = checkKitAvailability([{ article_id: 'inconnu', quantite: 1 }], articles);
    expect(manques).toEqual([
      { article_id: 'inconnu', nom: 'Article introuvable', requis: 1, disponible: 0 },
    ]);
  });
});

describe('formatKitResume', () => {
  it('renders a human-readable summary', () => {
    const articles = new Map([
      ['antenne', { id: 'antenne', nom: 'Antenne directionnelle', quantite_stock: 5 }],
    ]);
    expect(formatKitResume([{ article_id: 'antenne', quantite: 2 }], articles)).toBe(
      '2 × Antenne directionnelle'
    );
  });
});
