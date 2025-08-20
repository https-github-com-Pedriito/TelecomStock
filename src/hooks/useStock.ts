import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Article, Mouvement } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useStock() {
  const [articles, setArticles] = useLocalStorage<Article[]>('articles', []);
  const [mouvements, setMouvements] = useLocalStorage<Mouvement[]>('mouvements', []);

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

  return {
    articles,
    mouvements,
    addArticle,
    updateArticle,
    deleteArticle,
    addMouvement,
    getArticleByCodeBarres,
    getArticlesWithAlerts,
    getMouvementsWithArticles,
  };
}