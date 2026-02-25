import React, { useMemo, useState } from 'react';
import { Localisation, LocalisationInput } from '../types';
import { EntrepotModal } from '../components/EntrepotModal';
import Toggle from 'react-toggle';
import 'react-toggle/style.css';
import {
  Building2,
  Warehouse,
  Search,
  Plus,
  Edit2,
  MapPin,
  RefreshCcw,
  CalendarDays,
  Loader2,
  Info,
  Trash2,
  X,
  CheckCircle,
  XCircle,
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
  addNotification?: (notif: { type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string; duration?: number }) => void;
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
  addNotification,
}: EntrepotsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocalisation, setEditingLocalisation] = useState<Localisation | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && loc.est_active) ||
        (statusFilter === 'inactive' && !loc.est_active);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [localisations, searchTerm, typeFilter, statusFilter]);

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
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Lieu modifié',
            message: `Le lieu « ${data.nom} » a été modifié avec succès.`,
            duration: 5000,
          });
        }
      } else {
        await onAddLocalisation(data);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Lieu créé',
            message: `Le lieu « ${data.nom} » a été créé avec succès.`,
            duration: 5000,
          });
        }
      }
      if (onRefreshLocalisations) {
        await onRefreshLocalisations();
      }
      closeModal();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du lieu:', error);
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur sauvegarde lieu',
          message: 'Impossible de sauvegarder ce lieu de stockage.',
          duration: 5000,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisableLocalisation = async (localisation: Localisation) => {
    try {
      setActionLoadingId(localisation.id);
      await onUpdateLocalisation(localisation.id, { est_active: false });
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

  const handleDeleteLocalisation = async (localisation: Localisation) => {
    const confirmMessage = `⚠️ ATTENTION : Supprimer définitivement le lieu « ${localisation.nom} » ?\n\nCette action est irréversible et supprimera toutes les données associées.`;
    if (!confirm(confirmMessage)) {
      return;
    }
    try {
      setActionLoadingId(localisation.id);
      await onDeleteLocalisation(localisation.id);
      if (onRefreshLocalisations) {
        await onRefreshLocalisations();
      }
      if (addNotification) {
        addNotification({
          type: 'success',
          title: 'Lieu supprimé',
          message: `Le lieu « ${localisation.nom} » a été supprimé avec succès.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du lieu:', error);
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur suppression lieu',
          message: 'Impossible de supprimer ce lieu de stockage. Il est peut-être utilisé par des articles.',
          duration: 5000,
        });
      }
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Lieux de stockage
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {activeLocalisations} lieu{xPlural(activeLocalisations)} actif{sPlural(activeLocalisations)} • {inactiveLocalisations} inactif{sPlural(inactiveLocalisations)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Card */}
        <div className="glass rounded-[2rem] border border-white/40 dark:border-gray-800/50 p-6 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm">
              <Building2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Lieux</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{totalLocalisations}</p>
            </div>
          </div>
        </div>

        {/* Active Card */}
        <div className="glass rounded-[2rem] border border-white/40 dark:border-gray-800/50 p-6 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-sm">
              <CheckCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Lieux Actifs</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{activeLocalisations}</p>
            </div>
          </div>
        </div>

        {/* Inactive Card */}
        <div className="glass rounded-[2rem] border border-white/40 dark:border-gray-800/50 p-6 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all duration-500 hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl shadow-sm">
              <XCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Lieux Inactifs</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{inactiveLocalisations}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un lieu ou une description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Inactifs uniquement</option>
            </select>
          </div>
          <div className="w-full lg:w-48">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              <option value="">Tous les types</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>
                  {typeLabels[type as keyof typeof typeLabels] || type}
                </option>
              ))}
            </select>
          </div>
          {(searchTerm || typeFilter || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('');
                setStatusFilter('all');
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
              title="Réinitialiser les filtres"
            >
              <X size={16} />
              Réinitialiser
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
            <Info className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Erreur lors du chargement des lieux</p>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : filteredLocalisations.length === 0 ? (
        <div className="text-center py-20 glass rounded-[3rem] border border-dashed border-gray-300 dark:border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-full text-gray-300">
              <Warehouse size={48} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">
              {localisations.length === 0
                ? "Aucun lieu enregistré."
                : "Aucun résultat pour cette recherche."}
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 text-indigo-600 dark:text-indigo-400 font-black hover:underline underline-offset-8"
            >
              Créer un nouveau lieu →
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredLocalisations.map(localisation => {
            const isActionLoading = actionLoadingId === localisation.id;
            const isActive = localisation.est_active;

            return (
              <div
                key={localisation.id}
                className={`group relative glass rounded-[2.5rem] border transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${isActive
                  ? 'border-white/40 dark:border-gray-800/50 p-7 shadow-xl shadow-gray-200/50 dark:shadow-none'
                  : 'border-transparent bg-gray-100/50 dark:bg-gray-900/20 p-7 opacity-70 grayscale'
                  }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl transition-colors duration-500 ${isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white shadow-sm'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-500 shadow-none'
                      }`}>
                      <Warehouse size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${isActive
                          ? 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50'
                          : 'bg-gray-100 text-gray-500 border-gray-200 dark:border-gray-800'
                          }`}>
                          {typeLabels[localisation.type as keyof typeof typeLabels] || localisation.type}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest pl-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Actif
                          </span>
                        )}
                      </div>
                      <h3 className={`text-xl font-black tracking-tight ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                        {localisation.nom}
                      </h3>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(localisation)}
                      className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                      title="Modifier"
                      disabled={isActionLoading}
                    >
                      <Edit2 size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocalisation(localisation)}
                      className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                      title="Supprimer"
                      disabled={isActionLoading}
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {localisation.description && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-6 line-clamp-2">
                    {localisation.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-6 text-[11px] font-bold text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} />
                      <span>{format(new Date(localisation.created_at), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span className="truncate max-w-[80px]">Principal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Statut</span>
                    <Toggle
                      checked={isActive}
                      disabled={isActionLoading}
                      onChange={() => {
                        if (isActive) {
                          handleDisableLocalisation(localisation);
                        } else {
                          handleReactivateLocalisation(localisation);
                        }
                      }}
                      icons={false}
                    />
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
