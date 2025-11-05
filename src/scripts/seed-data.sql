-- Script d'injection de données initiales pour TelecomStock

-- 1. UTILISATEURS
INSERT INTO users (email, password_hash, nom, prenom, role, is_active) VALUES
('admin@telecom.com', '$2a$10$YourHashHere', 'Admin', 'System', 'ADMIN', true),
('manager@telecom.com', '$2a$10$YourHashHere', 'Martin', 'Sophie', 'MANAGER', true),
('tech@telecom.com', '$2a$10$YourHashHere', 'Dubois', 'Pierre', 'TECHNICIEN', true)
ON CONFLICT (email) DO NOTHING;

-- 2. FOURNISSEURS
INSERT INTO fournisseurs (nom, contact, telephone, adresse) VALUES
('Orange Business', 'contact@orange-business.com', '0800 100 100', '78 rue Olivier de Serres, 75015 Paris'),
('SFR Pro', 'pro@sfr.fr', '1023', '16 rue du Général Alain de Boissieu, 75015 Paris'),
('Bouygues Telecom', 'entreprises@bouyguestelecom.fr', '1064', '13-15 avenue du Maréchal Juin, 92360 Meudon'),
('Cisco Systems', 'france@cisco.com', '+33 1 58 04 30 00', '11 rue Camille Desmoulins, 92130 Issy-les-Moulineaux'),
('Dell Technologies', 'france@dell.com', '0825 387 270', '1 rond-point Benjamin Franklin, 34000 Montpellier')
ON CONFLICT (nom) DO NOTHING;

-- 3. LOCALISATIONS
INSERT INTO localisations (nom, description, est_active) VALUES
('Entrepôt Principal', 'Entrepôt central - Zone A', true),
('Magasin Paris 15', 'Boutique Paris 15ème arrondissement', true),
('Atelier Réparation', 'Zone technique - Réparations et tests', true),
('Stock Mobile', 'Véhicule technicien - Stock mobile', true),
('Entrepôt Secondaire', 'Entrepôt annexe - Zone B', true)
ON CONFLICT (nom) DO NOTHING;

-- 4. ARTICLES
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
ON CONFLICT (code_barres) DO NOTHING;

-- 5. Quelques mouvements d'exemple
-- Note: Vous devrez ajuster les UUID selon ce qui a été créé dans votre base
-- Ces exemples sont commentés car ils nécessitent les IDs réels des articles et users

/*
INSERT INTO mouvements (article_id, type, quantite, commentaire, user_id) VALUES
('uuid-article-1', 'ENTREE', 10, 'Réception commande fournisseur Orange', 'uuid-user-manager'),
('uuid-article-1', 'SORTIE', 5, 'Vente boutique Paris 15', 'uuid-user-tech'),
('uuid-article-3', 'ENTREE', 5, 'Réception matériel réseau Cisco', 'uuid-user-manager'),
('uuid-article-8', 'SORTIE', 30, 'Distribution cartes SIM nouveaux clients', 'uuid-user-tech');
*/

-- Message de confirmation
SELECT 'Base de données initialisée avec succès !' AS message;
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS fournisseurs_count FROM fournisseurs;
SELECT COUNT(*) AS localisations_count FROM localisations;
SELECT COUNT(*) AS articles_count FROM articles;
