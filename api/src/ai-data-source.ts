import { DataSource } from 'typeorm';
import { Article } from './entities/Article';
import { Mouvement } from './entities/Mouvement';
import { Fournisseur } from './entities/Fournisseur';
import { Localisation } from './entities/Localisation';
import { User } from './entities/User';

/**
 * READ-ONLY DataSource pour l'assistant IA
 * Utilisateur: ai_assistant
 * Droits: SELECT uniquement (pas de INSERT/UPDATE/DELETE)
 */
export const AIDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: 'ai_assistant', // Utilisateur READ-ONLY
  password: 'ai_readonly_2024',
  database: process.env.DB_NAME || 'telecomstock',
  entities: [Article, Mouvement, Fournisseur, Localisation, User],
  synchronize: false, // IMPORTANT: Pas de migration avec cet utilisateur
  logging: process.env.NODE_ENV === 'development',
  // Configuration de sécurité supplémentaire
  extra: {
    statement_timeout: 120000, // Timeout de 120 secondes (2 minutes) max par requête
    query_timeout: 120000,
    idle_in_transaction_session_timeout: 120000
  }
});

// Initialisation de la connexion
export async function initAIDataSource() {
  try {
    if (!AIDataSource.isInitialized) {
      await AIDataSource.initialize();
      console.log('✅ AI DataSource (READ-ONLY) initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing AI DataSource:', error);
    throw error;
  }
}
