-- Migration pour corriger la table mouvements
-- Remplace utilisateur_id par utilisateur (string)

-- Ajouter la nouvelle colonne utilisateur
ALTER TABLE mouvements ADD COLUMN utilisateur VARCHAR(255);

-- Ajouter la colonne dateheure si elle n'existe pas
ALTER TABLE mouvements ADD COLUMN dateheure TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Migrer les données existantes (optionnel: récupérer le nom depuis users)
UPDATE mouvements SET utilisateur = 'Système - Modification stock' WHERE utilisateur IS NULL;

-- Supprimer l'ancienne colonne (après vérification)
-- ALTER TABLE mouvements DROP COLUMN utilisateur_id;
