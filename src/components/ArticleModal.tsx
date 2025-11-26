import React, { useState, useEffect } from 'react';
import { Article, Localisation } from '../types';
import { X, Package } from 'lucide-react';
import { api } from '../lib/api';
import { ImageUpload } from './ImageUpload';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => void;
  article?: Article;
  fournisseurs?: Array<{ id: string; nom: string }>;
  addNotification?: (notification: { type: 'success' | 'warning' | 'info'; title: string; message: string }) => void;
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
  'Entrepôt secondaire',
  'Magasin central',
  'Véhicule Technicien 1',
  'Véhicule Technicien 2',
  'Véhicule Technicien 3',
  'Camion d\'intervention',
  'Site client - Paris',
  'Site client - Lyon',
  'Site client - Marseille',
  'Site client - Toulouse',
  'Antenne relais A',
  'Antenne relais B',
  'Centre technique',
  'Bureau commercial',
  'Stock de sécurité',
  'En transit',
  'Chez le fournisseur',
  'Retour SAV',
  'Zone de réparation',
];

export function ArticleModal({ isOpen, onClose, onSave, article, fournisseurs = [], addNotification }: ArticleModalProps) {
  const [localisationsFromDB, setLocalisationsFromDB] = useState<Localisation[]>([]);
  const [loadingLocalisations, setLoadingLocalisations] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    fournisseur: '',
    localisation: '',
    seuil_minimum: 0,
    quantite_stock: 0,
    prix_unitaire: 0,
    code_barres: '',  // Ajout du champ code_barres
    image_url: '',
  });

  // Récupérer le code-barres de l'URL au montage du composant
  const [barcodeFromURL] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('barcode');
  });

  useEffect(() => {
    if (article) {
      setFormData({
        nom: article.nom,
        categorie: article.categorie,
        fournisseur: article.fournisseur,
        localisation: article.localisation,
        seuil_minimum: article.seuil_minimum,
        quantite_stock: article.quantite_stock,
        prix_unitaire: article.prix_unitaire || 0,
        code_barres: article.code_barres,
        image_url: article.image_url || '',
      });
    } else {
      setFormData({
        nom: '',
        categorie: '',
        fournisseur: '',
        localisation: '',
        seuil_minimum: 0,
        quantite_stock: 0,
        prix_unitaire: 0,
        code_barres: barcodeFromURL || '',
        image_url: '',
      });
    }
  }, [article, barcodeFromURL]);

  // Charger les localisations depuis l'API
  useEffect(() => {
    const loadLocalisations = async () => {
      try {
        setLoadingLocalisations(true);
        const response = await api.getLocalisations();
        setLocalisationsFromDB(response);
      } catch (error) {
        console.error('Erreur lors du chargement des localisations:', error);
        // En cas d'erreur, utiliser les localisations statiques
      } finally {
        setLoadingLocalisations(false);
      }
    };

    if (isOpen) {
      loadLocalisations();
    }
  }, [isOpen]);

  // Nettoyer l'URL après avoir capturé le code-barres
  useEffect(() => {
    if (barcodeFromURL && isOpen) {
      const url = new URL(window.location.href);
      url.searchParams.delete('barcode');
      window.history.replaceState({}, '', url.toString());
    }
  }, [barcodeFromURL, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Données du formulaire avant envoi:', formData);
    const articleData = {
      nom: formData.nom,
      categorie: formData.categorie,
      fournisseur: formData.fournisseur,
      localisation: formData.localisation,
      seuil_minimum: Number(formData.seuil_minimum) || 0,
      quantite_stock: Number(formData.quantite_stock) || 0,
      prix_unitaire: Number(formData.prix_unitaire) || 0,
      code_barres: formData.code_barres,
      image_url: formData.image_url || undefined,
    };
    console.log('Données envoyées à l\'API:', articleData);
    try {
      onSave(articleData);
      if (addNotification) {
        addNotification({
          type: 'success',
          title: 'Article créé',
          message: `L'article "${articleData.nom}" a été ajouté avec succès.`
        });
      }
      onClose();
    } catch (error) {
      if (addNotification) {
        addNotification({
          type: 'warning',
          title: 'Erreur',
          message: `La création de l'article a échoué.`
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-hidden flex flex-col mb-16 sm:mb-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {article ? 'Modifier l\'article' : 'Nouvel article'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* Nom de l'article */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Nom de l'article *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Catégorie *
            </label>
            <select
              value={formData.categorie}
              onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Fournisseur *
            </label>
            <select
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">Sélectionner un fournisseur</option>
              {fournisseurs.map(fournisseur => (
                <option key={fournisseur.id} value={fournisseur.nom}>{fournisseur.nom}</option>
              ))}
            </select>
          </div>

          {/* Localisation */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Localisation *
            </label>
            <select
              value={formData.localisation}
              onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={loadingLocalisations}
            >
              <option value="">
                {loadingLocalisations ? 'Chargement...' : 'Sélectionner une localisation'}
              </option>
              {/* Priorité aux localisations de l'API */}
              {localisationsFromDB.length > 0 
                ? localisationsFromDB.map(loc => (
                    <option key={loc.id} value={loc.nom}>{loc.nom}</option>
                  ))
                : localisations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))
              }
            </select>
          </div>

          {/* Code-barres */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Code-barres
            </label>
            <input
              type="text"
              value={formData.code_barres || ''}
              onChange={(e) => setFormData({ ...formData, code_barres: e.target.value })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Optionnel - génération auto"
            />
          </div>

          {/* Seuil minimum, Stock initial et Prix unitaire */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Seuil min. *
              </label>
              <input
                type="number"
                min="0"
                value={formData.seuil_minimum}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, seuil_minimum: value });
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Stock initial
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantite_stock}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, quantite_stock: value });
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                Prix (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.prix_unitaire}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, prix_unitaire: value });
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Image Upload */}
          <ImageUpload
            currentImageUrl={formData.image_url}
            onImageChange={(url) => setFormData({ ...formData, image_url: url })}
            onRemove={() => setFormData({ ...formData, image_url: '' })}
          />

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-gray-800 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {article ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}