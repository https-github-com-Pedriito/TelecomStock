/**
 * Test d'integration de la sortie de kit contre un VRAI Postgres.
 *
 * Les tests unitaires des routes utilisent un faux depot en memoire : ils
 * verifient la logique, jamais les garanties de la base. Or le point sensible
 * de la sortie de kit est precisement une garantie base — la transaction et le
 * verrou `SELECT ... FOR UPDATE` qui empechent deux sorties simultanees de
 * lire le meme stock et d'en perdre une.
 *
 * Ce fichier demarre donc la vraie DataSource (synchronize comprise) contre un
 * Postgres jetable et rejoue le scenario en concurrence reelle.
 *
 * Lancer le conteneur avant :
 *   docker run -d --name telecomstock-test-pg \
 *     -e POSTGRES_PASSWORD=test -e POSTGRES_DB=telecomstock_test \
 *     -p 55432:5432 postgres:17-alpine
 *
 * Sans conteneur joignable, toute la suite est ignoree : la CI n'a pas besoin
 * de Docker.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import net from 'node:net';

// Ni temps reel ni e-mail ici : seules les garanties de la base sont testees,
// et surtout aucun e-mail ne doit partir depuis une suite de tests.
// Chemins relatifs : avec l'alias '@/', vitest n'associait pas le mock au
// module reellement charge par la route, et le vrai client Redis comme le vrai
// mailer etaient atteints. Aucun e-mail ne doit pouvoir partir d'un test.
vi.mock('../../lib/realtime', () => ({ publishChange: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../lib/mailer', () => ({ sendStockAlertEmail: vi.fn().mockResolvedValue(undefined) }));

const DB_HOST = process.env.TEST_PG_HOST ?? 'localhost';
const DB_PORT = Number(process.env.TEST_PG_PORT ?? 55432);

async function postgresJoignable(): Promise<boolean> {
  return new Promise(resolve => {
    const socket = net.connect({ host: DB_HOST, port: DB_PORT });
    const fini = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => fini(true));
    socket.once('timeout', () => fini(false));
    socket.once('error', () => fini(false));
  });
}

const disponible = await postgresJoignable();

// Configure la connexion AVANT tout import de lib/db : createDataSource lit
// ces variables, et l'absence de DATABASE_URL est ce qui desactive le SSL.
delete process.env.DATABASE_URL;
process.env.DB_HOST = DB_HOST;
process.env.DB_PORT = String(DB_PORT);
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'telecomstock_test';
delete process.env.DB_SSL;

const { getDb } = await import('../../lib/db');
const { Article } = await import('../../entities/Article');
const { Mouvement } = await import('../../entities/Mouvement');
const { Kit } = await import('../../entities/Kit');
const { KitLigne } = await import('../../entities/KitLigne');
const { Tenant } = await import('../../entities/Tenant');
const { UserRole } = await import('../../entities/User');
const { signToken } = await import('../../lib/auth');
const { POST } = await import('../../app/api/kits/mouvement/route');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

function autorisation(role = 'ADMIN') {
  const token = signToken({
    userId: '22222222-2222-2222-2222-222222222222',
    tenantId: TENANT_ID,
    email: 'admin@test.fr',
    role: role as any,
    nom: 'Doe',
    prenom: 'Jane',
  });
  return `Bearer ${token}`;
}

function requete(body: unknown) {
  return new NextRequest('http://localhost/api/kits/mouvement', {
    method: 'POST',
    headers: { Authorization: autorisation() },
    body: JSON.stringify(body),
  });
}

/** Remet le jeu de donnees a plat avant chaque scenario. */
async function reinitialiser(stockAntenne: number, stockCable: number) {
  const db = await getDb();
  // TRUNCATE plutot que delete({}) : TypeORM refuse un critere vide, et la
  // cascade nettoie les dependances d'un coup.
  await db.query('TRUNCATE TABLE mouvements, kit_lignes, kits, articles, tenants CASCADE');

  await db.getRepository(Tenant).save(
    db.getRepository(Tenant).create({
      id: TENANT_ID,
      nom: 'Acme Telecom',
      slug: 'acme-' + Date.now(),
      is_active: true,
      seats: 5,
    })
  );

  const articleRepo = db.getRepository(Article);
  const antenne = await articleRepo.save(
    articleRepo.create({ tenant_id: TENANT_ID, nom: 'Antenne directionnelle', quantite_stock: stockAntenne, seuil_minimum: 1 })
  );
  const cable = await articleRepo.save(
    articleRepo.create({ tenant_id: TENANT_ID, nom: 'Cable coaxial (m)', quantite_stock: stockCable, seuil_minimum: 10 })
  );

  const kitRepo = db.getRepository(Kit);
  const kit = await kitRepo.save(
    kitRepo.create({ tenant_id: TENANT_ID, code: 'KIT-NAT-DIR', nom: 'Kit antenne directionnelle', est_actif: true })
  );
  const ligneRepo = db.getRepository(KitLigne);
  await ligneRepo.save([
    ligneRepo.create({ kit_id: kit.id, article_id: antenne.id, quantite: 1 }),
    ligneRepo.create({ kit_id: kit.id, article_id: cable.id, quantite: 40 }),
  ]);

  return { antenne, cable, kit };
}

async function stockDe(id: string): Promise<number> {
  const db = await getDb();
  const a = await db.getRepository(Article).findOne({ where: { id } });
  return a!.quantite_stock;
}

describe.skipIf(!disponible)('Sortie de kit — garanties Postgres reelles', () => {
  beforeAll(async () => {
    // Ouvre la connexion et laisse `synchronize: true` creer le schema : cela
    // verifie au passage que les entites kits se materialisent sur une base
    // vierge, exactement comme au premier deploiement.
    await getDb();
  }, 60_000);

  afterAll(async () => {
    const db = await getDb();
    if (db.isInitialized) await db.destroy();
    global._dataSource = undefined;
  });

  it('cree bien les tables kits et kit_lignes sur une base vierge', async () => {
    const db = await getDb();
    const tables: Array<{ table_name: string }> = await db.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('kits', 'kit_lignes')
        ORDER BY table_name`
    );
    expect(tables.map(t => t.table_name)).toEqual(['kit_lignes', 'kits']);

    const contraintes: Array<{ def: string }> = await db.query(
      `SELECT pg_get_constraintdef(con.oid) AS def
         FROM pg_constraint con
         JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'kit_lignes' AND con.contype = 'f'`
    );
    // Les deux cles etrangeres en cascade, celles qui justifient le garde-fou
    // sur la suppression d'article.
    expect(contraintes.filter(c => c.def.includes('ON DELETE CASCADE'))).toHaveLength(2);
  }, 30_000);

  it('serialise deux sorties simultanees au lieu d en perdre une', async () => {
    const { antenne, cable } = await reinitialiser(10, 500);

    // Le coeur du test : sans verrou, les deux transactions liraient 10 et
    // ecriraient 9 chacune — stock final 9 au lieu de 8.
    const [a, b] = await Promise.all([
      POST(requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane' }), {}),
      POST(requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'John' }), {}),
    ]);

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(await stockDe(antenne.id)).toBe(8);
    expect(await stockDe(cable.id)).toBe(420);

    const db = await getDb();
    expect(await db.getRepository(Mouvement).count()).toBe(4); // 2 composants x 2 sorties
  }, 30_000);

  it('n autorise qu une seule des deux sorties quand le stock ne couvre qu un kit', async () => {
    const { antenne } = await reinitialiser(1, 500);

    const [a, b] = await Promise.all([
      POST(requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane' }), {}),
      POST(requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'John' }), {}),
    ]);

    const statuts = [a.status, b.status].sort();
    expect(statuts).toEqual([201, 409]);
    // Le stock ne passe jamais negatif, et la sortie refusee n a rien ecrit.
    expect(await stockDe(antenne.id)).toBe(0);

    const db = await getDb();
    expect(await db.getRepository(Mouvement).count()).toBe(2);
  }, 30_000);

  it('annule tout si un composant manque, sans sortie partielle', async () => {
    // 10 antennes mais seulement 10 m de cable : il en faut 40.
    const { antenne, cable } = await reinitialiser(10, 10);

    const res = await POST(
      requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: 'Jane' }),
      {}
    );

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('STOCK_INSUFFISANT');
    expect(await stockDe(antenne.id)).toBe(10);
    expect(await stockDe(cable.id)).toBe(10);

    const db = await getDb();
    expect(await db.getRepository(Mouvement).count()).toBe(0);
  }, 30_000);

  it('ne s interbloque pas entre deux kits partageant les memes composants', async () => {
    // Contention croisee : deux kits partagent les memes composants, declares
    // en ordre inverse, et sortent en parallele.
    //
    // Ce test ne tombe PAS si l'on retire l'ordre de verrouillage de la route :
    // verifie. Un seul SELECT ... IN (...) FOR UPDATE verrouille dans l'ordre
    // de parcours de Postgres, identique pour les deux transactions. Il
    // documente donc que la contention croisee ne produit ni deadlock ni perte
    // de mise a jour, pas que l'ORDER BY serait indispensable.
    const db = await getDb();
    await db.query('TRUNCATE TABLE mouvements, kit_lignes, kits, articles, tenants CASCADE');
    await db.getRepository(Tenant).save(
      db.getRepository(Tenant).create({
        id: TENANT_ID, nom: 'Acme', slug: 'acme-' + Date.now(), is_active: true, seats: 5,
      })
    );

    const articleRepo = db.getRepository(Article);
    const a = await articleRepo.save(articleRepo.create({ tenant_id: TENANT_ID, nom: 'Composant A', quantite_stock: 200, seuil_minimum: 0 }));
    const b = await articleRepo.save(articleRepo.create({ tenant_id: TENANT_ID, nom: 'Composant B', quantite_stock: 200, seuil_minimum: 0 }));

    const kitRepo = db.getRepository(Kit);
    const ligneRepo = db.getRepository(KitLigne);
    const dir = await kitRepo.save(kitRepo.create({ tenant_id: TENANT_ID, code: 'KIT-NAT-DIR', nom: 'Directionnel', est_actif: true }));
    const omn = await kitRepo.save(kitRepo.create({ tenant_id: TENANT_ID, code: 'KIT-NAT-OMN', nom: 'Omnidirectionnel', est_actif: true }));
    // Ordre de declaration volontairement oppose entre les deux kits.
    await ligneRepo.save([
      ligneRepo.create({ kit_id: dir.id, article_id: a.id, quantite: 1 }),
      ligneRepo.create({ kit_id: dir.id, article_id: b.id, quantite: 1 }),
      ligneRepo.create({ kit_id: omn.id, article_id: b.id, quantite: 1 }),
      ligneRepo.create({ kit_id: omn.id, article_id: a.id, quantite: 1 }),
    ]);

    const rafale = Array.from({ length: 20 }, (_, i) =>
      POST(
        requete({
          code: i % 2 === 0 ? 'KIT-NAT-DIR' : 'KIT-NAT-OMN',
          quantite: 1,
          type: 'SORTIE',
          utilisateur: `Tech ${i}`,
        }),
        {}
      )
    );
    const resultats = await Promise.all(rafale);

    // Aucun 500 : pas de deadlock, les 20 sorties aboutissent.
    expect(resultats.filter(r => r.status === 500)).toHaveLength(0);
    expect(resultats.filter(r => r.status === 201)).toHaveLength(20);
    expect(await stockDe(a.id)).toBe(180);
    expect(await stockDe(b.id)).toBe(180);
  }, 60_000);

  it('resiste a une rafale de dix sorties simultanees', async () => {
    const { antenne, cable } = await reinitialiser(10, 500);

    const resultats = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        POST(requete({ code: 'KIT-NAT-DIR', quantite: 1, type: 'SORTIE', utilisateur: `Tech ${i}` }), {})
      )
    );

    // 10 antennes, 1 par kit : les dix passent, et pas une de plus.
    expect(resultats.filter(r => r.status === 201)).toHaveLength(10);
    expect(await stockDe(antenne.id)).toBe(0);
    expect(await stockDe(cable.id)).toBe(100);
  }, 60_000);
});
