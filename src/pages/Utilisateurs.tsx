import React, { useState } from 'react';
import { User } from '../types';
import { UserModal } from '../components/UserModal';
import { Plus, Search, Edit2, Trash2, Users, Shield, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UtilisateursProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => User;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
}

export function Utilisateurs({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser }: UtilisateursProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (editingUser) {
      onUpdateUser(editingUser.id, userData);
    } else {
      onAddUser(userData);
    }
    setEditingUser(undefined);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      onDeleteUser(id);
    }
  };

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    onUpdateUser(user.id, { isActive: !user.isActive });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'MANAGER': return 'bg-blue-100 text-blue-800';
      case 'TECHNICIEN': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrateur';
      case 'MANAGER': return 'Manager';
      case 'TECHNICIEN': return 'Technicien';
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
                        onClick={() => toggleUserStatus(user)}
                        disabled={user.id === currentUser.id}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          user.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } ${user.id === currentUser.id ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr })}
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
    </div>
  );
}