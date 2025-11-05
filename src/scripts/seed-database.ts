import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import { Fournisseur } from '../entities/Fournisseur';
import { Localisation } from '../entities/Localisation';
import { Article } from '../entities/Article';
import { Mouvement } from '../entities/Mouvement';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    console.log('🔄 Connexion à la base de données...');
    await AppDataSource.initialize();
    console.log('✅ Connexion établie');

    // Repositories
    const userRepo = AppDataSource.getRepository(User);
    const fournisseurRepo = AppDataSource.getRepository(Fournisseur);
    const localisationRepo = AppDataSource.getRepository(Localisation);
    const articleRepo = AppDataSource.getRepository(Article);
    const mouvementRepo = AppDataSource.getRepository(Mouvement);

    // 1. UTILISATEURS
    console.log('\n👤 Création des utilisateurs...');
    
    const users = [
      {
        email: 'admin@telecom.com',
        password_hash: await bcrypt.hash('admin123', 10),
        nom: 'Admin',
        prenom: 'System',
        role: 'ADMIN' as const
      },
      {
        email: 'manager@telecom.com',
        password_hash: await bcrypt.hash('manager123', 10),
        nom: 'Martin',
        prenom: 'Sophie',
        role: 'MANAGER' as const
      },
      {
        email: 'tech@telecom.com',
        password_hash: await bcrypt.hash('tech123', 10),
        nom: 'Dubois',
        prenom: 'Pierre',
        role: 'TECHNICIEN' as const
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      const existing = await userRepo.findOne({ where: { email: userData.email } });
      if (!existing) {
        const user = userRepo.create(userData);
        await userRepo.save(user);
        createdUsers.push(user);
        console.log(`   ✓ ${user.email} créé`);
      } else {
        createdUsers.push(existing);
        console.log(`   ⚠ ${userData.email} existe déjà`);
      }
    }

    // 2. FOURNISSEURS
    console.log('\n🏢 Création des fournisseurs...');
    
    const fournisseurs = [
      {
        nom: 'Orange Business',
        contact: 'contact@orange-business.com',
        telephone: '0800 100 100',
        adresse: '78 rue Olivier de Serres, 75015 Paris'
      },
      {
        nom: 'SFR Pro',
        contact: 'pro@sfr.fr',
        telephone: '1023',
        adresse: '16 rue du Général Alain de Boissieu, 75015 Paris'
      },
      {
        nom: 'Bouygues Telecom',
        contact: 'entreprises@bouyguestelecom.fr',
        telephone: '1064',
        adresse: '13-15 avenue du Maréchal Juin, 92360 Meudon'
      },
      {
        nom: 'Cisco Systems',
        contact: 'france@cisco.com',
        telephone: '+33 1 58 04 30 00',
        adresse: '11 rue Camille Desmoulins, 92130 Issy-les-Moulineaux'
      },
      {
        nom: 'Dell Technologies',
        contact: 'france@dell.com',
        telephone: '0825 387 270',
        adresse: '1 rond-point Benjamin Franklin, 34000 Montpellier'
      }
    ];

    const createdFournisseurs = [];
    for (const fData of fournisseurs) {
      const existing = await fournisseurRepo.findOne({ where: { nom: fData.nom } });
      if (!existing) {
        const fournisseur = fournisseurRepo.create(fData);
        await fournisseurRepo.save(fournisseur);
        createdFournisseurs.push(fournisseur);
        console.log(`   ✓ ${fournisseur.nom} créé`);
      } else {
        createdFournisseurs.push(existing);
        console.log(`   ⚠ ${fData.nom} existe déjà`);
      }
    }

    // 3. LOCALISATIONS
    console.log('\n📍 Création des localisations...');
    
    const localisations = [
      { nom: 'Entrepôt Principal', description: 'Entrepôt central - Zone A' },
      { nom: 'Magasin Paris 15', description: 'Boutique Paris 15ème arrondissement' },
      { nom: 'Atelier Réparation', description: 'Zone technique - Réparations et tests' },
      { nom: 'Stock Mobile', description: 'Véhicule technicien - Stock mobile' },
      { nom: 'Entrepôt Secondaire', description: 'Entrepôt annexe - Zone B' }
    ];

    const createdLocalisations = [];
    for (const locData of localisations) {
      const existing = await localisationRepo.findOne({ where: { nom: locData.nom } });
      if (!existing) {
        const localisation = localisationRepo.create({ ...locData, est_active: true });
        await localisationRepo.save(localisation);
        createdLocalisations.push(localisation);
        console.log(`   ✓ ${localisation.nom} créé`);
      } else {
        createdLocalisations.push(existing);
        console.log(`   ⚠ ${locData.nom} existe déjà`);
      }
    }

    // 4. ARTICLES
    console.log('\n📦 Création des articles...');
    
    const articles = [
      {
        nom: 'iPhone 15 Pro 256GB',
        categorie: 'Smartphones',
        fournisseur: createdFournisseurs[0].nom,
        localisation: createdLocalisations[0].nom,
        seuil_minimum: 5,
        quantite_stock: 15,
        code_barres: '194253768432'
      },
      {
        nom: 'Samsung Galaxy S24 Ultra',
        description: 'Samsung Galaxy S24 Ultra 512GB Noir Titane',
        code_barre: '8806095089087',
        categorie: 'Smartphones',
        prix_achat: 1049.00,
        prix_vente: 1399.00,
        stock_min: 5,
        stock_actuel: 12,
        fournisseur: createdFournisseurs[1],
        localisation: createdLocalisations[0]
      },
      {
        nom: 'Router Cisco RV340',
        description: 'Routeur Cisco RV340 VPN avec 4 ports Gigabit',
        code_barre: '882658818479',
        categorie: 'Réseau',
        prix_achat: 280.00,
        prix_vente: 399.00,
        stock_min: 3,
        stock_actuel: 8,
        fournisseur: createdFournisseurs[3],
        localisation: createdLocalisations[0]
      },
      {
        nom: 'Switch Dell N1524',
        description: 'Switch Dell Networking N1524 24 ports Gigabit',
        code_barre: '884116298076',
        categorie: 'Réseau',
        prix_achat: 450.00,
        prix_vente: 649.00,
        stock_min: 2,
        stock_actuel: 5,
        fournisseur: createdFournisseurs[4],
        localisation: createdLocalisations[0]
      },
      {
        nom: 'Câble Ethernet Cat6 50m',
        description: 'Câble réseau Ethernet Cat6 FTP, bobine 50 mètres',
        code_barre: '3700868720245',
        categorie: 'Câbles',
        prix_achat: 35.00,
        prix_vente: 59.00,
        stock_min: 10,
        stock_actuel: 25,
        fournisseur: createdFournisseurs[3],
        localisation: createdLocalisations[0]
      },
      {
        nom: 'Casque Bluetooth Sony WH-1000XM5',
        description: 'Casque sans fil à réduction de bruit Sony WH-1000XM5',
        code_barre: '4548736142017',
        categorie: 'Accessoires',
        prix_achat: 280.00,
        prix_vente: 399.00,
        stock_min: 5,
        stock_actuel: 18,
        fournisseur: createdFournisseurs[1],
        localisation: createdLocalisations[1]
      },
      {
        nom: 'Chargeur USB-C 65W',
        description: 'Chargeur rapide USB-C Power Delivery 65W',
        code_barre: '0190199534565',
        categorie: 'Accessoires',
        prix_achat: 25.00,
        prix_vente: 45.00,
        stock_min: 20,
        stock_actuel: 45,
        fournisseur: createdFournisseurs[0],
        localisation: createdLocalisations[1]
      },
      {
        nom: 'Carte SIM Orange 4G',
        description: 'Carte SIM Orange 4G prépayée',
        code_barre: '3123600000000',
        categorie: 'Cartes SIM',
        prix_achat: 5.00,
        prix_vente: 10.00,
        stock_min: 50,
        stock_actuel: 120,
        fournisseur: createdFournisseurs[0],
        localisation: createdLocalisations[1]
      },
      {
        nom: 'Tablette iPad Air 11" 128GB',
        description: 'Apple iPad Air 11 pouces M2, Wi-Fi, 128GB',
        code_barre: '194253767459',
        categorie: 'Tablettes',
        prix_achat: 549.00,
        prix_vente: 699.00,
        stock_min: 3,
        stock_actuel: 7,
        fournisseur: createdFournisseurs[0],
        localisation: createdLocalisations[0]
      },
      {
        nom: 'Antenne 4G/5G Extérieure',
        description: 'Antenne directive 4G/5G pour amélioration signal',
        code_barre: '3760178621045',
        categorie: 'Réseau',
        prix_achat: 120.00,
        prix_vente: 189.00,
        stock_min: 2,
        stock_actuel: 6,
        fournisseur: createdFournisseurs[2],
        localisation: createdLocalisations[4]
      }
    ];

    const createdArticles = [];
    for (const artData of articles) {
      const existing = await articleRepo.findOne({ where: { code_barre: artData.code_barre } });
      if (!existing) {
        const article = articleRepo.create(artData);
        await articleRepo.save(article);
        createdArticles.push(article);
        console.log(`   ✓ ${article.nom} créé (stock: ${article.stock_actuel})`);
      } else {
        createdArticles.push(existing);
        console.log(`   ⚠ ${artData.nom} existe déjà`);
      }
    }

    // 5. MOUVEMENTS (quelques exemples)
    console.log('\n📊 Création de mouvements d\'exemple...');
    
    const mouvements = [
      {
        article: createdArticles[0],
        type: 'ENTREE' as const,
        quantite: 10,
        commentaire: 'Réception commande fournisseur Orange',
        user: createdUsers[1]
      },
      {
        article: createdArticles[0],
        type: 'SORTIE' as const,
        quantite: 5,
        commentaire: 'Vente boutique Paris 15',
        user: createdUsers[2]
      },
      {
        article: createdArticles[2],
        type: 'ENTREE' as const,
        quantite: 5,
        commentaire: 'Réception matériel réseau Cisco',
        user: createdUsers[1]
      },
      {
        article: createdArticles[7],
        type: 'SORTIE' as const,
        quantite: 30,
        commentaire: 'Distribution cartes SIM nouveaux clients',
        user: createdUsers[2]
      }
    ];

    for (const mvtData of mouvements) {
      const mouvement = mouvementRepo.create(mvtData);
      await mouvementRepo.save(mouvement);
      console.log(`   ✓ Mouvement ${mvtData.type} - ${mvtData.article.nom} (${mvtData.quantite})`);
    }

    console.log('\n✅ Base de données initialisée avec succès !');
    console.log(`
📊 Résumé:
   - ${createdUsers.length} utilisateurs
   - ${createdFournisseurs.length} fournisseurs
   - ${createdLocalisations.length} localisations
   - ${createdArticles.length} articles
   - ${mouvements.length} mouvements

🔐 Credentials de test:
   Admin:      admin@telecom.com / admin123
   Manager:    manager@telecom.com / manager123
   Technicien: tech@telecom.com / tech123
`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Connexion fermée');
  }
}

// Exécuter le script
seedDatabase()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
