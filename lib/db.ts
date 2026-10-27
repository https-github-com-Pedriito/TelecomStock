import 'reflect-metadata';
import { DataSource } from 'typeorm';
// Import STATIQUE du pilote, volontaire. TypeORM le chargerait sinon par un
// `require('pg')` dynamique (PostgresDriver.loadDependencies), invisible a
// l'analyse statique : sur Vercel, le traçage de fichiers n'embarque alors pas
// `pg` dans la fonction serverless et l'application tombe en
// DriverPackageNotInstalledError, alors que tout fonctionne en local ou
// node_modules est present en entier.
import pg from 'pg';
import { User } from '@/entities/User';
import { Article } from '@/entities/Article';
import { Mouvement } from '@/entities/Mouvement';
import { Fournisseur } from '@/entities/Fournisseur';
import { Inventaire } from '@/entities/Inventaire';
import { InventaireEntry } from '@/entities/InventaireEntry';
import { Localisation } from '@/entities/Localisation';
import { Tenant } from '@/entities/Tenant';
import { Kit } from '@/entities/Kit';
import { KitLigne } from '@/entities/KitLigne';

// Singleton global pour réutiliser la connexion entre les invocations serverless
declare global {
  var _dataSource: DataSource | undefined;
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    // Pilote fourni explicitement : court-circuite le chargement dynamique de
    // TypeORM (cf. import ci-dessus).
    driver: pg,
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
    // DB_SSL='false' force l'absence de TLS meme quand DATABASE_URL est
    // defini. Sans cette echappatoire, impossible de pointer l'application
    // vers un Postgres local (conteneur de test, docker-compose) autrement
    // qu'en retirant DATABASE_URL — ce que Next rend illusoire puisqu'il
    // recharge .env par-dessus. Les hebergeurs gardent le comportement par
    // defaut : TLS des qu'une URL est fournie.
    ssl: process.env.DB_SSL === 'false'
      ? false
      : process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Article, Mouvement, Fournisseur, Inventaire, InventaireEntry, Localisation, Tenant, Kit, KitLigne],
  });
}

export async function getDb(): Promise<DataSource> {
  // En dev, le Fast Refresh de Next.js recompile les modules d'entités et crée
  // de nouvelles références de classe. La DataSource mise en cache dans `global`
  // référence alors des classes obsolètes et ne retrouve plus leurs metadata.
  // On détecte ce cas et on réinitialise la connexion.
  if (
    global._dataSource?.isInitialized &&
    !global._dataSource.hasMetadata(Tenant)
  ) {
    await global._dataSource.destroy().catch(() => {});
    global._dataSource = undefined;
  }

  if (!global._dataSource) {
    global._dataSource = createDataSource();
  }
  if (!global._dataSource.isInitialized) {
    await global._dataSource.initialize();
  }
  return global._dataSource;
}
