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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type ViewMode = 'dashboard' | 'articles' | 'mouvements' | 'scanner' | 'historique';