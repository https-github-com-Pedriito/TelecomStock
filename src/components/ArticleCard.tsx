import React,{ useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BarcodeGenerator } from './BarcodeGenerator';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Article, Mouvement } from '../types';
import { api } from '../lib/api';
import { Package, MapPin, AlertTriangle, Edit2, Trash2, Printer, Download } from 'lucide-react';
interface ArticleCardProps {
  article: Article;
  onEdit?: (article: Article) => void;
  onDelete?: (id: string, force?: boolean) => Promise<void>;
  onPrintLabel: (article: Article) => void;
  canDelete?: boolean; // Nouvelle prop pour contrôler la visibilité du bouton supprimer
  canViewPrice?: boolean; // Nouvelle prop pour contrôler l'affichage des prix
}

export function ArticleCard({ article, onEdit, onDelete, onPrintLabel, canDelete = false, canViewPrice = true }: ArticleCardProps) {
  const isLowStock = article.quantite_stock <= article.seuil_minimum;
  // Afficher les codes-barres pour tous
  const canShowBarcode = true;
  
  // État pour le modal de confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    hasMovements: boolean;
    movementCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        // Afficher le modal de confirmation avec les détails
        setDeleteInfo({
          hasMovements: true,
          movementCount: parseInt(error.data.details.match(/\d+/)?.[0] || '0')
        });
        setShowDeleteModal(true);
        return; // Important: arrêter ici pour ne pas propager l'erreur
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
      console.log('Début de la suppression forcée pour l\'article:', article.id);
      
      // 1. Récupérer tous les mouvements
      const mouvements: Mouvement[] = await api.getMouvements();
      console.log('Mouvements récupérés:', mouvements.length);
      
      // 2. Filtrer les mouvements associés à cet article
      const mouvementsArticle = mouvements.filter((m: Mouvement) => m.article.id === article.id);
      console.log('Mouvements associés à l\'article:', mouvementsArticle.length);
      
      // 3. Supprimer chaque mouvement un par un
      for (const mouvement of mouvementsArticle) {
        console.log('Suppression du mouvement:', mouvement.id);
        await api.deleteMouvement(mouvement.id);
      }
      
      // 4. Supprimer l'article
      console.log('Suppression de l\'article:', article.id);
      await onDelete(article.id, true);
      
      toast.success(`Article supprimé avec succès`, {
        position: "top-right",
        autoClose: 3000,
      });
    } catch (error: any) {
      console.error('Erreur lors de la suppression forcée:', error.message);
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

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md ${
      isLowStock ? 'border-l-2 border-orange-500' : ''
    }`}>
      <div className="p-1.5 md:p-3">
        <div className="flex justify-between items-start mb-1 md:mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xs md:text-base font-semibold text-gray-900 dark:text-white md:truncate">{article.nom}</h3>
            <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">{article.categorie}</p>
          </div>
          <button
            onClick={() => onPrintLabel(article)}
            className="hidden md:block p-0.5 md:p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
            title="Imprimer étiquette"
          >
            <Printer size={10} className="md:w-4 md:h-4" />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(article)}
              className="p-0.5 md:p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded transition-colors"
              title="Modifier"
            >
              <Edit2 size={10} className="md:w-4 md:h-4" />
            </button>
          )}
          {onDelete && canDelete && (
            <button
              onClick={handleDelete}
              className="p-0.5 md:p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 size={10} className="md:w-4 md:h-4" />
            </button>
          )}
        </div>
      </div>

  <div className="space-y-1 px-1.5 pb-1.5">
        {/* Image ronde - visible sur mobile et desktop */}
        {article.image_url && (
          <div className="flex items-center justify-center py-1 md:hidden">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center p-0.5">
              <img
                src={article.image_url}
                alt={article.nom}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
        
        {canShowBarcode && (
          <div className="hidden md:flex items-center gap-1 py-1 bg-gray-50 dark:bg-gray-700 rounded">
            {/* Code-barres à gauche */}
            <div className="flex flex-col items-center flex-1">
              <div id={`barcode-container-${article.id}`} className="mb-0.5 scale-50">
                <BarcodeGenerator value={article.code_barres || article.id || ''} />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 mb-0.5">
                {article.code_barres || 'Auto'}
              </span>
              <div className="flex gap-0.5">
                <button
                  className="px-1 py-0.5 text-[9px] bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-0.5"
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
                  title="Imprimer le code-barres"
                >
                  <Printer size={10} className="md:hidden" />
                  <span className="hidden md:inline">Imprimer</span>
                </button>
                <button
                  className="px-1 py-0.5 text-[9px] bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-0.5"
                  onClick={() => {
                    const container = document.getElementById(`barcode-container-${article.id}`);
                    if (!container) {
                      alert('Impossible de trouver le code-barres.');
                      return;
                    }
                    const canvas = container.querySelector('canvas');
                    if (!canvas) {
                      alert('Le code-barres n\'est pas généré.');
                      return;
                    }
                    try {
                      const dataUrl = canvas.toDataURL('image/png');
                      if (!dataUrl.startsWith('data:image/png')) {
                        toast.error('Erreur lors de la génération de l\'image.');
                        return;
                      }
                      const link = document.createElement('a');
                      link.download = `barcode-${article.code_barres || article.id}.png`;
                      link.href = dataUrl;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast.success('Le code-barres a bien été téléchargé.');
                    } catch (err) {
                      toast.error('Erreur lors du téléchargement du code-barres.');
                    }
                  }}
                  title="Télécharger le code-barres"
                >
                  <Download size={10} className="md:hidden" />
                  <span className="hidden md:inline">Télécharger</span>
                </button>
              </div>
            </div>
            
            {/* Image ronde à droite - visible sur desktop uniquement */}
            {article.image_url && (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-50 border border-gray-200 flex items-center justify-center p-0.5">
                  <img
                    src={article.image_url}
                    alt={article.nom}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Stock et localisation */}
        <div className="grid grid-cols-2 gap-1 md:gap-2">
          <div className={`flex items-center gap-1 md:gap-2 text-xs p-1 md:p-2 rounded ${
            isLowStock ? 'bg-orange-50' : 'bg-green-50'
          }`}>
            <Package size={10} className={`${isLowStock ? 'text-orange-600' : 'text-green-600'} md:w-5 md:h-5`} />
            <div className="flex flex-col">
              <span className="text-[9px] md:text-xs text-gray-500">Stock</span>
              <span className={`font-semibold text-[10px] md:text-sm ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                {article.quantite_stock}
              </span>
            </div>
            {isLowStock && (
              <AlertTriangle size={8} className="text-orange-500 ml-auto md:w-4 md:h-4" />
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2 text-xs p-1 md:p-2 rounded bg-blue-50">
            <MapPin size={10} className="text-blue-600 flex-shrink-0 md:w-5 md:h-5" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] md:text-xs text-gray-500">Lieu</span>
              <span className="text-[9px] md:text-xs text-gray-700 font-medium truncate">{article.localisation}</span>
            </div>
          </div>
        </div>

        {canViewPrice && article.prix_unitaire !== undefined && article.prix_unitaire > 0 && (
          <div className="flex items-center justify-between text-[10px] md:text-sm bg-blue-50 p-1 md:p-2 rounded">
            <span className="text-gray-700">Prix:</span>
            <span className="font-semibold text-blue-700">
              {article.prix_unitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}

        {canViewPrice && article.prix_unitaire !== undefined && article.prix_unitaire > 0 && (
          <div className="flex items-center justify-between text-[10px] md:text-sm bg-green-50 p-1 md:p-2 rounded">
            <span className="text-gray-700">Valeur:</span>
            <span className="font-semibold text-green-700">
              {(article.quantite_stock * article.prix_unitaire).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-[9px] md:text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">Fournisseur: {article.fournisseur}</span>
          <div className="font-mono bg-gray-100 dark:bg-gray-700 px-1 md:px-2 py-0.5 md:py-1 rounded text-[8px] md:text-xs text-gray-700 dark:text-gray-300">
            {article.code_barres || 'N/A'}
          </div>
        </div>
      </div>
      
      {/* Modal de confirmation de suppression */}
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