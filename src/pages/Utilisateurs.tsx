import { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { UserModal } from '../components/UserModal';
import { Plus, Search, Edit2, Trash2, Users, Shield, BellRing } from 'lucide-react';
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


  const getRoleLabel = (role: string) => {
    const r = role.toLowerCase();
    switch (r) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Manager';
      case 'technicien': return 'Technicien';
      default: return role;
    }
  };

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role.toLowerCase() === 'admin').length,
    techniciens: users.filter(u => u.role.toLowerCase() === 'technicien').length,
  }), [users]);

  return (
    <div className="space-y-8 animate-fade-in pb-20 md:pb-8">
      {/* En-tête Premium */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Gestion des Utilisateurs
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium ml-12">
            Contrôle des accès et rôles de l'équipe
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 flex-1 sm:flex-none justify-center"
        >
          <Plus size={20} strokeWidth={3} />
          <span>Nouvel Utilisateur</span>
        </button>
      </div>

      {/* Stats Cards Premium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Users size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Équipe</span>
          </div>
          <div className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
            {stats.total}
          </div>
        </div>

        <div className="glass p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Shield className="text-rose-500" size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-2xl text-rose-600 dark:text-rose-400">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Administrateurs</span>
          </div>
          <div className="text-4xl font-black text-rose-600 dark:text-rose-400 tracking-tighter">
            {stats.admins}
          </div>
        </div>

        <div className="glass p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Shield className="text-emerald-500" size={120} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <Shield size={24} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Techniciens</span>
          </div>
          <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
            {stats.techniciens}
          </div>
        </div>
      </div>

      {/* Barre de Recherche Premium */}
      <div className="glass p-4 sm:p-6 rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-sm">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-4 py-4 bg-gray-50/50 dark:bg-gray-900/50 border border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-800 rounded-3xl outline-none transition-all font-medium text-gray-900 dark:text-white placeholder:text-gray-400 shadow-inner"
          />
        </div>
      </div>


      {filteredUsers.length === 0 ? (
        <div className="text-center py-20 glass rounded-[3rem] border border-dashed border-gray-300 dark:border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-full text-gray-300">
              <Users size={48} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">
              {users.length === 0 ? "Aucun utilisateur enregistré." : "Aucun résultat trouvé."}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full hidden sm:table text-center">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Membre</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Autorisation</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">État</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Arrivée</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredUsers.map(user => (
                <tr key={user.id} className="group hover:bg-white/40 dark:hover:bg-gray-800 transition-colors selection:bg-indigo-100">
                  <td className="px-8 py-5 text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {user.prenom[0]}{user.nom[0]}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white leading-tight">{user.prenom} {user.nom}</span>
                          {user.reset_requested_at && (
                            <span title="Demande de réinitialisation de mot de passe en attente" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
                              <BellRing size={10} />
                              Reset
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-left">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${user.role.toLowerCase() === 'admin'
                      ? 'bg-rose-50/50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
                      : user.role.toLowerCase() === 'manager'
                        ? 'bg-indigo-50/50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50'
                        : 'bg-emerald-50/50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                      }`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <button
                      onClick={() => toggleUserActive(user)}
                      disabled={user.id === currentUser.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95
                        ${user.is_active
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                          : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50'
                        } ${user.id === currentUser.id ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-8 py-5 text-xs font-bold text-gray-500 dark:text-gray-400 font-mono tracking-tighter">
                    {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                        title="Modifier"
                      >
                        <Edit2 size={18} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser.id}
                        className={`p-2.5 rounded-xl transition-all shadow-sm border border-transparent ${user.id === currentUser.id
                          ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
                          : 'text-gray-400 hover:text-rose-500 hover:bg-white dark:hover:bg-gray-800 hover:border-gray-100 dark:hover:border-gray-700'
                          }`}
                        title="Supprimer"
                      >
                        <Trash2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {filteredUsers.map(user => (
              <div key={user.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
                      {user.prenom[0]}{user.nom[0]}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white leading-tight">{user.prenom} {user.nom}</span>
                        {user.reset_requested_at && (
                          <span title="Demande de réinitialisation de mot de passe en attente" className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50">
                            <BellRing size={10} />
                            Reset
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user.email}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditUser(user)} className="p-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Edit2 size={16} /></button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === currentUser.id}
                      className={`p-2 rounded-lg ${user.id === currentUser.id ? 'text-gray-300' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/30'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${user.role.toLowerCase() === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : user.role.toLowerCase() === 'manager' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                    {getRoleLabel(user.role)}
                  </span>
                  <button
                    onClick={() => toggleUserActive(user)}
                    disabled={user.id === currentUser.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                      ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                  >
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
            ))}
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
