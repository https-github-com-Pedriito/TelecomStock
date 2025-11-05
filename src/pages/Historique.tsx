import React, { useState, useMemo } from 'react';
import { Mouvement } from '../types';
import { Search, Filter, Download, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoriqueProps {
  mouvements: Mouvement[];
}

export function Historique({ mouvements }: HistoriqueProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'' | 'ENTREE' | 'SORTIE'>('');
  const [filterUser, setFilterUser] = useState('');
  const [sortField, setSortField] = useState<'dateHeure' | 'type' | 'quantite'>('dateHeure');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const mouvementsWithArticles = useMemo(() => {
    // Les mouvements ont déjà l'objet article complet selon l'interface
    return mouvements;
  }, [mouvements]);

  const users = useMemo(() => {
    return Array.from(new Set(mouvements.map(m => m.utilisateur))).sort();
  }, [mouvements]);

  const filteredMouvements = useMemo(() => {
    let filtered = mouvementsWithArticles.filter(mouvement => {
      const matchesSearch = !searchTerm || (
        mouvement.article?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mouvement.article?.code_barres.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSort = (field: 'dateHeure' | 'type' | 'quantite') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Type', 'Article', 'Code-barres', 'Quantité', 
      'Utilisateur', 'Commentaire'
    ];
    
    const data = filteredMouvements.map(mouvement => [
      format(new Date(mouvement.dateHeure), 'dd/MM/yyyy HH:mm', { locale: fr }),
      mouvement.type,
      mouvement.article?.nom || 'Article supprimé',
      mouvement.article?.code_barres || '',
      mouvement.quantite,
      mouvement.utilisateur,
      mouvement.commentaire || '',
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_mouvements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des Mouvements</h1>
          <p className="text-gray-600">{filteredMouvements.length} mouvement{filteredMouvements.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Download size={18} />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as '' | 'ENTREE' | 'SORTIE')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">Tous types</option>
                <option value="ENTREE">Entrées</option>
                <option value="SORTIE">Sorties</option>
              </select>
            </div>
          </div>

          <div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous utilisateurs</option>
              {users.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      {filteredMouvements.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 mb-4">
            {mouvements.length === 0 ? 'Aucun mouvement enregistré' : 'Aucun mouvement trouvé'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th 
                    className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('dateHeure')}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th 
                    className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      Type
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">Article</th>
                  <th 
                    className="text-left py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('quantite')}
                  >
                    <div className="flex items-center gap-2">
                      Quantité
                      <ArrowUpDown size={14} />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4">Utilisateur</th>
                  <th className="text-left py-3 px-4">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {filteredMouvements.map(mouvement => (
                  <tr key={mouvement.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm">
                      {format(new Date(mouvement.dateHeure), 'dd/MM/yy HH:mm', { locale: fr })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        mouvement.type === 'ENTREE' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {mouvement.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-sm">{mouvement.article?.nom || 'Article supprimé'}</p>
                        <p className="text-xs text-gray-500 font-mono">{mouvement.article?.code_barres}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">{mouvement.quantite}</td>
                    <td className="py-3 px-4 text-sm">{mouvement.utilisateur}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {mouvement.commentaire}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}