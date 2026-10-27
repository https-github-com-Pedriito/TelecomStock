/**
 * Fumigation de bout en bout contre le BUILD DE PRODUCTION lance sur :3100.
 * C'est le seul endroit ou la minification s'applique, donc le seul endroit
 * ou un probleme de resolution d'entites TypeORM se manifeste.
 */
import jwt from 'jsonwebtoken';
import pg from 'pg';

const BASE = 'http://localhost:3100';
const SECRET = process.env.SMOKE_JWT_SECRET ?? 'smoke_secret_local_uniquement';
const TENANT = '33333333-3333-3333-3333-333333333333';

// Amorce : le serveur ne cree son schema (synchronize: true) qu'au premier
// acces a la base. Sans cet appel, les TRUNCATE ci-dessous tombent sur des
// tables inexistantes quand le conteneur vient d'etre recree.
const amorce = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'amorce@test.local', password: 'x' }),
});
if (amorce.status !== 401) {
  console.log(`  ECHEC amorce /api/auth/login : HTTP ${amorce.status} (401 attendu)`);
  process.exit(1);
}
console.log('  OK   amorce — schema cree, login repond 401');

const client = new pg.Client({
  host: 'localhost', port: 55432, user: 'postgres', password: 'test', database: 'telecomstock_test',
});
await client.connect();

// GARDE-FOU. Rien ne garantit a priori que le serveur interroge la meme base
// que ce script : `next start` recharge .env, donc un DATABASE_URL de
// PRODUCTION peut s'imposer a son insu. On depose un temoin dans la base
// jetable et on exige que le serveur le voie avant d'ecrire quoi que ce soit.
// Sans cette verification, un TRUNCATE lance ici viderait la base que le
// serveur utilise vraiment.
const TEMOIN = `smoke-temoin-${Date.now()}`;
await client.query(
  `INSERT INTO tenants (id, nom, slug, is_active, seats) VALUES ($1,$2,$2,true,1)
   ON CONFLICT (id) DO NOTHING`,
  ['99999999-9999-9999-9999-999999999999', TEMOIN]
);
const jetonTemoin = jwt.sign(
  { userId: '88888888-8888-8888-8888-888888888888', tenantId: '99999999-9999-9999-9999-999999999999',
    email: 'temoin@test.local', role: 'ADMIN', nom: 'T', prenom: 'T' },
  SECRET, { expiresIn: '5m' }
);
const verif = await fetch(`${BASE}/api/kits`, { headers: { Authorization: `Bearer ${jetonTemoin}` } });
if (verif.status !== 200) {
  console.log(`  ECHEC garde-fou : le serveur ne reconnait pas le tenant temoin (HTTP ${verif.status}).`);
  console.log('         Il interroge probablement une AUTRE base que le conteneur de test.');
  console.log('         Lancez-le via scripts/smoke-server.sh. Aucune ecriture effectuee.');
  await client.end();
  process.exit(1);
}
console.log('  OK   garde-fou — le serveur lit bien la base jetable');

await client.query('TRUNCATE TABLE mouvements, kit_lignes, kits, articles, tenants CASCADE');
await client.query(
  `INSERT INTO tenants (id, nom, slug, is_active, seats) VALUES ($1,'Acme','acme-smoke',true,5)`,
  [TENANT]
);
const { rows: arts } = await client.query(
  `INSERT INTO articles (nom, tenant_id, quantite_stock, seuil_minimum)
   VALUES ('Antenne directionnelle',$1,10,1), ('Cable coaxial (m)',$1,500,10)
   RETURNING id, nom`,
  [TENANT]
);
await client.end();

const token = jwt.sign(
  { userId: '44444444-4444-4444-4444-444444444444', tenantId: TENANT, email: 'admin@test.local', role: 'ADMIN', nom: 'Doe', prenom: 'Jane' },
  SECRET,
  { expiresIn: '1h' }
);
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

let echecs = 0;
async function etape(nom, fn) {
  try {
    const r = await fn();
    console.log(`  OK   ${nom}${r ? ' — ' + r : ''}`);
  } catch (e) {
    echecs++;
    console.log(`  ECHEC ${nom} — ${e.message}`);
  }
}

const antenne = arts.find(a => a.nom.startsWith('Antenne')).id;
const cable = arts.find(a => a.nom.startsWith('Cable')).id;
let kitId;

await etape('POST /api/kits (creation + nomenclature)', async () => {
  const res = await fetch(`${BASE}/api/kits`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      code: 'KIT-NAT-DIR', nom: 'Kit antenne directionnelle',
      lignes: [{ article_id: antenne, quantite: 1 }, { article_id: cable, quantite: 40 }],
    }),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  kitId = body.id;
  if (!Array.isArray(body.lignes) || body.lignes.length !== 2) {
    throw new Error(`nomenclature absente de la reponse : ${JSON.stringify(body.lignes)}`);
  }
  return `kit ${body.code}, ${body.lignes.length} lignes`;
});

await etape('GET /api/kits (lecture des nomenclatures)', async () => {
  const res = await fetch(`${BASE}/api/kits`, { headers: H });
  const body = await res.json();
  if (res.status !== 200) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  if (body.length !== 1) throw new Error(`${body.length} kit(s) au lieu de 1`);
  if (body[0].lignes?.length !== 2) throw new Error('lignes non chargees');
  if (!body[0].lignes[0].article?.nom) throw new Error('article non joint a la ligne');
  return `${body[0].lignes.length} lignes, articles joints`;
});

await etape('POST /api/kits/mouvement (sortie de 2 kits)', async () => {
  const res = await fetch(`${BASE}/api/kits/mouvement`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ code: 'KIT-NAT-DIR', quantite: 2, type: 'SORTIE', utilisateur: 'Jane Doe' }),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  if (body.mouvements.length !== 2) throw new Error(`${body.mouvements.length} mouvements au lieu de 2`);
  const stock = Object.fromEntries(body.articles.map(a => [a.nom, a.quantite_stock]));
  if (stock['Antenne directionnelle'] !== 8) throw new Error(`antenne a ${stock['Antenne directionnelle']} au lieu de 8`);
  if (stock['Cable coaxial (m)'] !== 420) throw new Error(`cable a ${stock['Cable coaxial (m)']} au lieu de 420`);
  return '2 antennes et 80 m deduits';
});

await etape('POST /api/kits/mouvement (stock insuffisant refuse)', async () => {
  const res = await fetch(`${BASE}/api/kits/mouvement`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ code: 'KIT-NAT-DIR', quantite: 99, type: 'SORTIE', utilisateur: 'Jane Doe' }),
  });
  const body = await res.json();
  if (res.status !== 409 || body.code !== 'STOCK_INSUFFISANT') {
    throw new Error(`HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  return `${body.manques.length} composant(s) manquant(s)`;
});

await etape('DELETE /api/kits/[id]', async () => {
  const res = await fetch(`${BASE}/api/kits/${kitId}`, { method: 'DELETE', headers: H });
  if (res.status !== 204) throw new Error(`HTTP ${res.status}`);
  return 'supprime';
});

console.log(echecs === 0 ? '\nTOUT PASSE contre le build de production' : `\n${echecs} ECHEC(S)`);
process.exit(echecs === 0 ? 0 : 1);
