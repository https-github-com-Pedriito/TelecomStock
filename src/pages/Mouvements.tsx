import React, { useState, useMemo } from 'react';
import { Mouvement } from '../types';
import { Search, Filter, Download, ArrowUpDown, Calendar, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MouvementsProps {
  mouvements: Mouvement[];
}

export function Mouvements({ mouvements }: MouvementsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'' | 'ENTREE' | 'SORTIE'>('');
  const [filterUser, setFilterUser] = useState('');
  const [sortField, setSortField] = useState<'dateHeure' | 'type' | 'quantite'>('dateHeure');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Les mouvements ont déjà l'objet article complet selon l'interface
  const mouvementsWithArticles = useMemo(() => {
    return mouvements;
  }, [mouvements]);

  // Liste des utilisateurs pour le filtre
  const users = useMemo(() => {
    return Array.from(new Set(mouvements.map(m => m.utilisateur))).sort();
  }, [mouvements]);

  // Calculs des statistiques
  const stats = useMemo(() => {
    const entrees = mouvements.filter(m => m.type === 'ENTREE');
    const sorties = mouvements.filter(m => m.type === 'SORTIE');
    
    return {
      totalMouvements: mouvements.length,
      totalEntrees: entrees.reduce((sum, m) => sum + m.quantite, 0),
      totalSorties: sorties.reduce((sum, m) => sum + m.quantite, 0),
      nombreEntrees: entrees.length,
      nombreSorties: sorties.length
    };
  }, [mouvements]);

  // Filtrage et tri des mouvements
  const filteredMouvements = useMemo(() => {
    let filtered = mouvementsWithArticles.filter(mouvement => {
      const matchesSearch = !searchTerm || (
        mouvement.article?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.article?.code_barres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.utilisateur?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesType = !filterType || mouvement.type === filterType;
      const matchesUser = !filterUser || mouvement.utilisateur === filterUser;
      
      return matchesSearch && matchesType && matchesUser;
    });

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'dateHeure':
          comparison = new Date(a.dateHeure).getTime() - new Date(b.dateHeure).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'quantite':
          comparison = a.quantite - b.quantite;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [mouvementsWithArticles, searchTerm, filterType, filterUser, sortField, sortDirection]);

  // Pagination
  const paginatedMouvements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMouvements.slice(start, start + itemsPerPage);
  }, [filteredMouvements, currentPage]);

  const totalPages = Math.ceil(filteredMouvements.length / itemsPerPage);

  const handleSort = (field: 'dateHeure' | 'type' | 'quantite') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Article', 'Code-barres', 'Quantité', 'Utilisateur'];
    const csvContent = [
      headers.join(','),
      ...filteredMouvements.map(mouvement => [
        format(new Date(mouvement.dateHeure), 'dd/MM/yyyy HH:mm'),
        mouvement.type,
        mouvement.article?.nom || 'Article supprimé',
        mouvement.article?.code_barres || '',
        mouvement.quantite,
        mouvement.utilisateur
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mouvements_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mouvements de Stock</h1>
        <p className="text-gray-600">Consultez et analysez l'historique des mouvements de stock</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Mouvements</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalMouvements}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Entrées</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEntrees}</p>
              <p className="text-xs text-gray-500">{stats.nombreEntrees} mouvements</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sorties</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalSorties}</p>
              <p className="text-xs text-gray-500">{stats.nombreSorties} mouvements</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Solde Net</p>
              <p className={`text-2xl font-semibold ${stats.totalEntrees - stats.totalSorties >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalEntrees - stats.totalSorties}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Article, code-barres, utilisateur..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de mouvement
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as '' | 'ENTREE' | 'SORTIE')}
            >
              <option value="">Tous les types</option>
              <option value="ENTREE">Entrées</option>
              <option value="SORTIE">Sorties</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Utilisateur
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des mouvements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dateHeure')}
                >
                  <div className="flex items-center">
                    Date et heure
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center">
                    Type
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code-barres
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('quantite')}
                >
                  <div className="flex items-center">
                    Quantité
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedMouvements.map((mouvement) => (
                <tr key={mouvement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(mouvement.dateHeure), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      mouvement.type === 'ENTREE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {mouvement.type === 'ENTREE' ? 'Entrée' : 'Sortie'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mouvement.article?.nom || (
                      <span className="text-gray-400 italic">Article supprimé</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mouvement.article?.code_barres || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={mouvement.type === 'ENTREE' ? 'text-green-600' : 'text-red-600'}>
                      {mouvement.type === 'ENTREE' ? '+' : '-'}{mouvement.quantite}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mouvement.utilisateur}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredMouvements.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{filteredMouvements.length}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredMouvements.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun mouvement trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterType || filterUser 
              ? 'Aucun mouvement ne correspond à vos critères de recherche.'
              : 'Aucun mouvement de stock enregistré pour le moment.'
            }
          </p>
        </div>
      )}
    </div>
  );
}