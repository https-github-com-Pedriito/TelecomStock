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
}

export function Articles({ articles, hasPermission, fournisseurs = [], onAddArticle, onUpdateArticle, onDeleteArticle }: ArticlesProps) {
  const { user } = useAuth();
  
  // Debug: Log user info
  console.log('Articles - User:', user);
  console.log('Articles - User role:', user?.role);
  console.log('Articles - canDelete should be:', user?.role?.toLowerCase() === 'admin');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocalisation, setFilterLocalisation] = useState('');
  const [labelToPrint, setLabelToPrint] = useState<Article | null>(null);
  const [barcodesLoaded, setBarcodesLoaded] = useState(false);
  const [localisationsFromDB, setLocalisationsFromDB] = useState<Localisation[]>([]);

  const canManageArticles = hasPermission('manage_articles');
  
  // Debug: Log du rôle utilisateur
  React.useEffect(() => {
    console.log('👤 User role:', user?.role);
    console.log('👤 Is admin:', user?.role === 'admin');
    console.log('👤 User complet:', user);
  }, [user]);
  
  // Debug: Log des articles reçus
  React.useEffect(() => {
    console.log('🏪 Page Articles - Nombre d\'articles reçus:', articles.length);
    if (articles.length > 0) {
      console.log('🏪 Premier article:', articles[0]);
    }
  }, [articles]);
  
  // Commenté pour éviter le double rafraîchissement
  // Les articles sont déjà rafraîchis par le système d'onglets dans App.tsx
  // useEffect(() => {
  //   if (onRefreshArticles) {
  //     onRefreshArticles();
  //   }
  // }, []);
  
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
        console.log(`✅ Codes-barres prêts pour ${articles.length} articles`);
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
    return await onDeleteArticle(id);
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
        
        console.log('🔍 Debug mouvement frontend:', {
          user: user,
          userExists: !!user,
          prenom: user?.prenom,
          nom: user?.nom,
          email: user?.email,
          utilisateurNom: utilisateurNom,
          type: type,
          quantite: quantite
        });
        
        api.createMouvement({
          article_id: editingArticle.id,
          quantite,
          type,
          utilisateur: utilisateurNom,
          commentaire: `Modification du stock via fiche article`
        });
      } else {
        console.log('⚠️  Mouvement non créé:', {
          newStock: newStock,
          oldStock: oldStock,
          stockChanged: newStock !== oldStock,
          userExists: !!user,
          user: user
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Articles</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}
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
              Nouvel article
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
      {filteredArticles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {articles.length === 0 ? 'Aucun article enregistré' : 'Aucun article trouvé'}
          </p>
          {articles.length === 0 && canManageArticles && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Créer votre premier article
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filteredArticles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={hasPermission('edit_articles') ? handleEditArticle : undefined}
              onDelete={hasPermission('delete_articles') ? handleDeleteArticle : undefined}
              onPrintLabel={handlePrintLabel}
              canDelete={hasPermission('delete_articles')}
              canViewPrice={hasPermission('view_prices')}
            />
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