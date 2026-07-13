'use client';

import React, { useState, useEffect } from 'react';
import { Article, Localisation } from '@/types';
import {
  X,
  Package,
  MapPin,
  Info,
  TrendingUp,
  Barcode,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import { Portal } from '@/components/Portal';
import { api } from '@/lib/api';
import { ImageUpload } from '@/components/ImageUpload';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => void;
  article?: Article;
  fournisseurs?: Array<{ id: string; nom: string }>;
  addNotification?: (notification: { type: 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion'; title: string; message: string }) => void;
}

const categories = [
  'Équipements réseau',
  'Câbles et connecteurs',
  'Antennes',
  'Outillage',
  'Composants électroniques',
  'Accessoires',
];

const localisationsStatics = [
  'Entrepôt principal',
  'Entrepôt secondaire',
  'Magasin central',
  'Véhicule Technicien 1',
  'Véhicule Technicien 2',
  'Véhicule Technicien 3',
  'Camion d\'intervention',
  'Stock de sécurité',
  'En transit',
  'Retour SAV',
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
    code_barres: '',
    image_url: '',
  });

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
  }, [article, barcodeFromURL, isOpen]);

  useEffect(() => {
    const loadLocalisations = async () => {
      try {
        setLoadingLocalisations(true);
        const response = await api.getLocalisations();
        setLocalisationsFromDB(response);
      } catch (error) {
        console.error('Erreur lors du chargement des localisations:', error);
      } finally {
        setLoadingLocalisations(false);
      }
    };

    if (isOpen) {
      loadLocalisations();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const articleData = {
      ...formData,
      seuil_minimum: Number(formData.seuil_minimum) || 0,
      quantite_stock: Number(formData.quantite_stock) || 0,
      prix_unitaire: Number(formData.prix_unitaire) || 0,
      image_url: formData.image_url || undefined,
    };

    try {
      onSave(articleData);
      if (addNotification) {
        addNotification({
          type: article ? 'success' : 'creation',
          title: article ? 'Fiche mise à jour' : 'Article créé',
          message: `L'article "${articleData.nom}" a été enregistré.`
        });
      }
      onClose();
    } catch (error) {
      if (addNotification) {
        addNotification({
          type: 'warning',
          title: 'Erreur',
          message: `L'opération a échoué.`
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div className="relative w-full max-w-2xl glass rounded-[2rem] sm:rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90dvh] sm:max-h-[90vh]">

          {/* Header - Bloqué contre le scroll avec shrink-0 */}
          <div className="relative px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-start sm:items-center justify-between gap-4 bg-blue-500/5 dark:bg-blue-950/20 shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div className="p-3 sm:p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 text-white shrink-0">
                <Package size={24} className="sm:w-[28px] sm:h-[28px]" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Édition Master</span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight break-words">
                  {article ? "Modifier l'Article" : "Nouveau Produit"}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90 border border-transparent hover:border-white/40 shrink-0"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Form Body - Seule zone autorisée à scroller */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

              {/* 1. PRODUCT IDENTITY CARD */}
              <div className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                  <Info size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Identité du Produit</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Désignation *</label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner"
                      placeholder="Modem, Câble, Support..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Catégorie *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.categorie}
                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white appearance-none cursor-pointer shadow-inner"
                      >
                        <option value="">Sélectionner</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fournisseur *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.fournisseur}
                        onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white appearance-none cursor-pointer shadow-inner"
                      >
                        <option value="">Sélectionner</option>
                        {fournisseurs.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                      </select>
                      <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. LOGISTICS CARD */}
              <div className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                  <MapPin size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Logistique & Traçabilité</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Emplacement *</label>
                    <div className="relative">
                      <select
                        required
                        disabled={loadingLocalisations}
                        value={formData.localisation}
                        onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-purple-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white appearance-none cursor-pointer shadow-inner"
                      >
                        <option value="">{loadingLocalisations ? 'Chargement...' : 'Zone de stockage'}</option>
                        {localisationsFromDB.length > 0
                          ? localisationsFromDB.map(loc => <option key={loc.id} value={loc.nom}>{loc.nom}</option>)
                          : localisationsStatics.map(loc => <option key={loc} value={loc}>{loc}</option>)
                        }
                      </select>
                      <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Référence / Barcode</label>
                    <div className="relative">
                      <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={formData.code_barres}
                        onChange={(e) => setFormData({ ...formData, code_barres: e.target.value })}
                        className="w-full pl-11 pr-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-purple-500/50 rounded-2xl outline-none transition-all font-mono font-bold text-gray-900 dark:text-white shadow-inner"
                        placeholder="Génération auto"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. INVENTORY & FINANCE CARD */}
              <div className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Stock & Tarification</h3>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Qté Actuelle</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantite_stock}
                      onChange={(e) => setFormData({ ...formData, quantite_stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-3 sm:py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-emerald-500/50 rounded-2xl outline-none transition-all font-black text-base sm:text-xl text-center text-gray-900 dark:text-white shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] ml-1">Seuil Alerte *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.seuil_minimum}
                      onChange={(e) => setFormData({ ...formData, seuil_minimum: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-3 sm:py-3.5 bg-orange-50/30 dark:bg-orange-950/20 border border-transparent focus:border-orange-500/50 rounded-2xl outline-none transition-all font-black text-base sm:text-xl text-center text-orange-600 dark:text-orange-400 shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Prix (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_unitaire}
                      onChange={(e) => setFormData({ ...formData, prix_unitaire: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-3 sm:py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-emerald-500/50 rounded-2xl outline-none transition-all font-black text-base sm:text-xl text-center text-gray-900 dark:text-white shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* 4. MEDIA CARD */}
              <div className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                  <ImageIcon size={18} strokeWidth={3} />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Visuel du Produit</h3>
                </div>

                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-4 sm:p-6 border border-dashed border-gray-300 dark:border-gray-700">
                  <ImageUpload
                    currentImageUrl={formData.image_url}
                    onImageChange={(url) => setFormData({ ...formData, image_url: url })}
                    onRemove={() => setFormData({ ...formData, image_url: '' })}
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Footer Actions - Bloqué contre le scroll avec shrink-0 (sans h-24 figé) */}
          <div className="px-4 sm:px-8 py-4 border-t border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl shrink-0 overflow-hidden">
            <div className="hidden sm:flex items-center gap-3">
              <div className="p-2 bg-gray-500/10 rounded-xl">
                <Package size={16} className="text-gray-400" />
              </div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Édition Produit</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-[320px]">
              <button
                type="button"
                onClick={onClose}
                className="p-3.5 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-[10px] text-gray-500 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 flex-1 text-center"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2 transition-all group flex-1"
              >
                <span className="truncate">{article ? 'Mettre à jour' : 'Créer l\'article'}</span>
                <ChevronRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}