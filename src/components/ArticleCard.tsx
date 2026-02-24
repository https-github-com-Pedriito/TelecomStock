import { useState, useMemo } from 'react';
import { BarcodeGenerator } from './BarcodeGenerator';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Article, Mouvement } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import {
  Package,
  MapPin,
  AlertTriangle,
  Edit2,
  Trash2,
  Printer,
  Barcode,
  Plus as PlusIcon,
  Minus as MinusIcon
} from 'lucide-react';

interface ArticleCardProps {
  article: Article;
  onEdit?: (article: Article) => void;
  onDelete?: (id: string, force?: boolean) => Promise<void>;
  onUpdateStock?: (updates: Partial<Article>) => void;
  onPrintLabel: (article: Article) => void;
  addNotification?: (notif: { type: 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion'; title: string; message: string; duration?: number }) => void;
  canDelete?: boolean;
  canViewPrice?: boolean;
}

export function ArticleCard({
  article,
  onEdit,
  onDelete,
  onUpdateStock,
  onPrintLabel,
  addNotification,
  canDelete = false,
  canViewPrice = true
}: ArticleCardProps) {
  const { user } = useAuth();
  const isLowStock = article.quantite_stock <= article.seuil_minimum;
  const isOutOfStock = article.quantite_stock === 0;

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    hasMovements: boolean;
    movementCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete(article.id, false);
      if (addNotification) {
        addNotification({
          type: 'deletion',
          title: 'Article supprimé',
          message: `L'article "${article.nom}" a été retiré du catalogue.`
        });
      }
    } catch (error: any) {
      if (error.canForceDelete) {
        setDeleteInfo({
          hasMovements: true,
          movementCount: parseInt(error.data.details.match(/\d+/)?.[0] || '0')
        });
        setShowDeleteModal(true);
        return;
      } else {
        if (addNotification) {
          addNotification({
            type: 'error',
            title: 'Échec de la suppression',
            message: 'Une erreur est survenue lors de la suppression.'
          });
        }
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
      if (addNotification) {
        addNotification({
          type: 'deletion',
          title: 'Article & Historique supprimés',
          message: `L'article "${article.nom}" et ses mouvements ont été supprimés.`
        });
      }
    } catch (error: any) {
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur critique',
          message: 'Impossible de forcer la suppression.'
        });
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteInfo(null);
    }
  };

  const handleQuickStockChange = async (delta: number) => {
    if (!onUpdateStock || isUpdatingStock) return;

    const newStock = Math.max(0, article.quantite_stock + delta);
    if (newStock === article.quantite_stock) return;

    setIsUpdatingStock(true);
    try {
      const type = delta > 0 ? 'ENTREE' : 'SORTIE';
      let utilisateurNom = user?.email || 'Utilisateur';
      if (user?.prenom && user?.nom) utilisateurNom = `${user.prenom} ${user.nom}`;

      await api.createMouvement({
        article_id: article.id,
        quantite: Math.abs(delta),
        type,
        utilisateur: utilisateurNom,
        commentaire: `Ajustement rapide (±${Math.abs(delta)})`
      });

      onUpdateStock({ quantite_stock: newStock });

      if (addNotification) {
        const isLow = newStock <= article.seuil_minimum;
        addNotification({
          type: isLow ? 'warning' : 'success',
          title: 'Stock mis à jour',
          message: `${article.nom}: ${newStock} unités (${delta > 0 ? '+' : ''}${delta})`,
          duration: 3000
        });
      }
    } catch (error) {
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur de stock',
          message: 'La mise à jour du stock a échoué.'
        });
      }
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const stockPercentage = useMemo(() =>
    ((article.quantite_stock / Math.max(article.seuil_minimum * 2, 10)) * 100)
    , [article.quantite_stock, article.seuil_minimum]);

  return (
    <div className={`group relative glass rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border-2 animate-scale-in flex flex-col h-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-md ${isOutOfStock
      ? 'border-red-500/30'
      : isLowStock
        ? 'border-orange-500/30'
        : 'border-white/20 dark:border-gray-800/50'
      }`}>
      {/* Glow Effect */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 transition-colors duration-700 ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-blue-500'
        }`} />

      {/* Badge Status */}
      {(isOutOfStock || isLowStock) && (
        <div className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-white/20 ${isOutOfStock ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
          }`}>
          <AlertTriangle size={12} strokeWidth={3} className="animate-pulse" />
          <span>{isOutOfStock ? 'Rupture' : 'Stock bas'}</span>
        </div>
      )}

      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full bg-gray-100/50 dark:bg-gray-950/50 flex items-center justify-center overflow-hidden border-b border-white/10 dark:border-gray-800/50">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.nom}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400/50">
            <Package size={48} strokeWidth={1} />
            <span className="text-[10px] font-black uppercase mt-2 opacity-40">Aucun visuel</span>
          </div>
        )}

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button
            onClick={() => onEdit?.(article)}
            className="p-3 bg-white/20 hover:bg-white text-white hover:text-blue-600 rounded-full transition-all border border-white/30"
          >
            <Edit2 size={20} />
          </button>
          <button
            onClick={() => onPrintLabel(article)}
            className="p-3 bg-white/20 hover:bg-white text-white hover:text-green-600 rounded-full transition-all border border-white/30"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 flex-1 flex flex-col space-y-4">
        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight line-clamp-2">
            {article.nom}
          </h3>
          <span className="mt-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
            {article.categorie}
          </span>
        </div>

        <div className="flex items-center gap-2 p-2 bg-gray-50/50 dark:bg-gray-950/30 rounded-xl border border-white/20 dark:border-gray-800/50">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/20">
            <MapPin size={14} />
          </div>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate flex-1">{article.localisation}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-blue-600'
                }`}>
                {article.quantite_stock}
              </span>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Unités</span>
            </div>

            {onUpdateStock && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-white/10 dark:border-gray-700/50 shadow-inner">
                <button
                  onClick={() => handleQuickStockChange(-1)}
                  disabled={isOutOfStock || isUpdatingStock}
                  className="p-1.5 hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-500 rounded-lg transition-all disabled:opacity-30"
                >
                  <MinusIcon size={14} strokeWidth={3} />
                </button>
                <button
                  onClick={() => handleQuickStockChange(1)}
                  disabled={isUpdatingStock}
                  className="p-1.5 hover:bg-white dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-green-500 rounded-lg transition-all disabled:opacity-30"
                >
                  <PlusIcon size={14} strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-white/10 dark:border-gray-700/50">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-700 ${isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-blue-600'
                }`}
              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>Min: {article.seuil_minimum}</span>
            {canViewPrice && (
              <span className="text-blue-600 dark:text-blue-400">
                {(article.prix_unitaire || 0).toLocaleString('fr-FR')} €
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode size={14} className="text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 font-bold">{article.code_barres || article.id.slice(0, 8)}</span>
          </div>

          <button
            onClick={() => setShowBarcode(!showBarcode)}
            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${showBarcode ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-blue-600'
              }`}
          >
            {showBarcode ? 'Hide' : 'Barcode'}
          </button>
        </div>

        {showBarcode && (
          <div className="p-2 bg-white dark:bg-gray-950 rounded-xl border border-white/20 dark:border-gray-800 flex justify-center">
            <BarcodeGenerator value={article.code_barres || article.id} size={100} />
          </div>
        )}
      </div>

      {canDelete && (
        <div className="px-4 py-3 border-t border-white/10 dark:border-gray-800/50 flex justify-end">
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 transition-all active:scale-90"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

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
    </div>
  );
}
