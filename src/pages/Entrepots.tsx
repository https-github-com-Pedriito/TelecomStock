import { useMemo, useState } from 'react';
import { Localisation, LocalisationInput } from '../types';
import { EntrepotModal } from '../components/EntrepotModal';
import {
  Building2,
  Warehouse,
  Search,
  Plus,
  Edit2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  RefreshCcw,
  CalendarDays,
  Loader2,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EntrepotsProps {
  localisations: Localisation[];
  loading: boolean;
  error: string | null;
  onAddLocalisation: (localisation: LocalisationInput) => Promise<Localisation>;
  onUpdateLocalisation: (id: string, localisation: Partial<LocalisationInput>) => Promise<Localisation>;
  onDeleteLocalisation: (id: string) => Promise<void>;
  onRefreshLocalisations?: () => Promise<void>;
}

const typeLabels: Record<NonNullable<Localisation['type']>, string> = {
  ENTREPOT: 'Entrepôt',
  VEHICULE: 'Véhicule',
  SITE_CLIENT: 'Site client',
  TECHNIQUE: 'Zone technique',
  AUTRE: 'Autre',
};

export function Entrepots({
  localisations,
  loading,
  error,
  onAddLocalisation,
  onUpdateLocalisation,
  onDeleteLocalisation,
  onRefreshLocalisations,
}: EntrepotsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocalisation, setEditingLocalisation] = useState<Localisation | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const totalLocalisations = localisations.length;
  const activeLocalisations = localisations.filter(loc => loc.est_active).length;
  const inactiveLocalisations = totalLocalisations - activeLocalisations;

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    localisations.forEach(loc => {
      if (loc.type) {
        types.add(loc.type);
      }
    });
    return Array.from(types).sort();
  }, [localisations]);

  const filteredLocalisations = useMemo(() => {
    return localisations.filter(loc => {
      const matchesSearch = loc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loc.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || loc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [localisations, searchTerm, typeFilter]);

  const openCreateModal = () => {
    setEditingLocalisation(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (localisation: Localisation) => {
    setEditingLocalisation(localisation);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLocalisation(undefined);
  };

  const handleSaveLocalisation = async (data: LocalisationInput) => {
    try {
      setIsSaving(true);
      if (editingLocalisation) {
        await onUpdateLocalisation(editingLocalisation.id, data);
      } else {
        await onAddLocalisation(data);
      }
      if (onRefreshLocalisations) {
        await onRefreshLocalisations();
      }
      closeModal();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableLocalisation = async (localisation: Localisation) => {
    if (!confirm(`Désactiver le lieu « ${localisation.nom} » ?`)) {
      return;
    }
    try {
      setActionLoadingId(localisation.id);
      await onDeleteLocalisation(localisation.id);
      if (onRefreshLocalisations) {
        await onRefreshLocalisations();
      }
    } catch (error) {
      console.error('Erreur lors de la désactivation du lieu:', error);
      alert('Impossible de désactiver ce lieu de stockage pour le moment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReactivateLocalisation = async (localisation: Localisation) => {
    try {
      setActionLoadingId(localisation.id);
      await onUpdateLocalisation(localisation.id, { est_active: true });
      if (onRefreshLocalisations) {
        await onRefreshLocalisations();
      }
    } catch (error) {
      console.error('Erreur lors de la réactivation du lieu:', error);
      alert('Impossible de réactiver ce lieu de stockage pour le moment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshLocalisations) return;
    try {
      setIsRefreshing(true);
      await onRefreshLocalisations();
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des lieux:', error);
      alert('Le rafraîchissement a échoué. Réessayez plus tard.');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Lieux de stockage
          </h1>
          <p className="text-gray-600">
            {activeLocalisations} lieu{xPlural(activeLocalisations)} actif{sPlural(activeLocalisations)} • {inactiveLocalisations} inactif{sPlural(inactiveLocalisations)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={isRefreshing || !onRefreshLocalisations}
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Rafraîchir
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nouveau lieu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">Total</p>
          <p className="mt-2 text-2xl font-semibold text-blue-900">{totalLocalisations}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Actifs</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">{activeLocalisations}</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">Inactifs</p>
          <p className="mt-2 text-2xl font-semibold text-amber-900">{inactiveLocalisations}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un lieu ou une description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="w-full lg:w-60">
            <label className="text-sm font-medium text-gray-600 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les types</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {typeLabels[type as keyof typeof typeLabels] || type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <Info className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Erreur lors du chargement des lieux</p>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredLocalisations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">
            {localisations.length === 0
              ? 'Aucun lieu de stockage enregistré pour le moment.'
              : 'Aucun lieu ne correspond à vos filtres.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Créer un nouveau lieu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLocalisations.map(localisation => {
            const isActionLoading = actionLoadingId === localisation.id;
            const statusClasses = localisation.est_active
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-amber-50 text-amber-700 border border-amber-100';

            return (
              <div key={localisation.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${statusClasses}`}>
                        {localisation.est_active ? 'Actif' : 'Inactif'}
                      </span>
                      {localisation.type && (
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {typeLabels[localisation.type] || localisation.type}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-blue-600" />
                      {localisation.nom}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(localisation)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    {localisation.est_active ? (
                      <button
                        onClick={() => handleDisableLocalisation(localisation)}
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Désactiver"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft size={18} />}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivateLocalisation(localisation)}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Réactiver"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleRight size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                {localisation.description && (
                  <p className="mt-4 text-sm text-gray-600">
                    {localisation.description}
                  </p>
                )}

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>
                      {localisation.type ? typeLabels[localisation.type] || localisation.type : 'Type non défini'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>
                      Créé le {format(new Date(localisation.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EntrepotModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveLocalisation}
        localisation={editingLocalisation}
        isSaving={isSaving}
      />
    </div>
  );
}

function xPlural(count: number) {
  return count === 1 ? '' : 'x';
}

function sPlural(count: number) {
  return count === 1 ? '' : 's';
}
