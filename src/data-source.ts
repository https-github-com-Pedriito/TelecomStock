import { DataSource } from 'typeorm';
import { User } from './entities/User';
import { Article } from './entities/Article';
import { Mouvement } from './entities/Mouvement';
import { Fournisseur } from './entities/Fournisseur';
import { Inventaire } from './entities/Inventaire';
import { InventaireEntry } from './entities/InventaireEntry';
import { Localisation } from './entities/Localisation';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'adminpassword',
  database: process.env.DB_NAME || 'telecomstock',
  synchronize: true, // ⚠️ ATTENTION: true pour créer les tables automatiquement (dev only)
  logging: true,
  entities: [User, Article, Mouvement, Fournisseur, Inventaire, InventaireEntry, Localisation],
  migrations: ['src/migration/*.ts'],
  subscribers: [],
  // SSL configuration for Neon and other cloud PostgreSQL providers
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
