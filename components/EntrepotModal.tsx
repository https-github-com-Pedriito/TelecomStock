'use client';

import React, { useEffect, useState } from 'react';
import { Localisation, LocalisationInput } from '@/types';
import { X, Building2, ChevronRight, Info, MapPin, Activity } from 'lucide-react';

const localisationTypes: Array<{ value: NonNullable<Localisation['type']>; label: string }> = [
  { value: 'ENTREPOT', label: 'Entrepôt' },
  { value: 'VEHICULE', label: 'Véhicule' },
  { value: 'SITE_CLIENT', label: 'Site client' },
  { value: 'TECHNIQUE', label: 'Zone technique' },
  { value: 'AUTRE', label: 'Autre' },
];

interface EntrepotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (localisation: LocalisationInput) => Promise<void>;
  localisation?: Localisation;
  isSaving?: boolean;
}

export function EntrepotModal({ isOpen, onClose, onSave, localisation, isSaving = false }: EntrepotModalProps) {
  const [formData, setFormData] = useState<LocalisationInput>({
    nom: '',
    description: '',
    type: 'ENTREPOT',
    est_active: true,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (localisation) {
      setFormData({
        nom: localisation.nom,
        description: localisation.description || '',
        type: localisation.type || 'ENTREPOT',
        est_active: localisation.est_active,
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        type: 'ENTREPOT',
        est_active: true,
      });
    }
    setErrorMessage(null);
  }, [localisation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la localisation:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de sauvegarder la localisation');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg glass rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-blue-500/5 dark:bg-blue-950/20">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-600/20 text-white">
              <Building2 size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {localisation ? 'Modifier le Lieu' : 'Nouvel Emplacement'}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuration Stockage</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="glass p-4 rounded-2xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 flex items-center gap-3 text-red-600 dark:text-red-400 animate-shake">
                <Info size={18} strokeWidth={3} />
                <p className="text-xs font-black uppercase tracking-widest">{errorMessage}</p>
              </div>
            )}

            {/* 1. Main Info Card */}
            <div className="glass p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <MapPin size={18} strokeWidth={3} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Identité du Lieu</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Désignation *</label>
                  <input
                    type="text"
                    required
                    autoFocus={!localisation}
                    disabled={isSaving}
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-2xl outline-none transition-all font-bold text-lg text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner"
                    placeholder="Ex: Entrepôt Principal, Pick-up 01..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Type de Structure *</label>
                  <div className="relative">
                    <select
                      required
                      disabled={isSaving}
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Localisation['type'] })}
                      className="w-full px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none appearance-none cursor-pointer font-bold text-gray-900 dark:text-white shadow-inner"
                    >
                      {localisationTypes.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronRight size={18} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Advanced Config Card */}
            <div className="glass p-6 rounded-3xl border border-white/40 dark:border-gray-800/50 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                <Activity size={18} strokeWidth={3} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Configuration Avancée</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description & Notes</label>
                  <textarea
                    disabled={isSaving}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-blue-500/50 rounded-2xl outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner min-h-[100px]"
                    placeholder="Informations complémentaires, adresse précise..."
                    rows={3}
                  />
                </div>

                <label className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${formData.est_active ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-50/50 border-gray-200 dark:border-gray-800'
                  }`}>
                  <div className="pt-0.5">
                    <div className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${formData.est_active ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}>
                      <input
                        type="checkbox"
                        disabled={isSaving}
                        checked={formData.est_active}
                        onChange={(e) => setFormData({ ...formData, est_active: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${formData.est_active ? 'left-5' : 'left-1'
                        }`} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className={`block text-xs font-black uppercase tracking-widest transition-colors ${formData.est_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'
                      }`}>
                      Statut Opérationnel
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 leading-tight">
                      {formData.est_active
                        ? "L'emplacement est visible et peut recevoir des stocks."
                        : "L'emplacement est désactivé et masqué des opérations courantes."}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-8 py-3 sm:py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-row items-center justify-between gap-3 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="px-5 sm:px-8 py-3 sm:py-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-sm sm:text-base text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 disabled:opacity-50 shrink-0"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 sm:px-10 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all group disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <span>{localisation ? 'Mettre à jour' : 'Créer l\'Emplacement'}</span>
                <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper for loading state (missing import in original file)
function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
