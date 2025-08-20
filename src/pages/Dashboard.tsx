import React from 'react';
import { Article, Mouvement } from '../types';
import { Package, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardProps {
  articles: Article[];
  mouvements: Mouvement[];
  articlesWithAlerts: Article[];
}

export function Dashboard({ articles, mouvements, articlesWithAlerts }: DashboardProps) {
  const recentMouvements = mouvements
    .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
    .slice(0, 10);

  const totalArticles = articles.length;
  const totalStock = articles.reduce((sum, article) => sum + article.quantiteStock, 0);
  const entreesDuJour = mouvements.filter(m => 
    m.type === 'ENTREE' && 
    new Date(m.dateHeure).toDateString() === new Date().toDateString()
  ).length;
  const sortiesDuJour = mouvements.filter(m => 
    m.type === 'SORTIE' && 
    new Date(m.dateHeure).toDateString() === new Date().toDateString()
  ).length;

  const categoriesStats = articles.reduce((acc, article) => {
    acc[article.categorie] = (acc[article.categorie] || 0) + article.quantiteStock;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
        <p className="text-gray-600">Vue d'ensemble de votre stock télécoms</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Articles</p>
              <p className="text-2xl font-bold text-gray-900">{totalArticles}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-teal-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entrées aujourd'hui</p>
              <p className="text-2xl font-bold text-green-600">{entreesDuJour}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sorties aujourd'hui</p>
              <p className="text-2xl font-bold text-orange-600">{sortiesDuJour}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertes Stock */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Alertes Stock</h2>
          </div>
          
          {articlesWithAlerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune alerte stock</p>
          ) : (
            <div className="space-y-3">
              {articlesWithAlerts.slice(0, 5).map(article => (
                <div key={article.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{article.nom}</p>
                    <p className="text-sm text-gray-600">{article.categorie}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">
                      {article.quantiteStock} / {article.seuilMinimum}
                    </p>
                  </div>
                </div>
              ))}
              {articlesWithAlerts.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{articlesWithAlerts.length - 5} autres alertes
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stock par Catégorie */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Stock par Catégorie</h2>
          
          <div className="space-y-3">
            {Object.entries(categoriesStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([categorie, quantite]) => (
                <div key={categorie} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate flex-1">{categorie}</span>
                  <span className="text-sm font-medium text-gray-900 ml-2">{quantite}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Derniers Mouvements */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Derniers Mouvements</h2>
        
        {recentMouvements.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun mouvement enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Article</th>
                  <th className="text-left py-2">Quantité</th>
                  <th className="text-left py-2">Utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {recentMouvements.map(mouvement => {
                  const article = articles.find(a => a.id === mouvement.articleId);
                  return (
                    <tr key={mouvement.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        {format(new Date(mouvement.dateHeure), 'dd/MM HH:mm', { locale: fr })}
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          mouvement.type === 'ENTREE' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {mouvement.type}
                        </span>
                      </td>
                      <td className="py-2">{article?.nom || 'Article supprimé'}</td>
                      <td className="py-2">{mouvement.quantite}</td>
                      <td className="py-2">{mouvement.utilisateur}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}