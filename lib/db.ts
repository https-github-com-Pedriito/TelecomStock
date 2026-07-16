import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '@/entities/User';
import { Article } from '@/entities/Article';
import { Mouvement } from '@/entities/Mouvement';
import { Fournisseur } from '@/entities/Fournisseur';
import { Inventaire } from '@/entities/Inventaire';
import { InventaireEntry } from '@/entities/InventaireEntry';
import { Localisation } from '@/entities/Localisation';
import { Tenant } from '@/entities/Tenant';

// Singleton global pour réutiliser la connexion entre les invocations serverless
declare global {
  // eslint-disable-next-line no-var
  var _dataSource: DataSource | undefined;
}

function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
    password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
    database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' || !!process.env.DATABASE_URL
      ? { rejectUnauthorized: false }
      : false,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
    entities: [User, Article, Mouvement, Fournisseur, Inventaire, InventaireEntry, Localisation, Tenant],
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
