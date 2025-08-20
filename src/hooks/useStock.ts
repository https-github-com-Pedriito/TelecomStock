import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Article, Mouvement, Fournisseur } from '../types';
import { v4 as uuidv4 } from 'uuid';

const defaultFournisseurs: Fournisseur[] = [
  {
    id: '1',
    nom: 'TelecomParts Pro',
    contact: 'Jean Dupont',
    email: 'contact@telecomparts.com',
    telephone: '01 23 45 67 89',
    adresse: '123 Rue de la Technologie, 75001 Paris',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    nom: 'Équipements Réseau France',
    contact: 'Marie Martin',
    email: 'info@equipements-reseau.fr',
    telephone: '01 98 76 54 32',
    adresse: '456 Avenue des Télécoms, 69000 Lyon',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: '3',
    nom: 'Fibre Optique Solutions',
    contact: 'Pierre Durand',
    email: 'commercial@fibre-solutions.com',
    telephone: '04 56 78 90 12',
    adresse: '789 Boulevard de l\'Innovation, 13000 Marseille',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-05'),
  },
];

export function useStock() {
  const [articles, setArticles] = useLocalStorage<Article[]>('articles', []);
  const [mouvements, setMouvements] = useLocalStorage<Mouvement[]>('mouvements', []);
  const [fournisseurs, setFournisseurs] = useLocalStorage<Fournisseur[]>('fournisseurs', defaultFournisseurs);

  const addArticle = useCallback((articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'codeBarres'>) => {
    const newArticle: Article = {
      ...articleData,
      id: uuidv4(),
      codeBarres: `TEL${Date.now()}${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setArticles(prev => [...prev, newArticle]);
    return newArticle;
  }, [setArticles]);

  const updateArticle = useCallback((id: string, updates: Partial<Article>) => {
    setArticles(prev => prev.map(article => 
      article.id === id ? { ...article, ...updates, updatedAt: new Date() } : article
    ));
  }, [setArticles]);

  const deleteArticle = useCallback((id: string) => {
    setArticles(prev => prev.filter(article => article.id !== id));
    setMouvements(prev => prev.filter(mouvement => mouvement.articleId !== id));
  }, [setArticles, setMouvements]);

  const addMouvement = useCallback((mouvementData: Omit<Mouvement, 'id' | 'dateHeure'>) => {
    const newMouvement: Mouvement = {
      ...mouvementData,
      id: uuidv4(),
      dateHeure: new Date(),
    };

    // Mettre à jour le stock de l'article
    const article = articles.find(a => a.id === mouvementData.articleId);
    if (article) {
      const newQuantite = mouvementData.type === 'ENTREE' 
        ? article.quantiteStock + mouvementData.quantite
        : article.quantiteStock - mouvementData.quantite;
      
      updateArticle(article.id, { quantiteStock: Math.max(0, newQuantite) });
    }

    setMouvements(prev => [...prev, newMouvement]);
    return newMouvement;
  }, [articles, updateArticle, setMouvements]);

  const getArticleByCodeBarres = useCallback((codeBarres: string) => {
    return articles.find(article => article.codeBarres === codeBarres);
  }, [articles]);

  const getArticlesWithAlerts = useCallback(() => {
    return articles.filter(article => article.quantiteStock <= article.seuilMinimum);
  }, [articles]);

  const getMouvementsWithArticles = useCallback(() => {
    return mouvements.map(mouvement => ({
      ...mouvement,
      article: articles.find(a => a.id === mouvement.articleId)
    }));
  }, [mouvements, articles]);

  const addFournisseur = useCallback((fournisseurData: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newFournisseur: Fournisseur = {
      ...fournisseurData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setFournisseurs(prev => [...prev, newFournisseur]);
    return newFournisseur;
  }, [setFournisseurs]);

  const updateFournisseur = useCallback((id: string, updates: Partial<Fournisseur>) => {
    setFournisseurs(prev => prev.map(fournisseur => 
      fournisseur.id === id ? { ...fournisseur, ...updates, updatedAt: new Date() } : fournisseur
    ));
  }, [setFournisseurs]);

  const deleteFournisseur = useCallback((id: string) => {
    setFournisseurs(prev => prev.filter(fournisseur => fournisseur.id !== id));
  }, [setFournisseurs]);

  return {
    articles,
    mouvements,
    fournisseurs,
    addArticle,
    updateArticle,
    deleteArticle,
    addMouvement,
    addFournisseur,
    updateFournisseur,
    deleteFournisseur,
    getArticleByCodeBarres,
    getArticlesWithAlerts,
    getMouvementsWithArticles,
  };
}