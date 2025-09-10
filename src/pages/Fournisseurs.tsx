import React, { useState, useEffect } from 'react';
import { Fournisseur } from '../types';
import { FournisseurModal } from '../components/FournisseurModal';
import { Plus, Search, Edit2, Trash2, Truck, Mail, Phone, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FournisseursProps {
  fournisseurs: Fournisseur[];
  onAddFournisseur: (fournisseur: Omit<Fournisseur, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Fournisseur>;
  onUpdateFournisseur: (id: string, updates: Partial<Fournisseur>) => Promise<void>;
  onDeleteFournisseur: (id: string) => Promise<void>;
  onRefreshFournisseurs?: () => Promise<void>;
}

export function Fournisseurs({ fournisseurs, onAddFournisseur, onUpdateFournisseur, onDeleteFournisseur, onRefreshFournisseurs }: FournisseursProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Rafraîchir les fournisseurs à chaque visite de la page
  useEffect(() => {
    if (onRefreshFournisseurs) {
      onRefreshFournisseurs();
    }
  }, []); // Se déclenche uniquement au montage du composant

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
      } else {
        await onAddFournisseur(fournisseurData);
      }
      setEditingFournisseur(undefined);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fournisseur:', error);
      alert('Une erreur est survenue lors de la sauvegarde du fournisseur');
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
      } catch (error) {
        console.error('Erreur lors de la suppression du fournisseur:', error);
        alert('Une erreur est survenue lors de la suppression du fournisseur');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600">{filteredFournisseurs.length} fournisseur{filteredFournisseurs.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setEditingFournisseur(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nouveau fournisseur
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, contact ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Fournisseurs Grid */}
      {filteredFournisseurs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {fournisseurs.length === 0 ? 'Aucun fournisseur enregistré' : 'Aucun fournisseur trouvé'}
          </p>
          {fournisseurs.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Créer votre premier fournisseur
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFournisseurs.map(fournisseur => (
            <div key={fournisseur.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{fournisseur.nom}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditFournisseur(fournisseur)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteFournisseur(fournisseur.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} />
                  <span>{fournisseur.contact}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={16} />
                  <a href={`mailto:${fournisseur.email}`} className="text-blue-600 hover:underline">
                    {fournisseur.email}
                  </a>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={16} />
                  <a href={`tel:${fournisseur.telephone}`} className="text-blue-600 hover:underline">
                    {fournisseur.telephone}
                  </a>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{fournisseur.adresse}</span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Créé le {format(new Date(fournisseur.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </p>
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