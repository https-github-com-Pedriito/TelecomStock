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
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      
      // Gestion spécifique des erreurs API
      let errorMessage = 'Erreur lors de la suppression de l\'entrée';
      
      if (err.response?.status === 404) {
        errorMessage = 'Vous ne pouvez supprimer que vos propres entrées';
      } else if (err.response?.status === 401) {
        errorMessage = 'Vous devez être connecté pour supprimer une entrée';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 4000,
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
      // Toujours renseigner le nom complet de l'utilisateur
      const utilisateurNom = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur inconnu';
      await finalizeInventaire(applyAdjustments, utilisateurNom);
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
    <div className="space-y-8 pb-8">
      {/* Feedback d'erreur moderne */}
      {error && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4 animate-fade-in">
          <span className="font-semibold">{error}</span>
          <button onClick={clearError} className="ml-2 text-white/80 hover:text-white text-xl leading-none">×</button>
        </div>
      )}

      {/* Header sticky moderne */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 py-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={28} className="text-blue-600 dark:text-blue-400" /> Inventaire
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-base">
            {currentInventaire
              ? <span className="font-semibold text-blue-700 dark:text-blue-300">{currentInventaire.nom}</span>
              : <span className="italic">Aucun inventaire en cours — créez-en un nouveau</span>
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium shadow-sm transition-colors"
          >
            <History size={18} /> Historique
          </button>
          {!currentInventaire && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-md transition-colors"
            >
              <Plus size={18} /> Nouvel inventaire
            </button>
          )}
          {currentInventaire && (
            <>
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg font-semibold shadow-sm transition-colors"
              >
                <ScanLine size={18} /> Scanner
              </button>
              {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <button
                  onClick={handleFinalize}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors"
                >
                  <FileText size={18} /> Finaliser
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Historique des inventaires moderne */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 max-w-2xl mx-auto animate-fade-in">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Archive size={22} className="text-blue-600 dark:text-blue-400" /> Historique des inventaires
          </h2>
          {inventaires.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Aucun inventaire trouvé</p>
          ) : (
            <ol className="relative border-l-2 border-blue-200 dark:border-blue-800 ml-2 space-y-0.5">
              {inventaires.map((inv, idx) => (
                <li key={inv.id} className="mb-6 ml-6 group">
                  <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-gray-900 border-2 ${
                    inv.statut === 'EN_COURS' ? 'bg-green-500 border-green-700' :
                    inv.statut === 'FINALISE' ? 'bg-blue-500 border-blue-700' :
                    'bg-gray-400 border-gray-600'
                  }`} />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                    <div>
                      <div className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        {inv.nom}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${
                          inv.statut === 'EN_COURS' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          inv.statut === 'FINALISE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {inv.statut}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {inv.description} • <span className="italic">Créé le {new Date(inv.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center mt-2 sm:mt-0">
                      <button
                        onClick={() => setSelectedInventaire(inv)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-semibold shadow-md transition-colors"
                      >
                        <Eye size={16} /> Voir détails
                      </button>
                      {inv.statut === 'FINALISE' && (
                        <Archive className="text-gray-400 dark:text-gray-500" size={20} />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Formulaire de création d'inventaire moderne */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800 w-full max-w-md mx-auto relative">
            <button
              onClick={() => setShowCreateForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl font-bold"
              aria-label="Fermer"
            >×</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <Plus size={22} className="text-green-600 dark:text-green-400" /> Créer un nouvel inventaire
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de l'inventaire
                </label>
                <input
                  type="text"
                  value={newInventaireName}
                  onChange={(e) => setNewInventaireName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold transition-all"
                  placeholder="Ex: Inventaire Janvier 2024"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newInventaireDescription}
                  onChange={(e) => setNewInventaireDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base transition-all"
                  rows={3}
                  placeholder="Description de l'inventaire..."
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleCreateInventaire}
                  disabled={!newInventaireName.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-bold text-lg shadow-md transition-colors"
                >
                  Créer
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold text-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de comptage amélioré */}
      {currentInventaire && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Enregistrer un comptage</h2>
          
          {/* Mode Recherche */}
          {(
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, référence ou catégorie..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              {/* Résultats de recherche (max 5 sur mobile) */}
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                  {searchResults.map(article => (
                    <button
                      key={article.id}
                      onClick={() => selectArticle(article)}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors flex items-center gap-3"
                    >
                      {/* Image de l'article */}
                      {article.image_url ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0">
                          <img
                            src={article.image_url}
                            alt={article.nom}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                          <Package size={24} className="text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white">{article.nom}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                          {article.localisation}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {article.code_barres} • Stock: {article.quantite_stock}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Aucun article trouvé
                </div>
              ) : (
                // Afficher les 3 articles les plus comptés quand pas de recherche
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {mostSearchedArticles.length > 0 && currentEntries.length > 0
                      ? 'Articles les plus comptés'
                      : 'Suggestions d\'articles'}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {mostSearchedArticles.map(article => (
                      <button
                        key={article.id}
                        onClick={() => selectArticle(article)}
                        className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors flex items-center gap-3"
                      >
                        {/* Image de l'article */}
                        {article.image_url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0">
                            <img
                              src={article.image_url}
                              alt={article.nom}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                            <Package size={24} className="text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white">{article.nom}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                            {article.localisation}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="mt-6 p-6 bg-gradient-to-br from-blue-50/80 dark:from-blue-900/30 to-green-50/80 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl shadow-lg space-y-5 animate-fade-in">
              <div className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
                <Package size={22} className="text-blue-600 dark:text-blue-400" /> {articles.find(a => a.id === selectedArticleId)?.nom}
              </div>
              <div className="text-base text-gray-600 dark:text-gray-400">
                Stock théorique : <span className="font-semibold text-gray-900 dark:text-white">{articles.find(a => a.id === selectedArticleId)?.quantite_stock}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Quantité comptée *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantite === 0 ? '' : quantite}
                    onChange={(e) => setQuantite(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-5 py-3 border border-gray-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold transition-all"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Commentaire (optionnel)</label>
                  <input
                    type="text"
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    className="w-full px-5 py-3 border border-gray-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-all"
                    placeholder="Commentaire"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={submitCount}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg shadow-md transition-colors"
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
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold text-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des entrées moderne */}
      {currentInventaire && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <List size={22} className="text-blue-600 dark:text-blue-400" /> Articles comptés <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">({currentEntries.length})</span>
          </h2>
          {currentEntries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Aucun article compté pour le moment</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentEntries.map(entry => {
                const article = articles.find(a => a.id === entry.article_id);
                const user = users.find(u => u.id === entry.utilisateur_id);
                const difference = entry.quantite_comptee - entry.quantite_theorique;
                const avatar = user ? `${user.prenom[0] || ''}${user.nom[0] || ''}`.toUpperCase() : '?';
                return (
                  <div key={entry.id} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow group">
                    {/* Avatar utilisateur */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg font-bold text-blue-700 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-700">
                        {avatar}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user ? user.prenom : 'Utilisateur'}</span>
                    </div>
                    {/* Infos article */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg text-gray-900 dark:text-white truncate flex items-center gap-2">
                        {article?.nom || 'Article inconnu'}
                        {difference !== 0 && (
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${difference > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {difference > 0 ? '+' : ''}{difference}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Théorique: <span className="font-medium">{entry.quantite_theorique}</span> • Compté: <span className="font-medium">{entry.quantite_comptee}</span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Par: {user ? `${user.prenom} ${user.nom}` : entry.utilisateur_id} • Le: {new Date(entry.created_at).toLocaleDateString('fr-FR')}
                        {entry.commentaire && <span> • {entry.commentaire}</span>}
                      </div>
                    </div>
                    {/* Actions rapides */}
                    {entry.utilisateur_id === currentUser.id && (
                      <div className="flex flex-col gap-2 ml-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} className="text-blue-500 dark:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} className="text-red-500 dark:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bouton de finalisation moderne sticky */}
          {currentEntries.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50/80 dark:from-green-900/30 to-blue-50/80 dark:to-blue-900/20 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 rounded-xl shadow-inner flex flex-col items-center">
              <button
                onClick={handleFinalize}
                className="w-full max-w-xs bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-3 text-lg font-bold shadow-lg"
              >
                <CheckCircle size={24} /> Finaliser et enregistrer l'inventaire
              </button>
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-3">
                ⚠️ Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span> et mettra à jour les stocks
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg max-w-lg w-full m-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Scanner un article</h2>
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
