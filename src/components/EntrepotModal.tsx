import React, { useEffect, useState } from 'react';
import { Localisation, LocalisationInput } from '../types';
import { X, Building2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Building2 size={24} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {localisation ? 'Modifier un lieu de stockage' : 'Nouveau lieu de stockage'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            type="button"
            aria-label="Fermer le modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de l'emplacement *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              required
              placeholder="Ex: Entrepôt principal"
              autoFocus={!localisation}
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type de lieu *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as Localisation['type'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              {localisationTypes.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              rows={3}
              placeholder="Informations complémentaires (adresse, consignes, etc.)"
            />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="checkbox"
              checked={formData.est_active}
              onChange={(e) => setFormData({ ...formData, est_active: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Lieu actif</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Décochez pour désactiver temporairement cet emplacement.
              </span>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isSaving}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Enregistrement...' : localisation ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
