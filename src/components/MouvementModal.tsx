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

const projets = [
  'Installation Fibre Zone A',
  'Maintenance Réseau B',
  'Upgrade 5G Site C',
  'Intervention Urgence',
  'Formation équipes',
];

const techniciens = [
  'Pierre Martin',
  'Marie Dubois',
  'Jean Lefebvre',
  'Sophie Bernard',
  'Luc Moreau',
];

export function MouvementModal({ isOpen, onClose, onSave, article, type }: MouvementModalProps) {
  const [formData, setFormData] = useState({
    quantite: 1,
    utilisateur: 'Utilisateur actuel', // TODO: Récupérer de l'authentification
    projet: '',
    technicien: '',
    commentaire: '',
  });

  useEffect(() => {
    setFormData({
      quantite: 1,
      utilisateur: 'Utilisateur actuel',
      projet: '',
      technicien: '',
      commentaire: '',
    });
  }, [article, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;

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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                min="1"
                max={type === 'SORTIE' ? article.quantiteStock : undefined}
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: parseInt(e.target.value) || 1 })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isStockSuffisant ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                required
              />
              {!isStockSuffisant && (
                <p className="text-sm text-red-600 mt-1">Stock insuffisant</p>
              )}
            </div>

            {type === 'SORTIE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projet
                  </label>
                  <select
                    value={formData.projet}
                    onChange={(e) => setFormData({ ...formData, projet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un projet</option>
                    {projets.map(projet => (
                      <option key={projet} value={projet}>{projet}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technicien
                  </label>
                  <select
                    value={formData.technicien}
                    onChange={(e) => setFormData({ ...formData, technicien: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un technicien</option>
                    {techniciens.map(tech => (
                      <option key={tech} value={tech}>{tech}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire
              </label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Commentaire optionnel..."
              />
            </div>

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
                  isStockSuffisant 
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirmer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}