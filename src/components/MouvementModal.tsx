import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { Portal } from './Portal';
import {
  X,
  ArrowUpDown,
  ScanLine,
  Package,
  ChevronRight,
  History,
  Plus,
  Minus
} from 'lucide-react';

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
  'Véhicule 1',
  'Véhicule 2',
  'Site client A',
  'Site client B',
  'Magasin local',
];

interface MouvementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    nom?: string;
    categorie?: string;
    fournisseur?: string;
    localisation?: string;
    seuil_minimum?: number;
    quantite_stock?: number;
    article_id?: string;
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
    nom: '',
    categorie: '',
    fournisseur: '',
    localisation: '',
    seuilMinimum: 0,
    quantiteStock: 0,
    quantite: 1,
    utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
    commentaire: type === 'ENTREE' ? 'Entrée via scanner' : 'Sortie via scanner',
  });

  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const prevArticleIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentId = article?.id;
    if (prevArticleIdRef.current === currentId) return;

    prevArticleIdRef.current = currentId;

    if (isNewArticle) {
      setFormData({
        nom: '',
        categorie: '',
        fournisseur: '',
        localisation: localisationsStatics[0],
        seuilMinimum: 0,
        quantiteStock: 0,
        quantite: 1,
        utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
        commentaire: type === 'ENTREE' ? 'Entrée via scanner' : 'Sortie via scanner',
      });
    } else {
      setFormData({
        nom: article?.nom || '',
        categorie: article?.categorie || '',
        fournisseur: article?.fournisseur || '',
        localisation: article?.localisation || '',
        seuilMinimum: article?.seuil_minimum || 0,
        quantiteStock: article?.quantite_stock || 0,
        quantite: 1,
        utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
        commentaire: type === 'ENTREE' ? 'Entrée via scanner' : 'Sortie via scanner',
      });
    }
    setShowDetails(false);
  }, [article, isNewArticle, type, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isNewArticle) {
        await Promise.resolve(onSave({
          nom: formData.nom,
          categorie: formData.categorie,
          fournisseur: formData.fournisseur,
          localisation: formData.localisation,
          seuil_minimum: formData.seuilMinimum,
          quantite_stock: formData.quantiteStock
        }));
      } else if (article) {
        await Promise.resolve(onSave({
          article_id: article.id,
          quantite: formData.quantite,
          type,
          utilisateur: formData.utilisateur,
          commentaire: formData.commentaire
        }));
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !article) return null;

  const isStockSufficient = type === 'ENTREE' || formData.quantite <= (article.quantite_stock || 0);
  const themeColor = type === 'ENTREE' ? 'emerald' : 'orange';

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gray-950/40 backdrop-blur-md">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-transparent transition-opacity animate-fade-in z-[100]"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-[110] w-full max-w-lg glass rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className={`relative px-4 pt-4 pb-3 md:px-8 md:pt-8 md:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-${themeColor}-500/5 dark:bg-${themeColor}-950/20`}>
          <div className="flex items-center gap-2 md:gap-4">
            <div className={`p-2 md:p-3 bg-${themeColor}-600 rounded-xl md:rounded-2xl shadow-lg shadow-${themeColor}-600/20 text-white`}>
              <ArrowUpDown size={20} strokeWidth={2.5} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {type === 'ENTREE' ? 'Entrée de Stock' : 'Sortie de Stock'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 bg-${themeColor}-500 rounded-full animate-pulse`} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Scanner</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-8 custom-scrollbar">

          {/* Article Identity Card */}
          <div className="glass p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${themeColor}-500/5 blur-2xl group-hover:bg-${themeColor}-500/10 transition-colors`} />

            <div className="relative flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <Package size={20} className={`text-${themeColor}-600 dark:text-${themeColor}-400`} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-gray-900 dark:text-white leading-tight">{article.nom}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{article.categorie}</span>
                  <div className="flex items-center gap-1">
                    <ScanLine size={12} className="text-gray-400" />
                    <span className="text-[10px] font-mono font-bold text-gray-500">{article.code_barres}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Disponibilité Actuelle</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-gray-900 dark:text-white">{article.quantite_stock}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Unités</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {isNewArticle ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Désignation *</label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white shadow-inner"
                    placeholder="Nouveau produit..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Catégorie *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.categorie}
                        onChange={(e) => setFormData(prev => ({ ...prev, categorie: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-gray-900 dark:text-white shadow-inner"
                      >
                        <option value="">Sélectionner</option>
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fournisseur *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.fournisseur}
                        onChange={(e) => setFormData(prev => ({ ...prev, fournisseur: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-gray-900 dark:text-white shadow-inner"
                      >
                        <option value="">Sélectionner</option>
                        {fournisseurs.map(f => <option key={f.id} value={f.nom}>{f.nom}</option>)}
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Emplacement *</label>
                    <div className="relative">
                      <select
                        required
                        value={formData.localisation}
                        onChange={(e) => setFormData(prev => ({ ...prev, localisation: e.target.value }))}
                        className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-gray-900 dark:text-white shadow-inner"
                      >
                        {localisationsStatics.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                      <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] ml-1">Seuil Alerte *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.seuilMinimum}
                      onChange={(e) => setFormData(prev => ({ ...prev, seuilMinimum: parseInt(e.target.value) || 0 }))}
                      className="w-full px-5 py-3.5 bg-orange-50/30 dark:bg-orange-950/20 border border-transparent focus:border-orange-500/50 rounded-2xl outline-none transition-all font-black text-gray-900 dark:text-white shadow-inner text-center"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-1">Stock Initial</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.quantiteStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantiteStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-5 py-3.5 bg-emerald-50/30 dark:bg-emerald-950/20 border border-transparent focus:border-emerald-500/50 rounded-2xl outline-none transition-all font-black text-xl text-gray-900 dark:text-white shadow-inner text-center"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Quantity Tactile Selector */}
                <div className="space-y-4">
                  <label className={`text-[10px] font-black text-${themeColor}-500 uppercase tracking-[0.2em] ml-1 block text-center`}>
                    Sélectionner la Quantité
                  </label>

                  <div className="flex items-center justify-center gap-6">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantite: Math.max(1, prev.quantite - 1) }))}
                      className={`p-4 bg-${themeColor}-50 dark:bg-${themeColor}-950/30 hover:bg-${themeColor}-100 dark:hover:bg-${themeColor}-900/40 text-${themeColor}-600 dark:text-${themeColor}-400 rounded-3xl transition-all shadow-sm active:scale-95`}
                    >
                      <Minus size={24} strokeWidth={3} />
                    </button>

                    <div className="relative group">
                      <input
                        type="number"
                        min="1"
                        max={type === 'SORTIE' ? article?.quantite_stock : undefined}
                        value={formData.quantite}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                        className={`w-32 py-6 bg-transparent text-center text-5xl font-black text-gray-900 dark:text-white outline-none selection:bg-${themeColor}-200 selection:text-${themeColor}-800 transition-all ${!isStockSufficient ? 'text-red-500' : ''}`}
                      />
                      <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-${themeColor}-500 rounded-full group-focus-within:w-16 transition-all`} />
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantite: prev.quantite + 1 }))}
                      className={`p-4 bg-${themeColor}-50 dark:bg-${themeColor}-950/30 hover:bg-${themeColor}-100 dark:hover:bg-${themeColor}-900/40 text-${themeColor}-600 dark:text-${themeColor}-400 rounded-3xl transition-all shadow-sm active:scale-95`}
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>

                  {!isStockSufficient && (
                    <p className="text-center text-xs font-black text-red-500 animate-bounce uppercase tracking-widest">
                      Attention : Stock Insuffisant
                    </p>
                  )}

                  {/* Stock Projection */}
                  <div className="flex justify-center items-center gap-3 px-6 py-3 glass rounded-2xl border border-white/40 dark:border-gray-800/50">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impact Stock :</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-500">{article.quantite_stock}</span>
                      <ArrowUpDown size={12} className={`text-${themeColor}-500 translate-y-px`} />
                      <span className={`text-sm font-black text-${themeColor}-600`}>
                        {type === 'ENTREE' ? article.quantite_stock + formData.quantite : article.quantite_stock - formData.quantite}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <History size={14} />
                    <span>{showDetails ? 'Masquer les Détails' : 'Ajouter un Commentaire'}</span>
                  </button>

                  {showDetails && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Observation / Note</label>
                        <textarea
                          value={formData.commentaire}
                          onChange={(e) => setFormData(prev => ({ ...prev, commentaire: e.target.value }))}
                          className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-sm text-gray-900 dark:text-white shadow-inner min-h-[100px]"
                          placeholder="Ex: Livraison fournisseur..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 md:px-8 md:py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-row items-center justify-between gap-3 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 md:px-6 py-3 md:py-3.5 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 shrink-0"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!isNewArticle && !isStockSufficient) || submitting}
            className={`flex items-center justify-center gap-2 px-6 md:px-10 py-3 md:py-3.5 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-${themeColor}-600/20 active:scale-95 transition-all group disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span>{isNewArticle ? 'Créer le Produit' : `Valider ${type === 'ENTREE' ? 'l\'Entrée' : 'la Sortie'}`}</span>
            <ChevronRight size={16} strokeWidth={3} className="group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}