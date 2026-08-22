'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { useNotifications } from '@/components/Notification';
import { Utilisateurs } from '@/src-pages/Utilisateurs';
import { api } from '@/lib/api';
import { User } from '@/types';

export default function UtilisateursPage() {
  const { user } = useAuth();
  const { users, refreshUsers } = useStock();
  const { addNotification } = useNotifications();

  if (!user) return null;

  const currentUser = { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role, created_at: user.created_at, updated_at: user.updated_at, is_active: user.is_active };

  return (
    <Utilisateurs
      users={users}
      currentUser={currentUser as User}
      onAddUser={async (data) => { const u = await api.createUser(data); await refreshUsers(); return u; }}
      onUpdateUser={async (id, data) => { await api.updateUser(id, data); await refreshUsers(); }}
      onDeleteUser={async (id) => { await api.deleteUser(id); await refreshUsers(); }}
      onRefreshUsers={refreshUsers}
      addNotification={addNotification}
    />
  );
}
