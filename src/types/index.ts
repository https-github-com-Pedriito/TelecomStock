export interface Article {
  id: string;
  nom: string;
  categorie: string;
  fournisseur: string;
  localisation: string;
  seuilMinimum: number;
  quantiteStock: number;
  codeBarres: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mouvement {
  id: string;
  articleId: string;
  article?: Article;
  quantite: number;
  type: 'ENTREE' | 'SORTIE';
  utilisateur: string;
  projet?: string;
  technicien?: string;
  dateHeure: Date;
  commentaire?: string;
}

export interface User {
  id: string;
  nom: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIEN';
  createdAt: Date;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
  email: string;
  telephone: string;
  adresse: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface InventoryEntry {
  id: string;
  articleId: string;
  quantiteCompte: number;
  utilisateurId: string;
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