// tempStock.ts - API temporaire de stockage local
import { Article, Mouvement, Fournisseur } from '../types';

class TempStockAPI {
  private articles: Article[];
  private mouvements: Mouvement[];
  private fournisseurs: Fournisseur[];

  constructor() {
    this.articles = JSON.parse(localStorage.getItem('articles') || '[]');
    this.mouvements = JSON.parse(localStorage.getItem('mouvements') || '[]');
    this.fournisseurs = JSON.parse(localStorage.getItem('fournisseurs') || '[]');
  }

  private saveArticles() {
    localStorage.setItem('articles', JSON.stringify(this.articles));
  }

  private saveMouvements() {
    localStorage.setItem('mouvements', JSON.stringify(this.mouvements));
  }

  private saveFournisseurs() {
    localStorage.setItem('fournisseurs', JSON.stringify(this.fournisseurs));
  }

  // Articles
  getArticles(): Article[] {
    return this.articles;
  }

  createArticle(article: Omit<Article, 'id' | 'created_at' | 'updated_at'>): Article {
    const newArticle: Article = {
      id: Date.now().toString(),
      ...article,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.articles.push(newArticle);
    this.saveArticles();
    return newArticle;
  }

  updateArticle(id: string, data: Partial<Article>): Article {
    const index = this.articles.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Article non trouvé');

    const updatedArticle = {
      ...this.articles[index],
      ...data,
      updatedAt: new Date()
    };
    this.articles[index] = updatedArticle;
    this.saveArticles();
    return updatedArticle;
  }

  deleteArticle(id: string): void {
    this.articles = this.articles.filter(a => a.id !== id);
    this.saveArticles();
  }

  // Fournisseurs
  getFournisseurs(): Fournisseur[] {
    return this.fournisseurs;
  }

  createFournisseur(fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>): Fournisseur {
    const newFournisseur: Fournisseur = {
      id: Date.now().toString(),
      ...fournisseur,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.fournisseurs.push(newFournisseur);
    this.saveFournisseurs();
    return newFournisseur;
  }

  updateFournisseur(id: string, data: Partial<Fournisseur>): Fournisseur {
    const index = this.fournisseurs.findIndex(f => f.id === id);
    if (index === -1) throw new Error('Fournisseur non trouvé');

    const updatedFournisseur = {
      ...this.fournisseurs[index],
      ...data,
      updatedAt: new Date()
    };
    this.fournisseurs[index] = updatedFournisseur;
    this.saveFournisseurs();
    return updatedFournisseur;
  }

  deleteFournisseur(id: string): void {
    this.fournisseurs = this.fournisseurs.filter(f => f.id !== id);
    this.saveFournisseurs();
  }

  // Mouvements
  getMouvements(): Mouvement[] {
    return this.mouvements;
  }

  createMouvement(mouvement: Omit<Mouvement, 'id' | 'created_at'>): Mouvement {
    const newMouvement: Mouvement = {
      id: Date.now().toString(),
      ...mouvement,
      dateHeure: new Date()
    };
    this.mouvements.push(newMouvement);
    this.saveMouvements();

    // Mettre à jour le stock
    const article = this.articles.find(a => a.id === mouvement.articleId);
    if (article) {
      const quantiteChange = mouvement.type === 'ENTREE' 
        ? mouvement.quantite 
        : -mouvement.quantite;
      
      this.updateArticle(article.id, {
        quantiteStock: article.quantiteStock + quantiteChange
      });
    }

    return newMouvement;
  }
}

export const tempApi = new TempStockAPI();
