import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserModal } from '../components/UserModal';
import { Plus, Search, Edit2, Trash2, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UtilisateursProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => Promise<User>;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onRefreshUsers?: () => Promise<void>;
  addNotification?: (notif: { type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string; duration?: number }) => void;
}

export function Utilisateurs({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onRefreshUsers, addNotification }: UtilisateursProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  // Utiliser la notification globale

  // Recharger les utilisateurs à chaque visite de la page
  useEffect(() => {
    if (onRefreshUsers) {
      onRefreshUsers();
    }
  }, []); // Se déclenche uniquement au montage du composant

  const filteredUsers = users.filter(user =>
    user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, userData);
        const hasPasswordChange = 'password' in userData && userData.password;
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Utilisateur modifié',
            message: hasPasswordChange
              ? `Utilisateur ${userData.prenom} ${userData.nom} modifié avec succès. Le mot de passe a été mis à jour.`
              : `Utilisateur ${userData.prenom} ${userData.nom} modifié avec succès.`,
            duration: 5000,
          });
        }
      } else {
        await onAddUser(userData);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Utilisateur créé',
            message: `Utilisateur ${userData.prenom} ${userData.nom} créé avec succès.`,
            duration: 5000,
          });
        }
      }
      setEditingUser(undefined);
      setIsModalOpen(false);
    } catch (error) {
      const operation = editingUser ? 'modification' : 'création';
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      if (addNotification) {
        addNotification({
          type: 'error',
          title: `Erreur ${operation} utilisateur`,
          message: `Erreur lors de la ${operation} de l'utilisateur : ${errorMessage}`,
          duration: 5000,
        });
      }
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) {
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Suppression impossible',
          message: 'Vous ne pouvez pas supprimer votre propre compte',
          duration: 5000,
        });
      }
      return;
    }
    
    const userToDelete = users.find(u => u.id === id);
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete?.prenom} ${userToDelete?.nom} ?`)) {
      try {
        await onDeleteUser(id);
        if (addNotification) {
          addNotification({
            type: 'success',
            title: 'Utilisateur supprimé',
            message: `Utilisateur ${userToDelete?.prenom} ${userToDelete?.nom} supprimé avec succès.`,
            duration: 5000,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
        if (addNotification) {
          addNotification({
            type: 'error',
            title: 'Erreur suppression utilisateur',
            message: `Erreur lors de la suppression de l'utilisateur : ${errorMessage}`,
            duration: 5000,
          });
        }
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      }
    }
  };

    const toggleUserActive = async (user: User) => {
    if (user.id === currentUser.id) {
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Action impossible',
          message: 'Vous ne pouvez pas désactiver votre propre compte',
          duration: 5000,
        });
      }
      return;
    }
    try {
      await onUpdateUser(user.id, { is_active: !user.is_active });
      const action = user.is_active ? 'désactivé' : 'activé';
      if (addNotification) {
        addNotification({
          type: 'success',
          title: `Utilisateur ${action}`,
          message: `Utilisateur ${user.prenom} ${user.nom} ${action} avec succès.`,
          duration: 5000,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      if (addNotification) {
        addNotification({
          type: 'error',
          title: 'Erreur modification statut',
          message: `Erreur lors de la modification du statut de l'utilisateur : ${errorMessage}`,
          duration: 5000,
        });
      }
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'technicien': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Manager';
      case 'technicien': return 'Technicien';
      default: return role;
    }
  };

  return (

    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 bg-white dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Utilisateurs</h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm sm:text-base transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nouvel utilisateur</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 sm:p-4">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>


      {/* Users Table - Mobile optimisé */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 mb-4 text-sm">
            {users.length === 0 ? 'Aucun utilisateur enregistré' : 'Aucun utilisateur trouvé'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.map(user => (
              <li key={user.id} className="flex flex-col sm:flex-row sm:items-center py-2 px-2 sm:px-4 gap-2 sm:gap-0 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 flex-1">
                  <div className="bg-blue-100 dark:bg-blue-950 p-1 rounded-full">
                    <Users size={18} className="text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-base">{user.nom}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{user.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Shield size={12} className="text-gray-500 dark:text-gray-300" />
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)} dark:bg-opacity-40 dark:text-opacity-90`}>{getRoleLabel(user.role)}</span>
                </div>
                <div>
                   <span
                  className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap justify-center
                    ${user.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    } ${user.id === currentUser.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  {user.is_active ? <CheckCircle size={10} className="text-green-600 dark:text-green-300" /> : <XCircle size={10} className="text-red-600 dark:text-red-300" />}
                  {user.is_active ? 'Actif' : 'Inactif'}
                </span>
                </div>
               
                <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[60px] text-center">{format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-1 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:hover:bg-yellow-900 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={user.id === currentUser.id}
                    className={`p-1 rounded-lg transition-colors ${
                      user.id === currentUser.id
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900'
                    }`}
                    title={user.id === currentUser.id ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        user={editingUser}
      />

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
          notification.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
            >
              <XCircle size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}