import React,{ useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BarcodeGenerator } from './BarcodeGenerator';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Article, Mouvement } from '../types';
import { api } from '../lib/api';
import { Package, MapPin, AlertTriangle, Edit2, Trash2, Printer } from 'lucide-react';
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
      setShowDeleteModal(false);
      setDeleteInfo(null);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${
      isLowStock ? 'border-l-4 border-orange-500' : ''
    }`}>
      {/* Image de l'article */}
      {article.image_url && (
        <div className="w-full h-48 overflow-hidden bg-gray-100">
          <img
            src={article.image_url}
            alt={article.nom}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Masquer l'image si elle ne charge pas
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{article.nom}</h3>
            <p className="text-sm text-gray-600">{article.categorie}</p>
          </div>
          <div className="flex gap-2">
          <button
            onClick={() => onPrintLabel(article)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Imprimer étiquette"
          >
            <Printer size={16} />
          </button>
          {onEdit && (
            <button
              onClick={() => onEdit(article)}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <Edit2 size={16} />
            </button>
          )}
          {onDelete && canDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

  <div className="space-y-3">
        {canShowBarcode && (
          <div className="flex flex-col items-center mb-2">
            {/* Barcode canvas */}
            <div id={`barcode-container-${article.id}`} className="mb-1">
              <BarcodeGenerator value={article.code_barres || article.id || ''} />
            </div>
            <span className="text-xs text-gray-500 mb-2">
              {article.code_barres ? `Code: ${article.code_barres}` : 'Code-barres généré depuis ID'}
            </span>
            <div className="flex gap-2">
              <button
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
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
              >Imprimer</button>
              <button
                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
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
              >Télécharger</button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package size={16} />
          <span>Stock: </span>
          <span className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
            {article.quantite_stock}
          </span>
          {isLowStock && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle size={14} />
              <span className="text-xs">Seuil atteint</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={16} />
          <span>{article.localisation}</span>
        </div>

        {canViewPrice && article.prix_unitaire !== undefined && article.prix_unitaire > 0 && (
          <div className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded">
            <span className="text-gray-700">Prix unitaire:</span>
            <span className="font-semibold text-blue-700">
              {article.prix_unitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}

        {canViewPrice && article.prix_unitaire !== undefined && article.prix_unitaire > 0 && (
          <div className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
            <span className="text-gray-700">Valeur stock:</span>
            <span className="font-semibold text-green-700">
              {(article.quantite_stock * article.prix_unitaire).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Fournisseur: {article.fournisseur}</span>
          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
            Code: {article.code_barres || 'Non défini'}
          </div>
        </div>
      </div>
      </div>
      
      {/* Modal de confirmation de suppression */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteInfo(null);
        }}
        onConfirm={handleForceDelete}
        articleName={article.nom}
        hasMovements={deleteInfo?.hasMovements || false}
        movementCount={deleteInfo?.movementCount || 0}
      />
      
      <ToastContainer position="bottom-right" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}