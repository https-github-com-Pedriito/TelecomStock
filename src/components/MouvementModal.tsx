import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { X, ArrowUpDown, ScanLine } from 'lucide-react';

const categories = [
  'Équipements réseau',
  'Câbles et connecteurs',
  'Antennes',
  'Outillage',
  'Composants électroniques',
  'Accessoires',
];

const localisations = [
  'Entrepôt principal',
  'Véhicule 1',
  'Véhicule 2',
  'Site client A',
  'Site client B',
  'Magasin local',
];

interface MouvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSave may return a Promise for async operations; we accept both sync and async handlers.
  onSave: (data: {
    // Champs pour nouvel article
    nom?: string;
    categorie?: string;
    fournisseur?: string;
    localisation?: string;
    seuilMinimum?: number;
    quantiteStock?: number;
    // Champs pour mouvement
    articleId?: string;
    quantite?: number;
    type?: 'ENTREE' | 'SORTIE';
    utilisateur?: string;
    commentaire?: string;
  }) => void;
  article?: Article;
  type: 'ENTREE' | 'SORTIE';
  currentUser: { id: string; nom: string; prenom: string; };
  fournisseurs?: Array<{ id: string; nom: string; }>;
}

export function MouvementModal({ isOpen, onClose, onSave, article, type, currentUser, fournisseurs = [] }: MouvementModalProps) {
  const isNewArticle = article?.id === 'new';
  
  const [formData, setFormData] = useState({
    // Champs pour nouvel article
    nom: '',
    categorie: '',
    fournisseur: '',
    localisation: '',
    seuilMinimum: 0,
    quantiteStock: 0,
    // Champs pour mouvement
    quantite: 1,
    utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
    commentaire: '',
  });

  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Gestionnaires de changement
  // NOTE: inline setFormData is used in the inputs; no separate handler needed here.

  // Initialize form when the modal opens or when the article actually changes.
  // Use a ref to avoid clobbering user input on unrelated re-renders.
  const prevArticleIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentId = article?.id;
    if (prevArticleIdRef.current === currentId) return; // no actual article change

    // update stored id
    prevArticleIdRef.current = currentId;

    if (isNewArticle) {
      setFormData({
        nom: '',
        categorie: '',
        fournisseur: '',
        localisation: '',
        seuilMinimum: 0,
        quantiteStock: 0,
        quantite: 1,
        utilisateur: 'Utilisateur actuel',
        commentaire: '',
      });
    } else {
      setFormData({
        nom: article?.nom || '',
        categorie: article?.categorie || '',
        fournisseur: article?.fournisseur || '',
        localisation: article?.localisation || '',
        seuilMinimum: article?.seuilMinimum || 0,
        quantiteStock: article?.quantiteStock || 0,
        quantite: 1,
        utilisateur: 'Utilisateur actuel',
        commentaire: '',
      });
    }
    setShowDetails(false);
  }, [article, isNewArticle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isNewArticle) {
        // Création d'un nouvel article
        await Promise.resolve(onSave({
          nom: formData.nom,
          categorie: formData.categorie,
          fournisseur: formData.fournisseur,
          localisation: formData.localisation,
          seuilMinimum: formData.seuilMinimum,
          quantiteStock: formData.quantiteStock
        }));
      } else if (article) {
        // Mouvement de stock
        await Promise.resolve(onSave({
          articleId: article.id,
          quantite: formData.quantite,
          type,
          utilisateur: formData.utilisateur,
          commentaire: formData.commentaire
        }));
      }
      // Close modal only after save completes
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !article) return null;

  const isStockSufficient = type === 'ENTREE' || formData.quantite <= article.quantiteStock;

  return (
    // Backdrop: clic ferme la modale
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9998]"
      onClick={onClose}
    >
      <div
        // Empêcher la fermeture quand on clique à l'intérieur de la modale
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto pointer-events-auto z-[9999]"
      >
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
            {isNewArticle ? (
              /* Formulaire de création d'article */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'article *
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) => setFormData(prev => ({ ...prev, categorie: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fournisseur *
                  </label>
                  <select
                    value={formData.fournisseur}
                    onChange={(e) => setFormData(prev => ({ ...prev, fournisseur: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {fournisseurs && fournisseurs.map(f => (
                      <option key={f.id} value={f.nom}>{f.nom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localisation *
                  </label>
                  <select
                    value={formData.localisation}
                    onChange={(e) => setFormData(prev => ({ ...prev, localisation: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionner une localisation</option>
                    {localisations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Seuil minimum *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.seuilMinimum}
                      onChange={(e) => setFormData(prev => ({ ...prev, seuilMinimum: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock initial *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantiteStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantiteStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Formulaire de mouvement */
              <>
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
                        max={type === 'SORTIE' ? article?.quantiteStock : undefined}
                        value={formData.quantite}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl ${
                          !isStockSufficient ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        required
                      />
                      <p className="text-sm text-gray-500 text-center mt-1">
                        Stock actuel: {article?.quantiteStock}
                        {type === 'ENTREE' && article?.quantiteStock !== undefined && ` → ${article.quantiteStock + formData.quantite}`}
                        {type === 'SORTIE' && article?.quantiteStock !== undefined && ` → ${article.quantiteStock - formData.quantite}`}
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

                {/* Bouton pour afficher plus de détails */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {showDetails ? 'Masquer les détails' : 'Ajouter des détails'}
                </button>
              </>
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
                disabled={!isNewArticle && !isStockSufficient}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  (isNewArticle || isStockSufficient)
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {isNewArticle ? 'Créer l\'article' : `Confirmer le ${type === 'ENTREE' ? 'dépôt' : 'retrait'}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}