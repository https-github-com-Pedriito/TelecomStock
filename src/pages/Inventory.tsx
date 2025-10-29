import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { InventaireDetailModal } from '../components/InventaireDetailModal';
import { useInventaire } from '../hooks/useInventaire';
import { ScanLine, FileText, Filter, Edit2, Plus, History, Archive, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InventoryProps {
  articles: any[];
  currentUser: any;
  users: any[];
  getArticleByCodeBarres: (code: string) => any;
}

export function Inventory({ articles, currentUser, users, getArticleByCodeBarres }: InventoryProps) {
  const {
    inventaires,
    currentInventaire,
    currentEntries,
    loading,
    error,
    createInventaire,
    addEntry,
    deleteEntry,
    finalizeInventaire,
    clearError
  } = useInventaire();

  const [showScanner, setShowScanner] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [quantite, setQuantite] = useState<number>(0);
  const [commentaire, setCommentaire] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  // États pour la création d'inventaire
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInventaireName, setNewInventaireName] = useState('');
  const [newInventaireDescription, setNewInventaireDescription] = useState('');
  
  // État pour l'historique
  const [showHistory, setShowHistory] = useState(false);
  
  // État pour la modale de détails
  const [selectedInventaire, setSelectedInventaire] = useState<any>(null);

  // Auto-générer le nom d'inventaire par défaut
  useEffect(() => {
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });
    const year = now.getFullYear();
    setNewInventaireName(`Inventaire ${month} ${year}`);
    setNewInventaireDescription(`Inventaire mensuel de ${month} ${year}`);
  }, []);

  const handleCreateInventaire = async () => {
    if (!newInventaireName.trim()) return;
    
    try {
      const now = new Date();
      await createInventaire({
        nom: newInventaireName,
        description: newInventaireDescription,
        mois: now.getMonth() + 1,
        annee: now.getFullYear()
      });
      setShowCreateForm(false);
      setNewInventaireName('');
      setNewInventaireDescription('');
    } catch (err) {
      console.error('Erreur création inventaire:', err);
    }
  };

  const submitCount = async () => {
    if (!selectedArticleId) {
      alert('Sélectionnez un article');
      return;
    }
    
    if (!currentInventaire) {
      alert('Créez d\'abord un inventaire');
      return;
    }
    
    try {
      await addEntry({
        article_id: selectedArticleId,
        quantite_comptee: quantite,
        commentaire: commentaire || undefined
      });
      
      // Réinitialiser le formulaire
      setSelectedArticleId('');
      setQuantite(0);
      setCommentaire('');
      setEditingEntry(null);
      
      alert('Comptage enregistré avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      alert('Erreur lors de l\'enregistrement du comptage');
    }
  };

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const found = getArticleByCodeBarres(barcode);
    if (!found) {
      alert("Article non trouvé dans la base — impossible d'enregistrer");
      return;
    }
    setSelectedArticleId(found.id);
    setQuantite(1);
  };

  const handleEditEntry = (entry: any) => {
    setSelectedArticleId(entry.article_id);
    setQuantite(entry.quantite_comptee);
    setCommentaire(entry.commentaire || '');
    setEditingEntry(entry);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;
    
    try {
      await deleteEntry(entryId);
      alert('Entrée supprimée avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de l\'entrée');
    }
  };

  const downloadExcel = (entries: any[]) => {
    // Préparer les données pour Excel
    const headers = [
      'Article',
      'Référence',
      'Stock Théorique',
      'Quantité Comptée',
      'Différence',
      'Utilisateur',
      'Commentaire',
      'Date de Comptage'
    ];
    
    const rows = entries.map((entry: any) => {
      const article = articles.find(a => a.id === entry.article_id);
      const user = users.find(u => u.id === entry.utilisateur_id);
      const difference = entry.quantite_comptee - entry.quantite_theorique;
      
      return [
        article?.nom || 'Inconnu',
        article?.code_barres || 'N/A',
        entry.quantite_theorique,
        entry.quantite_comptee,
        difference,
        user ? `${user.prenom} ${user.nom}` : entry.utilisateur_id,
        entry.commentaire || '',
        new Date(entry.created_at).toLocaleDateString('fr-FR')
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");

    // Ajuster les largeurs de colonnes
    ws['!cols'] = [
      { wch: 30 }, // Article
      { wch: 15 }, // Code Barre
      { wch: 15 }, // Stock Théorique
      { wch: 15 }, // Quantité Comptée
      { wch: 12 }, // Différence
      { wch: 20 }, // Utilisateur
      { wch: 30 }, // Commentaire
      { wch: 15 }  // Date
    ];

    const filename = `inventaire_${currentInventaire?.nom}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleFinalize = async () => {
    if (!currentInventaire) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir finaliser l'inventaire "${currentInventaire.nom}" ? Cette action est irréversible.`)) {
      return;
    }
    
    try {
      await finalizeInventaire();
      // Télécharger le rapport final
      if (currentEntries.length > 0) {
        downloadExcel(currentEntries);
      }
      alert('Inventaire finalisé avec succès !');
    } catch (err) {
      console.error('Erreur lors de la finalisation:', err);
      alert('Erreur lors de la finalisation de l\'inventaire');
    }
  };

  if (loading && !currentInventaire) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des inventaires...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaire</h1>
          <p className="text-gray-600">
            {currentInventaire 
              ? `Inventaire en cours: ${currentInventaire.nom}`
              : "Aucun inventaire en cours — créez-en un nouveau"
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {!currentInventaire && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Nouvel inventaire
            </button>
          )}
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <History size={16} />
            Historique
          </button>

          {currentInventaire && (
            <>
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                <ScanLine size={16} />
                Scanner
              </button>
              
              {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <button 
                  onClick={handleFinalize}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <FileText size={16} />
                  Finaliser
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Historique des inventaires */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Historique des inventaires</h2>
          {inventaires.length === 0 ? (
            <p className="text-gray-500">Aucun inventaire trouvé</p>
          ) : (
            <div className="space-y-2">
              {inventaires.map(inv => (
                <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{inv.nom}</div>
                    <div className="text-sm text-gray-500">
                      {inv.description} • Créé le {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-sm mt-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        inv.statut === 'EN_COURS' ? 'bg-green-100 text-green-800' :
                        inv.statut === 'FINALISE' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inv.statut}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setSelectedInventaire(inv)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Voir détails
                    </button>
                    {inv.statut === 'FINALISE' && (
                      <Archive className="text-gray-400" size={20} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulaire de création d'inventaire */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Créer un nouvel inventaire</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'inventaire
              </label>
              <input
                type="text"
                value={newInventaireName}
                onChange={(e) => setNewInventaireName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Inventaire Janvier 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newInventaireDescription}
                onChange={(e) => setNewInventaireDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Description de l'inventaire..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateInventaire}
                disabled={!newInventaireName.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg"
              >
                Créer
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de comptage */}
      {currentInventaire && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Enregistrer un comptage</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Sélectionner un article</option>
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>{a.nom} — {a.code_barres}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <input
                type="number"
                value={quantite}
                onChange={(e) => setQuantite(parseInt(e.target.value || '0'))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Quantité"
              />
            </div>

            <div>
              <input
                type="text"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Commentaire (optionnel)"
              />
            </div>

            <div>
              <button 
                onClick={submitCount} 
                disabled={!selectedArticleId}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg"
              >
                {editingEntry ? 'Modifier' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des entrées */}
      {currentInventaire && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">
            Articles comptés ({currentEntries.length})
          </h2>
          {currentEntries.length === 0 ? (
            <p className="text-gray-500">Aucun article compté pour le moment</p>
          ) : (
            <div className="space-y-2">
              {currentEntries.map(entry => {
                const article = articles.find(a => a.id === entry.article_id);
                const user = users.find(u => u.id === entry.utilisateur_id);
                const difference = entry.quantite_comptee - entry.quantite_theorique;
                
                return (
                  <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{article?.nom || 'Article inconnu'}</div>
                      <div className="text-sm text-gray-500">
                        Théorique: {entry.quantite_theorique} • Compté: {entry.quantite_comptee}
                        {difference !== 0 && (
                          <span className={`ml-2 ${difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({difference > 0 ? '+' : ''}{difference})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Par: {user ? `${user.prenom} ${user.nom}` : entry.utilisateur_id} • 
                        Le: {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                        {entry.commentaire && ` • ${entry.commentaire}`}
                      </div>
                    </div>
                    {entry.utilisateur_id === currentUser.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title="Modifier"
                        >
                          <Edit2 size={16} className="text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          title="Supprimer"
                        >
                          <Archive size={16} className="text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-lg w-full m-4">
            <h2 className="text-lg font-semibold mb-4">Scanner un article</h2>
            <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
          </div>
        </div>
      )}

      {/* Modale de détails de l'inventaire */}
      {selectedInventaire && (
        <InventaireDetailModal
          inventaire={selectedInventaire}
          onClose={() => setSelectedInventaire(null)}
        />
      )}
    </div>
  );
}
