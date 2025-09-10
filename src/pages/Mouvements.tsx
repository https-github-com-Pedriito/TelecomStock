import { useState, useEffect } from 'react';
import { Article, Mouvement } from '../types';
import { Package, ArrowUp, ArrowDown } from 'lucide-react';

interface MouvementsProps {
  articles: Article[];
  mouvements: Mouvement[];
  onRefreshMouvements?: () => Promise<void>;
}

export function Mouvements({ articles, mouvements, onRefreshMouvements }: MouvementsProps) {
  const [refreshKey, setRefreshKey] = useState(0); // Pour forcer le rafraîchissement du tableau
  
  // Rafraîchir les mouvements à chaque visite de la page
  useEffect(() => {
    if (onRefreshMouvements) {
      onRefreshMouvements();
    }
  }, []); // Se déclenche uniquement au montage du composant

  // Stats pour les mouvements du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vérifier que mouvements existe et initialiser les statistiques
  const mouvementsDuJour = mouvements?.filter(m => {
    const mDate = new Date(m.dateHeure);
    return mDate >= today;
  }) || [];

  const entreesJour = mouvements 
    ? mouvementsDuJour.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + m.quantite, 0)
    : 0;
    
  const sortiesJour = mouvements
    ? mouvementsDuJour.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + m.quantite, 0)
    : 0;

  // Aucune fonction de gestion n'est nécessaire ici
  // puisque nous avons retiré les fonctionnalités de scan

  return (
  <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mouvements de Stock</h1>
        <p className="text-gray-600">Enregistrez les entrées et sorties de stock</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-blue-500 text-left">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Mouvements de Stock</h2>
          <p className="text-gray-600 mb-4">Consultez l'historique des entrées et sorties de stock</p>
          <p className="text-sm text-gray-500">Pour scanner des articles, utilisez l'onglet Scanner</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-purple-500 text-left">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Statistiques</h2>
          <p className="text-gray-600 mb-4">Vue d'ensemble des mouvements</p>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <span className="text-green-600 font-bold">{entreesJour}</span>
              <p className="text-xs text-gray-500">Entrées du jour</p>
            </div>
            <div className="text-center">
              <span className="text-orange-600 font-bold">{sortiesJour}</span>
              <p className="text-xs text-gray-500">Sorties du jour</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques Rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
            <p className="text-sm text-gray-600">Articles</p>
          </div>
          <div className="text-center">
            <div className="bg-teal-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {articles.reduce((sum, a) => sum + (a.quantite_stock || 0), 0)}
            </p>
            <p className="text-sm text-gray-600">Stock Total</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <ArrowUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{entreesJour}</p>
            <p className="text-sm text-gray-600">Entrées du jour</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <ArrowDown className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{sortiesJour}</p>
            <p className="text-sm text-gray-600">Sorties du jour</p>
          </div>
        </div>
      </div>

      {/* Liste des mouvements récents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mouvements Récents</h2>
        <div className="overflow-x-auto">
          <table key={refreshKey} className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Heure</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!mouvements || mouvements.length === 0 ? (
                <tr key="no-data">
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                mouvements
                  .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
                  .map((mouvement) => {
                    const article = mouvement.article;
                    return (
                      <tr key={mouvement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(mouvement.dateHeure).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{article?.nom || 'Article inconnu'}</div>
                          <div className="text-sm text-gray-500">{article?.code_barres || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mouvement.type === 'ENTREE' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {mouvement.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mouvement.quantite}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mouvement.utilisateur}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {mouvement.commentaire || '-'}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Comment ça marche ?</h3>
        <div className="space-y-2 text-blue-800">
          <p>Consultez l'historique des mouvements de stock ici.</p>
          <p>Pour scanner des articles et effectuer des mouvements, utilisez l'onglet Scanner.</p>
        </div>
      </div>
    </div>
  );
}