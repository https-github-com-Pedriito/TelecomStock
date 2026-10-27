/**
 * Inspection en LECTURE SEULE du schema Lakebase Postgres.
 *
 * Ne fait aucune ecriture et n'affiche jamais la chaine de connexion : elle est
 * lue depuis .env et seul l'hote, tronque, est rappele pour confirmer sur quelle
 * base on travaille.
 *
 *   node scripts/inspect-db.mjs
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

function lireEnv(fichier = '.env') {
  const env = {};
  for (const ligne of readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = lireEnv();
const url = process.env.DATABASE_URL || env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL absente de .env');
  process.exit(1);
}

// Rappel non sensible de la cible : hote seulement, sans identifiants.
const hote = new URL(url).hostname;
console.log(`Cible : ${hote.split('.').slice(0, 2).join('.')}… (identifiants masques)\n`);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = async (sql, params) => (await client.query(sql, params)).rows;

const tables = await q(`
  SELECT table_name,
         (SELECT count(*) FROM information_schema.columns c
           WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS colonnes
  FROM information_schema.tables t
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);

console.log('TABLES PUBLIQUES');
for (const t of tables) {
  const [{ n }] = await q(`SELECT count(*)::int AS n FROM public.${JSON.stringify(t.table_name).replace(/"/g, '"')}`);
  console.log(`  ${t.table_name.padEnd(22)} ${String(t.colonnes).padStart(3)} col.  ${String(n).padStart(7)} lignes`);
}

const kits = tables.some(t => t.table_name === 'kits');
const kitLignes = tables.some(t => t.table_name === 'kit_lignes');
console.log(`\nTables kits : kits=${kits ? 'PRESENTE' : 'absente'}  kit_lignes=${kitLignes ? 'PRESENTE' : 'absente'}`);

console.log('\nCOLONNES DE articles (cible des deductions)');
for (const c of await q(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'articles'
  ORDER BY ordinal_position
`)) {
  console.log(`  ${c.column_name.padEnd(18)} ${c.data_type.padEnd(28)} null=${c.is_nullable}`);
}

console.log('\nCOLONNES DE mouvements');
for (const c of await q(`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'mouvements'
  ORDER BY ordinal_position
`)) {
  console.log(`  ${c.column_name.padEnd(18)} ${c.data_type.padEnd(28)} null=${c.is_nullable}`);
}

console.log('\nINDEX SUR articles / mouvements');
for (const i of await q(`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename IN ('articles', 'mouvements')
  ORDER BY tablename, indexname
`)) {
  console.log(`  ${i.tablename}.${i.indexname}`);
}

console.log('\nVERSION POSTGRES');
console.log('  ' + (await q('SELECT version()'))[0].version.split(',')[0]);

await client.end();
