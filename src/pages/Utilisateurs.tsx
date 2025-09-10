import { useState, useEffect } from 'react';
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
}

export function Utilisateurs({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onRefreshUsers }: UtilisateursProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fonction pour afficher une notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    // Masquer automatiquement après 5 secondes
    setTimeout(() => setNotification(null), 5000);
  };

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
        if (hasPasswordChange) {
          showNotification('success', `Utilisateur ${userData.prenom} ${userData.nom} modifié avec succès. Le mot de passe a été mis à jour.`);
        } else {
          showNotification('success', `Utilisateur ${userData.prenom} ${userData.nom} modifié avec succès.`);
        }
      } else {
        await onAddUser(userData);
        showNotification('success', `Utilisateur ${userData.prenom} ${userData.nom} créé avec succès.`);
      }
      setEditingUser(undefined);
      setIsModalOpen(false);
    } catch (error) {
      const operation = editingUser ? 'modification' : 'création';
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      showNotification('error', `Erreur lors de la ${operation} de l'utilisateur : ${errorMessage}`);
      console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) {
      showNotification('error', 'Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    
    const userToDelete = users.find(u => u.id === id);
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${userToDelete?.prenom} ${userToDelete?.nom} ?`)) {
      try {
        await onDeleteUser(id);
        showNotification('success', `Utilisateur ${userToDelete?.prenom} ${userToDelete?.nom} supprimé avec succès.`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
        showNotification('error', `Erreur lors de la suppression de l'utilisateur : ${errorMessage}`);
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      }
    }
  };

    const toggleUserActive = async (user: User) => {
    if (user.id === currentUser.id) {
      showNotification('error', 'Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    try {
      await onUpdateUser(user.id, { is_active: !user.is_active });
      const action = user.is_active ? 'désactivé' : 'activé';
      showNotification('success', `Utilisateur ${user.prenom} ${user.nom} ${action} avec succès.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      showNotification('error', `Erreur lors de la modification du statut de l'utilisateur : ${errorMessage}`);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-600">{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nouvel utilisateur
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {users.length === 0 ? 'Aucun utilisateur enregistré' : 'Aucun utilisateur trouvé'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4">Utilisateur</th>
                  <th className="text-left py-3 px-4">Rôle</th>
                  <th className="text-left py-3 px-4">Statut</th>
                  <th className="text-left py-3 px-4">Créé le</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Users size={16} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.nom}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Shield size={14} />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleUserActive(user)}
                        disabled={user.id === currentUser.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } ${user.id === currentUser.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        {user.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === currentUser.id}
                          className={`p-2 rounded-lg transition-colors ${
                            user.id === currentUser.id
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={user.id === currentUser.id ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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