import React, { useState, useEffect } from 'react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { InventaireDetailModal } from '../components/InventaireDetailModal';
import { useInventaire } from '../hooks/useInventaire';
import { ScanLine, FileText, Filter, Edit2, Plus, History, Archive, Eye, Search, List, Package, MapPin, Trash2, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  
  // États pour la nouvelle interface de saisie
  const [inputMode, setInputMode] = useState<'search' | 'scan' | 'list'>('search');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mostSearchedArticles, setMostSearchedArticles] = useState<any[]>([]);
  
  // Calculer les 3 articles les plus comptés
  useEffect(() => {
    if (currentEntries.length > 0) {
      const articleCounts = currentEntries.reduce((acc, entry) => {
        acc[entry.article_id] = (acc[entry.article_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sorted = Object.entries(articleCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([articleId]) => articles.find(a => a.id === articleId))
        .filter(Boolean);
      
      setMostSearchedArticles(sorted);
    } else {
      // Si pas d'entrées, prendre les 3 premiers articles
      setMostSearchedArticles(articles.slice(0, 3));
    }
  }, [currentEntries, articles]);
  
  // Recherche d'articles
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = articles.filter(article => 
        article.nom.toLowerCase().includes(query) ||
        article.code_barres?.toLowerCase().includes(query) ||
        article.categorie.toLowerCase().includes(query)
      ).slice(0, 5); // Limiter à 5 résultats sur mobile
      
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, articles]);

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
      toast.error('Sélectionnez un article', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }
    
    if (!currentInventaire) {
      toast.error('Créez d\'abord un inventaire', {
        position: "top-right",
        autoClose: 3000,
      });
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
      
      toast.success('Comptage enregistré avec succès', {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      toast.error('Erreur lors de l\'enregistrement du comptage', {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const found = getArticleByCodeBarres(barcode);
    if (!found) {
      alert("Article non trouvé dans la base — impossible d'enregistrer");
      return;
    }
    selectArticle(found);
  };
  
  const selectArticle = (article: any) => {
    setSelectedArticleId(article.id);
    setQuantite(article.quantite_stock || 0);
    setSearchQuery('');
    setSearchResults([]);
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
      toast.success('Entrée supprimée avec succès', {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      toast.error('Erreur lors de la suppression de l\'entrée', {
        position: "top-right",
        autoClose: 3000,
      });
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
    
    // Compter combien d'articles ont des différences
    const articlesWithDifferences = currentEntries.filter(entry => 
      entry.quantite_comptee !== entry.quantite_theorique
    ).length;
    
    // Confirmation irréversible
    const confirmMessage = articlesWithDifferences > 0
      ? `⚠️ ATTENTION - OPÉRATION IRRÉVERSIBLE ⚠️\n\n` +
        `Vous êtes sur le point de finaliser l'inventaire "${currentInventaire.nom}".\n\n` +
        `${articlesWithDifferences} article(s) présentent des différences.\n` +
        `Les stocks seront automatiquement réajustés et des mouvements seront créés.\n\n` +
        `Cette action ne peut pas être annulée.\n\n` +
        `Voulez-vous continuer ?`
      : `⚠️ ATTENTION - OPÉRATION IRRÉVERSIBLE ⚠️\n\n` +
        `Vous êtes sur le point de finaliser l'inventaire "${currentInventaire.nom}".\n\n` +
        `Aucune différence détectée.\n\n` +
        `Cette action ne peut pas être annulée.\n\n` +
        `Voulez-vous continuer ?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    let applyAdjustments = articlesWithDifferences > 0;
    
    try {
      await finalizeInventaire(applyAdjustments);
      
      // Télécharger le rapport final
      if (currentEntries.length > 0) {
        downloadExcel(currentEntries);
      }
      
      const successMessage = applyAdjustments && articlesWithDifferences > 0
        ? `Inventaire finalisé avec succès !\n${articlesWithDifferences} article(s) ont été réajustés.`
        : 'Inventaire finalisé avec succès !';
      
      alert(successMessage);
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

      {/* Formulaire de comptage amélioré */}
      {currentInventaire && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Enregistrer un comptage</h2>
          
          {/* Mode Recherche */}
          {(
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, référence ou catégorie..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              {/* Résultats de recherche (max 5 sur mobile) */}
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                  {searchResults.map(article => (
                    <button
                      key={article.id}
                      onClick={() => selectArticle(article)}
                      className="p-3 border rounded-lg hover:bg-blue-50 text-left transition-colors flex items-center gap-3"
                    >
                      {/* Image de l'article */}
                      {article.image_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex-shrink-0">
                          <img
                            src={article.image_url}
                            alt={article.nom}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package size={24} className="text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{article.nom}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={14} className="text-blue-600" />
                          {article.localisation}
                        </div>
                        <div className="text-sm text-gray-500">
                          {article.code_barres} • Stock: {article.quantite_stock}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center text-gray-500 py-8">
                  Aucun article trouvé
                </div>
              ) : (
                // Afficher les 3 articles les plus comptés quand pas de recherche
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {mostSearchedArticles.length > 0 && currentEntries.length > 0
                      ? 'Articles les plus comptés'
                      : 'Suggestions d\'articles'}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {mostSearchedArticles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => selectArticle(article)}
                        className="p-3 border rounded-lg hover:bg-blue-50 text-left transition-colors flex items-center gap-3"
                      >
                        {/* Image de l'article */}
                        {article.image_url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 flex-shrink-0">
                            <img
                              src={article.image_url}
                              alt={article.nom}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package size={24} className="text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{article.nom}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin size={14} className="text-blue-600" />
                            {article.localisation}
                          </div>
                          <div className="text-sm text-gray-500">
                            {article.code_barres} • Stock: {article.quantite_stock}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Formulaire de saisie de quantité */}
          {selectedArticleId && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3">
              <div className="font-medium text-lg">
                {articles.find(a => a.id === selectedArticleId)?.nom}
              </div>
              <div className="text-sm text-gray-600">
                Stock théorique: {articles.find(a => a.id === selectedArticleId)?.quantite_stock}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantité comptée *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantite === 0 ? '' : quantite}
                    onChange={(e) => setQuantite(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Commentaire (optionnel)</label>
                  <input
                    type="text"
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Commentaire"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={submitCount}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  {editingEntry ? 'Modifier' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => {
                    setSelectedArticleId('');
                    setQuantite(0);
                    setCommentaire('');
                    setEditingEntry(null);
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
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
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton de finalisation en bas */}
          {currentEntries.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 border-t sticky bottom-0">
              <button
                onClick={handleFinalize}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <CheckCircle size={20} />
                Finaliser et enregistrer l'inventaire
              </button>
              <p className="text-xs text-gray-600 text-center mt-2">
                ⚠️ Cette action est irréversible et mettra à jour les stocks
              </p>
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
      
      {/* Toast notifications */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
