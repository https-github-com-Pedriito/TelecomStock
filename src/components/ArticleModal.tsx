import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { X, Package } from 'lucide-react';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'codeBarres'>) => void;
  article?: Article;
}

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

export function ArticleModal({ isOpen, onClose, onSave, article }: ArticleModalProps) {
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    fournisseur: '',
    localisation: '',
    seuilMinimum: 0,
    quantiteStock: 0,
  });

  useEffect(() => {
    if (article) {
      setFormData({
        nom: article.nom,
        categorie: article.categorie,
        fournisseur: article.fournisseur,
        localisation: article.localisation,
        seuilMinimum: article.seuilMinimum,
        quantiteStock: article.quantiteStock,
      });
    } else {
      setFormData({
        nom: '',
        categorie: '',
        fournisseur: '',
        localisation: '',
        seuilMinimum: 0,
        quantiteStock: 0,
      });
    }
  }, [article]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-600" />
            <h2 className="text-xl font-semibold">
              {article ? 'Modifier l\'article' : 'Nouvel article'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'article *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
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
            <input
              type="text"
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localisation *
            </label>
            <select
              value={formData.localisation}
              onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, seuilMinimum: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock initial
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantiteStock}
                onChange={(e) => setFormData({ ...formData, quantiteStock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {article ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}