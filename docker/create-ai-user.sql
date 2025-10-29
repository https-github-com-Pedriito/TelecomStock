-- Script de création d'un utilisateur READ-ONLY pour l'assistant IA
-- Exécution: docker exec -i telecomstock_db psql -U admin -d telecomstock < create-ai-user.sql

-- 1. Créer l'utilisateur IA avec un mot de passe
CREATE USER ai_assistant WITH PASSWORD 'ai_readonly_2024';

-- 2. Connecter à la base de données
\c telecomstock

-- 3. Révoquer tous les privilèges par défaut
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ai_assistant;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ai_assistant;
REVOKE ALL ON SCHEMA public FROM ai_assistant;

-- 4. Accorder uniquement la connexion à la base
GRANT CONNECT ON DATABASE telecomstock TO ai_assistant;

-- 5. Accorder l'usage du schéma public
GRANT USAGE ON SCHEMA public TO ai_assistant;

-- 6. Accorder SELECT uniquement sur les tables nécessaires
GRANT SELECT ON articles TO ai_assistant;
GRANT SELECT ON mouvements TO ai_assistant;
GRANT SELECT ON fournisseur TO ai_assistant;
GRANT SELECT ON localisations TO ai_assistant;
GRANT SELECT ON users TO ai_assistant; -- Pour les noms d'utilisateurs dans les mouvements

-- 7. S'assurer que les futurs objets auront aussi SELECT uniquement
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO ai_assistant;

-- 8. Vérifier les permissions
\du ai_assistant
\dp articles
\dp mouvements
\dp fournisseur
\dp localisations

-- 9. Afficher confirmation
SELECT 'Utilisateur ai_assistant créé avec succès - Droits READ-ONLY uniquement' AS status;
