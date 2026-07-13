export interface Article {
  id: string;
  nom: string;
  categorie: string;
  fournisseur: string;
  localisation: string;
  seuil_minimum: number;
  quantite_stock: number;
  prix_unitaire?: number;
  code_barres: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Localisation {
  id: string;
  nom: string;
  description?: string;
  type?: 'ENTREPOT' | 'VEHICULE' | 'SITE_CLIENT' | 'TECHNIQUE' | 'AUTRE';
  est_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type LocalisationInput = {
  nom: string;
  description?: string;
  type?: Localisation['type'];
  est_active: boolean;
};

export interface Mouvement {
  id: string;
  article: Article;  // L'API retourne toujours l'objet article complet
  quantite: number;
  type: 'ENTREE' | 'SORTIE';
  utilisateur: string;
  projet?: string;
  technicien?: string;
  dateHeure: Date;
  commentaire?: string;
  created_at: Date;
}

// Type pour créer un mouvement (utilisé dans le frontend)
export interface CreateMouvementData {
  article_id: string;  // Pour l'envoi à l'API
  quantite: number;
  type: 'ENTREE' | 'SORTIE';
  utilisateur: string;
  projet?: string;
  technicien?: string;
  commentaire?: string;
}

export interface UserProfile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// This is what we get from the API
export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  reset_requested_at?: string | null;
}

export type Fournisseur = {
  id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  contact: string;
}

export interface InventoryEntry {
  id: string;
  articleId: string;
  quantiteReelle: number;
  dateHeure: Date;
  utilisateur: string;
}

// Nouveaux types pour les inventaires persistants
export interface Inventaire {
  id: string;
  nom: string;
  description: string;
  statut: 'EN_COURS' | 'FINALISE' | 'ARCHIVE';
  mois: number;
  annee: number;
  created_by_user_id: string;
  finalized_by_user_id?: string;
  finalized_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: User;
  finalized_by?: User;
}

export interface InventaireEntry {
  id: string;
  inventaire_id: string;
  article_id: string;
  quantite_comptee: number;
  quantite_theorique: number;
  utilisateur_id: string;
  commentaire?: string;
  created_at: Date;
  updated_at: Date;
  inventaire?: Inventaire;
  article?: Article;
  utilisateur?: User;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}


export interface InventoryItem {
  articleId: string;
  utilisateurRole: 'MANAGER' | 'TECHNICIEN' | string;
  dateHeure: Date;
}

export interface InventoryReport {
  id: string;
  mois: number; // 1-12
  annee: number;
  items: Array<{ articleId: string; totalCompte: number; parUtilisateur: Array<{ utilisateurId: string; quantite: number }>}>
  createdBy: string; // manager id
  createdAt: Date;
}

export type ViewMode = 'dashboard' | 'adminPortal' | 'articles' | 'mouvements' | 'scanner' | 'historique' | 'fournisseurs' | 'entrepots' | 'utilisateurs' | 'rapports' | 'inventory';