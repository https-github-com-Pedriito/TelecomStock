import React, { useState } from 'react';
import { Fournisseur } from '../types';
import { FournisseurModal } from '../components/FournisseurModal';
import { Plus, Search, Edit2, Trash2, Truck, Mail, Phone, MapPin, Building2, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FournisseursProps {
  fournisseurs: Fournisseur[];
  onAddFournisseur: (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Fournisseur>;
  onUpdateFournisseur: (id: string, updates: Partial<Fournisseur>) => Promise<void>;
  onDeleteFournisseur: (id: string) => Promise<void>;
  onRefreshFournisseurs?: () => Promise<void>;
  addNotification?: (notif: { type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string; duration?: number }) => void;
}

export function Fournisseurs({ fournisseurs, onAddFournisseur, onUpdateFournisseur, onDeleteFournisseur, onRefreshFournisseurs, addNotification }: FournisseursProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Les fournisseurs sont déjà chargés par le hook useStock
  // Pas besoin de les recharger ici

  const filteredFournisseurs = fournisseurs.filter(fournisseur =>
    fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (fournisseur.contact?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (fournisseur.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSaveFournisseur = async (fournisseurData: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      if (editingFournisseur) {
        await onUpdateFournisseur(editingFournisseur.id, fournisseurData);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Fournisseur modifié',
            message: `Le fournisseur « ${fournisseurData.nom} » a été modifié avec succès.`,
            duration: 5000,
          });
        }
      } else {
        await onAddFournisseur(fournisseurData);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Fournisseur créé',
            message: `Le fournisseur « ${fournisseurData.nom} » a été créé avec succès.`,
            duration: 5000,
          });
        }
      }
      setEditingFournisseur(undefined);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fournisseur:', error);
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur sauvegarde fournisseur',
          message: 'Une erreur est survenue lors de la sauvegarde du fournisseur',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditFournisseur = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setIsModalOpen(true);
  };

  const handleDeleteFournisseur = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      try {
        setLoading(true);
        await onDeleteFournisseur(id);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Fournisseur supprimé',
            message: `Le fournisseur a été supprimé avec succès.`,
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du fournisseur:', error);
        if (addNotification) {
          addNotification({
            type: 'error',
            title: 'Erreur suppression fournisseur',
            message: 'Une erreur est survenue lors de la suppression du fournisseur',
            duration: 5000,
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 md:pb-8">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
              <Truck size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Fournisseurs
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium ml-12">
            Gestion des partenaires logistiques et contacts
          </p>
        </div>

        <div className="flex items-center gap-3 ml-12 md:ml-0">
          <button
            onClick={() => {
              setEditingFournisseur(undefined);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 group"
          >
            <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>Nouveau Partenaire</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Glance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border border-white/40 dark:border-gray-800/50 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
            <Building2 size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Partenaires</div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{fournisseurs.length}</div>
          </div>
        </div>
      </div>

      {/* Modern Search & Filter Bar */}
      <div className="glass p-3 md:p-4 rounded-2xl shadow-xl border border-white/20 dark:border-gray-800/50">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom, contact ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all dark:text-white font-medium"
          />
        </div>
      </div>

      {/* Fournisseurs Grid */}
      {filteredFournisseurs.length === 0 ? (
        <div className="text-center py-20 glass rounded-3xl animate-scale-in">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-10 h-10 text-blue-300 dark:text-blue-700" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun fournisseur trouvé</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {fournisseurs.length === 0 ? 'Commencez par ajouter votre premier fournisseur au carnet d\'adresses.' : 'Ajustez votre recherche pour trouver le partenaire désiré.'}
          </p>
          {fournisseurs.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Ajouter un partenaire
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFournisseurs.map((fournisseur, index) => (
            <div
              key={fournisseur.id}
              className="glass rounded-[2rem] p-6 sm:p-7 border border-white/40 dark:border-gray-800/50 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group animate-slide-up relative overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -translate-y-16 translate-x-16 rounded-full group-hover:scale-150 transition-transform duration-700" />

              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-blue-600/10 dark:bg-blue-600/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <Truck size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                        {fournisseur.nom}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Partenaire Actif</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditFournisseur(fournisseur)}
                      className="p-2.5 bg-white/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all active:scale-90 border border-transparent hover:border-blue-500/20 shadow-sm"
                      title="Modifier"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteFournisseur(fournisseur.id)}
                      className="p-2.5 bg-white/50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-500/20 shadow-sm"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Contact Person */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50/50 dark:bg-gray-950/30 rounded-2xl border border-transparent group-hover:border-blue-500/10 transition-colors">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <User size={16} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Responsable</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{fournisseur.contact}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <a
                      href={`mailto:${fournisseur.email}`}
                      className="flex items-center gap-4 p-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl hover:bg-white dark:hover:bg-gray-800 transition-all text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 group/link"
                    >
                      <Mail size={18} className="group-hover/link:scale-110 transition-transform" />
                      <span className="text-sm font-bold">{fournisseur.email}</span>
                    </a>

                    <a
                      href={`tel:${fournisseur.telephone}`}
                      className="flex items-center gap-4 p-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl hover:bg-white dark:hover:bg-gray-800 transition-all text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 group/link"
                    >
                      <Phone size={18} className="group-hover/link:scale-110 transition-transform" />
                      <span className="text-sm font-bold">{fournisseur.telephone}</span>
                    </a>
                  </div>

                  <div className="flex items-start gap-4 p-4 glass border border-white/40 dark:border-gray-800/50 rounded-2xl text-gray-600 dark:text-gray-400">
                    <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm font-bold leading-relaxed">{fournisseur.adresse}</span>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Depuis le {format(new Date(fournisseur.createdAt), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <FournisseurModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFournisseur}
        fournisseur={editingFournisseur}
      />
    </div>
  );
}