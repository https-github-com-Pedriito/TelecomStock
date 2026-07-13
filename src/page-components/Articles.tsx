import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Article, Localisation } from '../types';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleModal } from '../components/ArticleModal';
import { CSVImport } from '../components/CSVImport';
import { BarcodeGenerator } from '../components/BarcodeGenerator';
import {
  Plus, Search,
  Filter,
  Download,
  Upload,
  Package
} from 'lucide-react';

interface ArticlesProps {
  articles: Article[];
  hasPermission: (permission: string) => boolean;
  fournisseurs?: Array<{ id: string; nom: string }>;
  onAddArticle: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => Article;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onDeleteArticle: (id: string) => void;
  addNotification?: (notif: { type: 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion'; title: string; message: string; duration?: number }) => void;
}

export function Articles({ articles, hasPermission, fournisseurs = [], onAddArticle, onUpdateArticle, onDeleteArticle, addNotification }: ArticlesProps) {
  const { user } = useAuth();


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocalisation, setFilterLocalisation] = useState('');
  const [labelToPrint, setLabelToPrint] = useState<Article | null>(null);
  const [barcodesLoaded, setBarcodesLoaded] = useState(false);
  const [localisationsFromDB, setLocalisationsFromDB] = useState<Localisation[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const canManageArticles = hasPermission('manage_articles');

  // Récupération des paramètres d'URL
  const urlParams = new URLSearchParams(window.location.search);
  const shouldCreateArticle = urlParams.get('create') === 'true';
  const barcodeFromURL = urlParams.get('barcode');

  // Ouvrir automatiquement le modal si on vient du scanner
  React.useEffect(() => {
    if (shouldCreateArticle && barcodeFromURL && canManageArticles) {
      setEditingArticle(undefined);
      setIsModalOpen(true);
    }
  }, [shouldCreateArticle, barcodeFromURL, canManageArticles]);

  // S'assurer que tous les codes-barres sont générés après le chargement des articles
  React.useEffect(() => {
    if (articles.length > 0 && !barcodesLoaded) {
      // Petite temporisation pour laisser le temps aux composants de se monter
      const timer = setTimeout(() => {
        setBarcodesLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [articles, barcodesLoaded]);

  // Charger les localisations depuis l'API
  React.useEffect(() => {
    const loadLocalisations = async () => {
      try {
        const response = await api.getLocalisations();
        setLocalisationsFromDB(response);
      } catch (error) {
        console.error('Erreur lors du chargement des localisations:', error);
      }
    };

    loadLocalisations();
  }, []);

  const categories = Array.from(new Set(articles.map(a => a.categorie))).sort();
  const localisations = Array.from(new Set(articles.map(a => a.localisation))).sort();

  // Utiliser les localisations de l'API si disponibles, sinon celles des articles existants
  const availableLocalisations = localisationsFromDB.length > 0
    ? localisationsFromDB.map(loc => loc.nom).sort()
    : localisations;

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.code_barres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.fournisseur?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || article.categorie === filterCategory;
    const matchesLocalisation = !filterLocalisation || article.localisation === filterLocalisation;
    const matchesLowStock = !lowStockOnly || article.quantite_stock <= article.seuil_minimum;
    return matchesSearch && matchesCategory && matchesLocalisation && matchesLowStock;
  });

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleDeleteArticle = async (id: string) => {
    // Ne pas afficher de confirmation ici - elle est gérée dans ArticleCard
    const deletedArticle = articles.find(a => a.id === id);
    const result = await onDeleteArticle(id);
    if (addNotification) {
      addNotification({
        type: 'success',
        title: 'Article supprimé',
        message: deletedArticle ? `L'article "${deletedArticle.nom}" a été supprimé.` : 'Article supprimé.',
        duration: 5000,
      });
    }
    return result;
  };

  const handleSaveArticle = (articleData: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingArticle) {
      // Vérifier si le stock a changé
      const oldStock = editingArticle.quantite_stock;
      const newStock = articleData.quantite_stock;
      onUpdateArticle(editingArticle.id, articleData);
      // Si le stock a changé, créer un mouvement
      if (typeof newStock === 'number' && typeof oldStock === 'number' && newStock !== oldStock) {
        const type = newStock > oldStock ? 'ENTREE' : 'SORTIE';
        const quantite = Math.abs(newStock - oldStock);

        // Gestion robuste du nom d'utilisateur
        let utilisateurNom = 'Utilisateur inconnu';

        if (user && user.prenom && user.nom) {
          utilisateurNom = `${user.prenom.trim()} ${user.nom.trim()}`.trim();
        } else if (user && user.email) {
          utilisateurNom = user.email;
        }
        // Sinon, l'API utilisera les informations du token JWT

        api.createMouvement({
          article_id: editingArticle.id,
          quantite,
          type,
          utilisateur: utilisateurNom,
          commentaire: `Modification du stock via fiche article`
        });
      }
    } else {
      onAddArticle(articleData);
    }
    setEditingArticle(undefined);
  };

  const handleBulkImport = async (articlesToImport: Omit<Article, 'id' | 'created_at' | 'updated_at'>[]) => {
    // Sequential creation to avoid overwhelming the server/db
    for (const articleData of articlesToImport) {
      await onAddArticle(articleData);
    }
  };

  const handlePrintLabel = (article: Article) => {
    setLabelToPrint(article);
    // Dans une vraie app, ouvrir une fenêtre d'impression ou générer un PDF
    setTimeout(() => {
      window.print();
      setLabelToPrint(null);
    }, 100);
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Catégorie', 'Fournisseur', 'Localisation', 'Stock', 'Seuil', 'Code-barres'];
    const data = filteredArticles.map(article => [
      article.nom,
      article.categorie,
      article.fournisseur,
      article.localisation,
      article.quantite_stock,
      article.seuil_minimum,
      article.code_barres,
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `articles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-8">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Package size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Équipements
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium md:ml-12">
            Gestion fine du catalogue et des niveaux de stock
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap w-full md:w-auto">
          <button
            onClick={exportToCSV}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 glass text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95 border border-white/40 dark:border-gray-800/60 shadow-sm text-sm sm:text-base"
          >
            <Download size={18} strokeWidth={2.5} />
            <span className="hidden sm:inline">Exporter</span>
            <span className="sm:hidden">Exp.</span>
          </button>
          {canManageArticles && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 glass text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95 border border-white/40 dark:border-gray-800/60 shadow-sm text-sm sm:text-base"
              >
                <Upload size={18} strokeWidth={2.5} />
                <span className="hidden sm:inline">Importer</span>
                <span className="sm:hidden">Imp.</span>
              </button>
              <button
                onClick={() => {
                  setEditingArticle(undefined);
                  setIsModalOpen(true);
                }}
                className="flex-[2] md:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 group text-sm sm:text-base"
              >
                <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>Ajouter</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modern Filter & Search Bar */}
      <div className="glass p-3 md:p-4 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Rechercher par nom, référence ou localisation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all dark:text-white font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="relative min-w-[160px] flex-1 md:flex-none">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterCategory} // Changed from selectedCategory to filterCategory
                onChange={(e) => setFilterCategory(e.target.value)} // Changed from setSelectedCategory to setFilterCategory
                className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white font-bold text-sm appearance-none cursor-pointer"
              >
                <option value="">Familles</option> {/* Changed from "Toutes" to "" and "Tout le catalogue" to "Familles" */}
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Localisation Filter - Added this back as it was removed in the provided snippet */}
            <div className="relative min-w-[160px] flex-1 md:flex-none">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterLocalisation}
                onChange={(e) => setFilterLocalisation(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all dark:text-white font-bold text-sm appearance-none cursor-pointer"
              >
                <option value="">Zones</option>
                {availableLocalisations.map(localisation => (
                  <option key={localisation} value={localisation}>{localisation}</option>
                ))}
              </select>
            </div>

            {/* Sort Toggle (Mock for now or simple logic if applicable) */}
            {/* Note: lowStockOnly state variable is not defined in the original code,
               so this part might need further integration or removal if not used.
               Keeping it as per instruction, assuming it will be added or is a placeholder. */}
            <div className="flex items-center glass p-1 rounded-xl bg-white/40 dark:bg-gray-900/40">
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${lowStockOnly
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-500 dark:text-gray-400 hover:text-orange-500'
                  }`}
              >
                Stock critique
              </button>
            </div>
          </div>
        </div>

        {/* Status Pills / Active Filters */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Résultats:</span>
            <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-black">
              {filteredArticles.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {barcodesLoaded && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold border border-green-200/50 dark:border-green-800/50 animate-pulse-subtle">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                Scanner prêt
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Articles Desktop Grid */}
      {articles.length === 0 && !barcodesLoaded ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-4 animate-pulse-subtle">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800/50 rounded-xl" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded-full w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800/50 rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl animate-scale-in">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-blue-300 dark:text-blue-700" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun équipement trouvé</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {articles.length === 0 ? 'Commencez par ajouter votre premier équipement au stock.' : 'Ajustez vos filtres ou votre recherche pour trouver l\'équipement désiré.'}
          </p>
          {articles.length === 0 && canManageArticles && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Créer mon premier article
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredArticles.map((article, index) => (
            <div key={article.id} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
              <ArticleCard
                article={article}
                onEdit={hasPermission('edit_articles') ? handleEditArticle : undefined}
                onDelete={hasPermission('delete_articles') ? handleDeleteArticle : undefined}
                onUpdateStock={hasPermission('edit_articles') ? (updates) => onUpdateArticle(article.id, updates) : undefined}
                onPrintLabel={handlePrintLabel}
                addNotification={addNotification}
                canDelete={hasPermission('delete_articles')}
                canViewPrice={hasPermission('view_prices')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {canManageArticles && (
        <ArticleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveArticle}
          article={editingArticle}
          fournisseurs={fournisseurs}
          addNotification={addNotification}
        />
      )}

      {canManageArticles && (
        <CSVImport
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleBulkImport}
          addNotification={addNotification}
        />
      )}

      {/* Print Label (hidden, only for printing) */}
      {labelToPrint && (
        <div className="fixed top-0 left-0 w-full h-full bg-white z-50 print:relative print:z-auto hidden print:block">
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold mb-4">{labelToPrint.nom}</h2>
            <div className="mb-4">
              <BarcodeGenerator value={labelToPrint.code_barres || ''} />
            </div>
            <p className="text-sm text-gray-600">{labelToPrint.categorie}</p>
            <p className="text-sm text-gray-600">{labelToPrint.localisation}</p>
          </div>
        </div>
      )}
    </div>
  );
}