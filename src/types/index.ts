export interface Article {
  id: string;
  nom: string;
  categorie: string;
  fournisseur: string;
  localisation: string;
  seuil_minimum: number;
  quantite_stock: number;
  code_barres: string;
  created_at: Date;
  updated_at: Date;
}

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
  role: 'admin' | 'manager' | 'technicien';
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
  role: 'admin' | 'manager' | 'technicien';
  created_at: string;
  updated_at: string;
  is_active: boolean;
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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}



export interface RapportMensuel {
  mois: string;
  annee: number;
  totalEntrees: number;
  totalSorties: number;
  articlesAjoutes: number;
  mouvementsParCategorie: Record<string, { entrees: number; sorties: number }>;
  topArticles: Array<{ nom: string; quantite: number }>;
  alertesStock: number;
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

export type ViewMode = 'dashboard' | 'articles' | 'mouvements' | 'scanner' | 'historique' | 'fournisseurs' | 'utilisateurs' | 'rapports' | 'inventory';