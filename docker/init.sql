-- Create roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technicien');

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    role user_role NOT NULL DEFAULT 'technicien',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    categorie VARCHAR(255),
    fournisseur VARCHAR(255),
    localisation VARCHAR(255),
    seuil_minimum INTEGER DEFAULT 0,
    quantite_stock INTEGER DEFAULT 0,
    code_barres VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create mouvements table
CREATE TABLE mouvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id),
    quantite INTEGER NOT NULL,
    type VARCHAR(50) CHECK (type IN ('ENTREE', 'SORTIE')),
    utilisateur VARCHAR(255),
    projet VARCHAR(255),
    technicien VARCHAR(255),
    commentaire TEXT,
    dateheure TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, nom, prenom, role)
VALUES (
    'admin@telecom.com',
    '$2b$10$rNF7kDOxjcUyL6xWmPL7B.k8jg9Gx7XJ4QQKZ5H3YZ5H3YZ5H3YZ5',
    'Admin',
    'System',
    'admin'
);

-- Insert default manager user (password: manager123)
INSERT INTO users (email, password_hash, nom, prenom, role)
VALUES (
    'manager@telecom.com',
    '$2b$10$rNF7kDOxjcUyL6xWmPL7B.k8jg9Gx7XJ4QQKZ5H3YZ5H3YZ5H3YZ5',
    'Manager',
    'Stock',
    'manager'
);

-- Insert default technicien user (password: tech123)
INSERT INTO users (email, password_hash, nom, prenom, role)
VALUES (
    'tech@telecom.com',
    '$2b$10$rNF7kDOxjcUyL6xWmPL7B.k8jg9Gx7XJ4QQKZ5H3YZ5H3YZ5H3YZ5',
    'Technicien',
    'Support',
    'technicien'
);
