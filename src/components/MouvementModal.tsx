import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { X, ArrowUpDown, ScanLine } from 'lucide-react';

interface MouvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mouvement: {
    articleId: string;
    quantite: number;
    type: 'ENTREE' | 'SORTIE';
    utilisateur: string;
    projet?: string;
    technicien?: string;
    commentaire?: string;
  }) => void;
  article?: Article;
  type: 'ENTREE' | 'SORTIE';
}

// Interface simplifiée pour le scan rapide, pas besoin de projets ou techniciens

export function MouvementModal({ isOpen, onClose, onSave, article, type }: MouvementModalProps) {
  const [formData, setFormData] = useState({
    quantite: 1,
    utilisateur: 'Utilisateur actuel',
    commentaire: '',
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setFormData({
      quantite: 1,
      utilisateur: 'Utilisateur actuel',
      commentaire: '',
    });
    setShowDetails(false);
  }, [article, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;

    // Pour les articles de démonstration, on simule juste l'enregistrement
    if (article.id.startsWith('demo-')) {
      alert(`Mouvement ${type} simulé pour l'article: ${article.nom}`);
      onClose();
      return;
    }
    onSave({
      articleId: article.id,
      type,
      ...formData,
    });
    onClose();
  };

  if (!isOpen || !article) return null;

  const isStockSufficient = type === 'ENTREE' || formData.quantite <= article.quantiteStock;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={20} className={type === 'ENTREE' ? 'text-green-600' : 'text-orange-600'} />
            <h2 className="text-xl font-semibold">
              {type === 'ENTREE' ? 'Entrée de stock' : 'Sortie de stock'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Article Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900">{article.nom}</h3>
            <p className="text-sm text-gray-600">{article.categorie}</p>
            <div className="flex items-center gap-2 mt-2">
              <ScanLine size={16} className="text-gray-400" />
              <span className="text-sm font-mono">{article.codeBarres}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Stock actuel: <span className="font-medium">{article.quantiteStock}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contrôle de quantité avec boutons + et - */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité *
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantite: Math.max(1, prev.quantite - 1) }))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl font-bold"
                >
                  -
                </button>
                <div className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max={type === 'SORTIE' ? article.quantiteStock : undefined}
                    value={formData.quantite}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl ${
                      !isStockSufficient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    required
                  />
                  <p className="text-sm text-gray-500 text-center mt-1">
                    Stock actuel: {article.quantiteStock}
                    {type === 'ENTREE' && ` → ${article.quantiteStock + formData.quantite}`}
                    {type === 'SORTIE' && ` → ${article.quantiteStock - formData.quantite}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantite: prev.quantite + 1 }))}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xl font-bold"
                >
                  +
                </button>
              </div>
              {!isStockSufficient && (
                <p className="text-sm text-red-600 mt-1">Stock insuffisant</p>
              )}
            </div>

            {/* Bouton pour afficher plus de détails */}
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showDetails ? 'Masquer les détails' : 'Ajouter des détails'}
            </button>

            {/* Section détails */}
            {showDetails && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commentaire
                  </label>
                  <textarea
                    value={formData.commentaire}
                    onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Commentaire optionnel..."
                  />
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!isStockSufficient}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  isStockSufficient 
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirmer le {type === 'ENTREE' ? 'dépôt' : 'retrait'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}