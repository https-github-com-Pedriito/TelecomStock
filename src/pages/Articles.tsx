import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { Article, Localisation } from '../types';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleModal } from '../components/ArticleModal';
import { BarcodeGenerator } from '../components/BarcodeGenerator';
import { Plus, Search, Filter, Download } from 'lucide-react';

interface ArticlesProps {
  articles: Article[];
  hasPermission: (permission: string) => boolean;
  fournisseurs?: Array<{ id: string; nom: string }>;
  onAddArticle: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => Article;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onDeleteArticle: (id: string) => void;
  addNotification?: (notif: { type: 'success' | 'warning' | 'info'; title: string; message: string; duration?: number }) => void;
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
    return matchesSearch && matchesCategory && matchesLocalisation;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredArticles.length} équipement{filteredArticles.length > 1 ? 's' : ''}
            {!barcodesLoaded && articles.length > 0 && (
              <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
                ⏳ Génération des codes-barres...
              </span>
            )}
            {barcodesLoaded && articles.length > 0 && (
              <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                ✅ Codes-barres prêts
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Download size={18} />
            Exporter
          </button>
          {canManageArticles && (
            <button
              onClick={() => {
                setEditingArticle(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              Nouvel équipement
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, code-barres ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Rechercher des équipements"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  aria-label="Filtrer par catégorie"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Toutes catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={filterLocalisation}
                  onChange={(e) => setFilterLocalisation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Toutes localisations</option>
                  {availableLocalisations.map(localisation => (
                    <option key={localisation} value={localisation}>{localisation}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {articles.length === 0 && !barcodesLoaded ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4 animate-pulse-subtle">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-xl" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div className="w-32 h-32 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-800">
            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {articles.length === 0 ? 'Aucun article enregistré' : 'Aucun article trouvé'}
          </p>
          {articles.length === 0 && canManageArticles && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Créer votre premier article
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredArticles.map((article, index) => (
            <div key={article.id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <ArticleCard
                article={article}
                onEdit={hasPermission('edit_articles') ? handleEditArticle : undefined}
                onDelete={hasPermission('delete_articles') ? handleDeleteArticle : undefined}
                onPrintLabel={handlePrintLabel}
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