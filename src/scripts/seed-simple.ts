import 'dotenv/config';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔄 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connexion établie\n');

    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const techHash = await bcrypt.hash('tech123', 10);

    // 1. UTILISATEURS
    console.log('👤 Création des utilisateurs...');
    await client.query(`
      INSERT INTO users (email, password_hash, nom, prenom, role, is_active) VALUES
      ('admin@telecom.com', $1, 'Admin', 'System', 'ADMIN', true),
      ('manager@telecom.com', $2, 'Martin', 'Sophie', 'MANAGER', true),
      ('tech@telecom.com', $3, 'Dubois', 'Pierre', 'TECHNICIEN', true)
      ON CONFLICT (email) DO NOTHING
    `, [adminHash, managerHash, techHash]);
    console.log('   ✓ 3 utilisateurs créés\n');

    // 2. FOURNISSEURS
    console.log('🏢 Création des fournisseurs...');
    await client.query(`
      INSERT INTO fournisseur (nom, contact, telephone, adresse) VALUES
      ('Orange Business', 'contact@orange-business.com', '0800 100 100', '78 rue Olivier de Serres, 75015 Paris'),
      ('SFR Pro', 'pro@sfr.fr', '1023', '16 rue du Général Alain de Boissieu, 75015 Paris'),
      ('Bouygues Telecom', 'entreprises@bouyguestelecom.fr', '1064', '13-15 avenue du Maréchal Juin, 92360 Meudon'),
      ('Cisco Systems', 'france@cisco.com', '+33 1 58 04 30 00', '11 rue Camille Desmoulins, 92130 Issy-les-Moulineaux'),
      ('Dell Technologies', 'france@dell.com', '0825 387 270', '1 rond-point Benjamin Franklin, 34000 Montpellier')
      ON CONFLICT (nom) DO NOTHING
    `);
    console.log('   ✓ 5 fournisseurs créés\n');

    // 3. LOCALISATIONS
    console.log('📍 Création des localisations...');
    await client.query(`
      INSERT INTO localisations (nom, description, est_active) VALUES
      ('Entrepôt Principal', 'Entrepôt central - Zone A', true),
      ('Magasin Paris 15', 'Boutique Paris 15ème arrondissement', true),
      ('Atelier Réparation', 'Zone technique - Réparations et tests', true),
      ('Stock Mobile', 'Véhicule technicien - Stock mobile', true),
      ('Entrepôt Secondaire', 'Entrepôt annexe - Zone B', true)
      ON CONFLICT (nom) DO NOTHING
    `);
    console.log('   ✓ 5 localisations créées\n');

    // 4. ARTICLES
    console.log('📦 Création des articles...');
    await client.query(`
      INSERT INTO articles (nom, categorie, fournisseur, localisation, seuil_minimum, quantite_stock, code_barres) VALUES
      ('iPhone 15 Pro 256GB', 'Smartphones', 'Orange Business', 'Entrepôt Principal', 5, 15, '194253768432'),
      ('Samsung Galaxy S24 Ultra', 'Smartphones', 'SFR Pro', 'Entrepôt Principal', 5, 12, '8806095089087'),
      ('Router Cisco RV340', 'Réseau', 'Cisco Systems', 'Entrepôt Principal', 3, 8, '882658818479'),
      ('Switch Dell N1524', 'Réseau', 'Dell Technologies', 'Entrepôt Principal', 2, 5, '884116298076'),
      ('Câble Ethernet Cat6 50m', 'Câbles', 'Cisco Systems', 'Entrepôt Principal', 10, 25, '3700868720245'),
      ('Casque Bluetooth Sony WH-1000XM5', 'Accessoires', 'SFR Pro', 'Magasin Paris 15', 5, 18, '4548736142017'),
      ('Chargeur USB-C 65W', 'Accessoires', 'Orange Business', 'Magasin Paris 15', 20, 45, '0190199534565'),
      ('Carte SIM Orange 4G', 'Cartes SIM', 'Orange Business', 'Magasin Paris 15', 50, 120, '3123600000000'),
      ('Tablette iPad Air 11" 128GB', 'Tablettes', 'Orange Business', 'Entrepôt Principal', 3, 7, '194253767459'),
      ('Antenne 4G/5G Extérieure', 'Réseau', 'Bouygues Telecom', 'Entrepôt Secondaire', 2, 6, '3760178621045')
      ON CONFLICT (code_barres) DO NOTHING
    `);
    console.log('   ✓ 10 articles créés\n');

    // Résumé
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const fournisseurCount = await client.query('SELECT COUNT(*) FROM fournisseur');
    const localisationCount = await client.query('SELECT COUNT(*) FROM localisations');
    const articleCount = await client.query('SELECT COUNT(*) FROM articles');

    console.log('✅ Base de données initialisée avec succès !\n');
    console.log('📊 Résumé:');
    console.log(`   - ${userCount.rows[0].count} utilisateurs`);
    console.log(`   - ${fournisseurCount.rows[0].count} fournisseurs`);
    console.log(`   - ${localisationCount.rows[0].count} localisations`);
    console.log(`   - ${articleCount.rows[0].count} articles\n`);
    console.log('🔐 Credentials de test:');
    console.log('   Admin:      admin@telecom.com / admin123');
    console.log('   Manager:    manager@telecom.com / manager123');
    console.log('   Technicien: tech@telecom.com / tech123\n');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Connexion fermée');
  }
}

seedDatabase()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  });
