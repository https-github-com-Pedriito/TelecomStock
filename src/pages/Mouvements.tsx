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
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Réinitialiser à la première page
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mouvements de Stock</h1>
        <p className="text-gray-600 dark:text-gray-400">Consultez et analysez l'historique des mouvements de stock</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Mouvements</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalMouvements}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entrées</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalEntrees}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.nombreEntrees} mouvements</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sorties</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalSorties}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stats.nombreSorties} mouvements</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solde Net</p>
              <p className={`text-2xl font-semibold ${stats.totalEntrees - stats.totalSorties >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.totalEntrees - stats.totalSorties}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Article, code-barres, utilisateur..."
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de mouvement
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as '' | 'ENTREE' | 'SORTIE')}
            >
              <option value="">Tous les types</option>
              <option value="ENTREE">Entrées</option>
              <option value="SORTIE">Sorties</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Utilisateur
            </label>
            <select
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('dateHeure')}
                >
                  <div className="flex items-center">
                    Date et heure
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center">
                    Type
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Code-barres
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('quantite')}
                >
                  <div className="flex items-center">
                    Quantité
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Utilisateur
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedMouvements.map((mouvement) => (
                <tr key={mouvement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {mouvement.article?.nom || (
                      <span className="text-gray-400 dark:text-gray-500 italic">Article supprimé</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {mouvement.article?.code_barres || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={mouvement.type === 'ENTREE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {mouvement.type === 'ENTREE' ? '+' : '-'}{mouvement.quantite}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {mouvement.utilisateur || (
                      <span className="italic text-gray-400 dark:text-gray-500">Utilisateur inconnu</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredMouvements.length > 10 && (
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Informations de pagination */}
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Affichage de{' '}
                  <span className="font-medium">
                    {filteredMouvements.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredMouvements.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{filteredMouvements.length}</span>
                  {' '}résultats
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Afficher par page:
                  </label>
                  <select
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                      <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Navigation des pages */}
              <div className="flex flex-col items-stretch md:items-center gap-3">
                {/* Indicateur de page */}
                <div className="text-sm text-gray-700 dark:text-gray-300 text-center">
                  Page <span className="font-semibold text-blue-600 dark:text-blue-400">{currentPage}</span> sur{' '}
                  <span className="font-semibold">{totalPages}</span>
                </div>

                {/* Boutons de pagination */}
                <nav className="flex items-center gap-1" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Première page"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page précédente"
                  >
                    ← Précédent
                  </button>

                  {/* Sélecteur de page */}
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  >
                    {Array.from({ length: totalPages }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Page suivante"
                  >
                    Suivant →
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Dernière page"
                  >
                    ⏭
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredMouvements.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun mouvement trouvé</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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