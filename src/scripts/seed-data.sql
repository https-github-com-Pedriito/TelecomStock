-- Script d'injection de données initiales pour TelecomStock

-- 1. UTILISATEURS
INSERT INTO users (email, password_hash, nom, prenom, role, is_active) VALUES
('admin@telecom.com', '$2a$10$YourHashHere', 'Admin', 'System', 'ADMIN', true),
('manager@telecom.com', '$2a$10$YourHashHere', 'Martin', 'Sophie', 'MANAGER', true),
('tech@telecom.com', '$2a$10$YourHashHere', 'Dubois', 'Pierre', 'TECHNICIEN', true)
ON CONFLICT (email) DO NOTHING;


-- Message de confirmation
SELECT 'Base de données initialisée avec succès !' AS message;
SELECT COUNT(*) AS users_count FROM users;
