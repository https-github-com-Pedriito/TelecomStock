import React, { useState, useEffect } from 'react';
import { Article, Localisation } from '../types';
import { X, Package } from 'lucide-react';
import { api } from '../lib/api';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Now include codeBarres in the payload so the hook can use it as the article id when present.
  onSave: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => void;
  article?: Article;
  fournisseurs?: Array<{ id: string; nom: string }>;
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

export function ArticleModal({ isOpen, onClose, onSave, article, fournisseurs = [] }: ArticleModalProps) {
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
      });
    }
  }, [article]);

  // Récupérer le code-barres de l'URL
  const urlParams = new URLSearchParams(window.location.search);
  const barcodeFromURL = urlParams.get('barcode');

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

  // Ajouter le code-barres dans le formulaire
  useEffect(() => {
    if (barcodeFromURL && !article) {
      setFormData(prev => ({
        ...prev,
        code_barres: barcodeFromURL
      }));
    }
  }, [barcodeFromURL, article]);

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
    };
    
    console.log('Données envoyées à l\'API:', articleData);
    onSave(articleData);
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
          {/* Nom de l'article */}
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

          {/* Catégorie */}
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

          {/* Fournisseur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur *
            </label>
            <select
              value={formData.fournisseur}
              onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localisation *
            </label>
            <select
              value={formData.localisation}
              onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {loadingLocalisations && (
              <p className="text-xs text-gray-500 mt-1">
                Chargement des localisations...
              </p>
            )}
          </div>

          {/* Code-barres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code-barres
            </label>
            <input
              type="text"
              value={formData.code_barres || ''}
              onChange={(e) => setFormData({ ...formData, code_barres: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Saisir le code-barres manuellement (optionnel)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez vide pour génération automatique ou saisissez manuellement
            </p>
          </div>

          {/* Seuil minimum, Stock initial et Prix unitaire */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seuil minimum *
              </label>
              <input
                type="number"
                min="0"
                value={formData.seuil_minimum}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, seuil_minimum: value });
                }}
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
                value={formData.quantite_stock}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, quantite_stock: value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Prix unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix unitaire (€)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Permet de calculer la valeur totale du stock
            </p>
          </div>

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