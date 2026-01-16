import React,{ useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BarcodeGenerator } from './BarcodeGenerator';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Article, Mouvement } from '../types';
import { api } from '../lib/api';
import { Package, MapPin, AlertTriangle, Edit2, Trash2, Printer, Download, Euro, TrendingUp, Barcode } from 'lucide-react';
interface ArticleCardProps {
  article: Article;
  onEdit?: (article: Article) => void;
  onDelete?: (id: string, force?: boolean) => Promise<void>;
  onPrintLabel: (article: Article) => void;
  canDelete?: boolean;
  canViewPrice?: boolean;
}

export function ArticleCard({ article, onEdit, onDelete, onPrintLabel, canDelete = false, canViewPrice = true }: ArticleCardProps) {
  const isLowStock = article.quantite_stock <= article.seuil_minimum;
  const isOutOfStock = article.quantite_stock === 0;
  const canShowBarcode = true;
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    hasMovements: boolean;
    movementCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete(article.id, false);
      toast.success('Article supprimé avec succès', {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      if (error.canForceDelete) {
        setDeleteInfo({
          hasMovements: true,
          movementCount: parseInt(error.data.details.match(/\d+/)?.[0] || '0')
        });
        setShowDeleteModal(true);
        return;
      } else {
        toast.error('Erreur lors de la suppression de l\'article', {
          position: "top-right",
          autoClose: 5000,
        });
      }
    }
  };

  const handleForceDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      const mouvements: Mouvement[] = await api.getMouvements();
      const mouvementsArticle = mouvements.filter((m: Mouvement) => m.article.id === article.id);
      
      for (const mouvement of mouvementsArticle) {
        await api.deleteMouvement(mouvement.id);
      }
      
      await onDelete(article.id, true);
      
      toast.success(`Article supprimé avec succès`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      toast.error(`Erreur lors de la suppression`, {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteInfo(null);
    }
  };

  const stockPercentage = ((article.quantite_stock / Math.max(article.seuil_minimum * 2, 10)) * 100);
  const totalValue = (Number(article.quantite_stock) || 0) * (Number(article.prix_unitaire) || 0);

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-lg md:rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border ${
      isOutOfStock 
        ? 'border-red-200 dark:border-red-800' 
        : isLowStock 
          ? 'border-orange-200 dark:border-orange-800' 
          : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Badge de statut */}
      {(isOutOfStock || isLowStock) && (
        <div className={`absolute top-2 right-2 md:top-3 md:right-3 z-10 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-semibold flex items-center gap-0.5 md:gap-1 ${
          isOutOfStock
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
        }`}>
          <AlertTriangle className="w-2.5 h-2.5 md:w-3 md:h-3" />
          <span className="hidden md:inline">{isOutOfStock ? 'Rupture' : 'Stock bas'}</span>
        </div>
      )}

      {/* Image de l'article */}
      <div className="relative aspect-square md:h-40 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-2 md:p-4">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.nom}
            className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%239ca3af"%3EImage%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <Package className="w-10 h-10 md:w-16 md:h-16 mb-1 md:mb-2" />
            <span className="text-xs md:text-sm font-medium">Aucune image</span>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="p-2.5 md:p-4 space-y-2 md:space-y-3">
        {/* Titre et catégorie */}
        <div>
          <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-2" title={article.nom}>
            {article.nom}
          </h3>
          <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {article.categorie}
          </span>
        </div>

        {/* Indicateur de stock visuel - Compact sur mobile */}
        <div className="space-y-1 md:space-y-1.5">
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Stock</span>
            <span className={`font-bold ${
              isOutOfStock 
                ? 'text-red-600 dark:text-red-400' 
                : isLowStock 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-green-600 dark:text-green-400'
            }`}>
              {article.quantite_stock} <span className="hidden md:inline">unités</span>
            </span>
          </div>
          <div className="relative w-full h-1.5 md:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                isOutOfStock
                  ? 'bg-red-500'
                  : isLowStock
                    ? 'bg-orange-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
            <span>Seuil: {article.seuil_minimum}</span>
          </div>
        </div>

        {/* Informations secondaires - Plus compact sur mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
          {/* Localisation */}
          <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="p-1 md:p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Lieu</p>
              <p className="text-[10px] md:text-xs font-semibold text-gray-900 dark:text-white truncate" title={article.localisation}>
                {article.localisation}
              </p>
            </div>
          </div>

          {/* Fournisseur - Caché sur mobile */}
          <div className="hidden md:flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="p-1 md:p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
              <Package className="w-3 h-3 md:w-4 md:h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400">Fourni.</p>
              <p className="text-[10px] md:text-xs font-semibold text-gray-900 dark:text-white truncate" title={article.fournisseur}>
                {article.fournisseur}
              </p>
            </div>
          </div>
        </div>

        {/* Prix et valeur - Plus compact sur mobile, caché sur mobile */}
        {canViewPrice && (
          <div className="hidden md:grid grid-cols-2 gap-1.5 md:gap-2 pt-1.5 md:pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-0.5 md:gap-1 mb-0.5 md:mb-1">
                <Euro className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-600 dark:text-blue-400" />
                <p className="text-[9px] md:text-xs text-gray-600 dark:text-gray-400 font-medium">Prix unit.</p>
              </div>
              <p className="text-xs md:text-sm font-bold text-blue-700 dark:text-blue-300">
                {(article.prix_unitaire || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div className="text-center p-1.5 md:p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-0.5 md:gap-1 mb-0.5 md:mb-1">
                <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-green-600 dark:text-green-400" />
                <p className="text-[9px] md:text-xs text-gray-600 dark:text-gray-400 font-medium">Valeur</p>
              </div>
              <p className="text-xs md:text-sm font-bold text-green-700 dark:text-green-300">
                {totalValue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        )}

        {/* Code-barres - Simplifié sur mobile, complet sur desktop */}
        {canShowBarcode && (
          <>
            {/* Version mobile simple - juste la référence */}
            <div className="md:hidden pt-1.5 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Barcode className="w-3 h-3 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">
                  Réf: {article.code_barres || 'Code auto'}
                </span>
              </div>
            </div>

            {/* Version desktop complète avec génération */}
            <div className="hidden md:block pt-1.5 md:pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowBarcode(!showBarcode)}
              className="w-full flex items-center justify-between p-1.5 md:p-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-1.5 md:gap-2">
                <Barcode className="w-3 h-3 md:w-4 md:h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-[10px] md:text-xs font-medium text-gray-700 dark:text-gray-300">
                  {article.code_barres || 'Code auto'}
                </span>
              </div>
              <span className="text-[10px] md:text-xs text-gray-500">
                {showBarcode ? 'Masquer' : 'Afficher'}
              </span>
            </button>

            {showBarcode && (
              <div className="mt-1.5 md:mt-2 p-2 md:p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div id={`barcode-container-${article.id}`} className="flex justify-center mb-1.5 md:mb-2 scale-75 md:scale-100">
                  <BarcodeGenerator value={article.code_barres || article.id || ''} />
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <button
                    onClick={() => {
                      const container = document.getElementById(`barcode-container-${article.id}`);
                      if (!container) return;
                      const canvas = container.querySelector('canvas');
                      if (!canvas) return;
                      const win = window.open('', 'PrintBarcode');
                      if (win) {
                        win.document.write('<img src="' + canvas.toDataURL() + '" style="width:300px" />');
                        win.document.close();
                        win.focus();
                        win.print();
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-medium rounded-lg transition-colors"
                  >
                    <Printer className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline">Imprimer</span>
                  </button>
                  <button
                    onClick={() => {
                      const container = document.getElementById(`barcode-container-${article.id}`);
                      if (!container) return;
                      const canvas = container.querySelector('canvas');
                      if (!canvas) return;
                      const link = document.createElement('a');
                      link.download = `barcode-${article.code_barres || article.id}.png`;
                      link.href = canvas.toDataURL('image/png');
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('Code-barres téléchargé');
                    }}
                    className="flex-1 flex items-center justify-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] md:text-xs font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline">Télécharger</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )}
      </div>

      {/* Actions (footer) - Plus compact sur mobile */}
      <div className="px-2.5 py-2 md:px-4 md:py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-1.5 md:gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(article)}
            className="flex items-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors text-xs md:text-sm font-medium"
            title="Modifier"
          >
            <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Modifier</span>
          </button>
        )}
        {onDelete && canDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-0.5 md:gap-1 px-2 py-1 md:px-3 md:py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-xs md:text-sm font-medium"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Supprimer</span>
          </button>
        )}
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeleteInfo(null);
          }
        }}
        onConfirm={handleForceDelete}
        articleName={article.nom}
        hasMovements={deleteInfo?.hasMovements || false}
        movementCount={deleteInfo?.movementCount || 0}
        isDeleting={isDeleting}
      />
      
      <ToastContainer position="bottom-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}
