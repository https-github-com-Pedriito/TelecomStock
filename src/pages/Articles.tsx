import React, { useState } from 'react';
import { Article } from '../types';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleModal } from '../components/ArticleModal';
import { BarcodeGenerator } from '../components/BarcodeGenerator';
import { Plus, Search, Filter, Download } from 'lucide-react';

interface ArticlesProps {
  articles: Article[];
  hasPermission: (permission: string) => boolean;
  fournisseurs?: Array<{ id: string; nom: string }>;
  onAddArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => Article;
  onUpdateArticle: (id: string, updates: Partial<Article>) => void;
  onDeleteArticle: (id: string) => void;
}

export function Articles({ articles, hasPermission, fournisseurs = [], onAddArticle, onUpdateArticle, onDeleteArticle }: ArticlesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [labelToPrint, setLabelToPrint] = useState<Article | null>(null);

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

  const categories = Array.from(new Set(articles.map(a => a.categorie))).sort();

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.codeBarres.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.fournisseur.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || article.categorie === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSaveArticle = (articleData: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingArticle) {
      onUpdateArticle(editingArticle.id, articleData);
    } else {
      onAddArticle(articleData);
    }
    setEditingArticle(undefined);
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      onDeleteArticle(id);
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
      article.quantiteStock,
      article.seuilMinimum,
      article.codeBarres,
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
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-600">{filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
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
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par nom, code-barres ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onEdit={canManageArticles ? handleEditArticle : undefined}
              onDelete={canManageArticles ? handleDeleteArticle : undefined}
              onPrintLabel={handlePrintLabel}
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
              <BarcodeGenerator value={labelToPrint.codeBarres} />
            </div>
            <p className="text-sm text-gray-600">{labelToPrint.categorie}</p>
            <p className="text-sm text-gray-600">{labelToPrint.localisation}</p>
          </div>
        </div>
      )}
    </div>
  );
}