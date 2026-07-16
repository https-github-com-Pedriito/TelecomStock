'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft, Users as UsersIcon, CheckCircle, XCircle, Trash2,
  RefreshCw, Pencil, Check, X
} from 'lucide-react';

interface AccountUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  is_active: boolean;
  tenant_id: string | null;
  tenant_nom: string | null;
}

interface TenantOption {
  id: string;
  nom: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TECHNICIEN: 'Technicien',
};

export default function AllAccountsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nom: string; prenom: string; role: string }>({ nom: '', prenom: '', role: 'MANAGER' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, tenantsData] = await Promise.all([
        api.getAllUsers() as Promise<AccountUser[]>,
        api.get<TenantOption[]>('/admin/tenants'),
      ]);
      setUsers(usersData);
      setTenants(tenantsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user: AccountUser) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const startEdit = (user: AccountUser) => {
    setError(null);
    setEditingId(user.id);
    setEditForm({ nom: user.nom, prenom: user.prenom, role: user.role });
  };

  const saveEdit = async (user: AccountUser) => {
    setSavingId(user.id);
    setError(null);
    try {
      await api.updateUser(user.id, editForm);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...editForm } : u));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setSavingId(null);
    }
  };

  const reassignTenant = async (user: AccountUser, tenantId: string) => {
    setReassigningId(user.id);
    setError(null);
    try {
      await api.assignUserToTenant(user.id, tenantId || null);
      const tenantNom = tenantId ? tenants.find(t => t.id === tenantId)?.nom ?? null : null;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, tenant_id: tenantId || null, tenant_nom: tenantNom } : u));
      setSuccess(`${user.prenom} ${user.nom} ${tenantId ? `assigné(e) à ${tenantNom}` : 'retiré(e) de son tenant'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'assignation");
    } finally {
      setReassigningId(null);
    }
  };

  const deleteUser = async (user: AccountUser) => {
    if (!confirm(`Supprimer le compte "${user.prenom} ${user.nom}" ?`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSuccess(`Compte "${user.prenom} ${user.nom}" supprimé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/tenants')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Retour aux tenants
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tous les comptes</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} compte(s) au total, toutes entreprises confondues</p>
        </div>
        <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UsersIcon size={40} className="mb-3 opacity-40" />
            <p className="font-medium">Aucun compte</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  {editingId === user.id ? (
                    <>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <input
                            value={editForm.prenom}
                            onChange={e => setEditForm(p => ({ ...p, prenom: e.target.value }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                            placeholder="Prénom"
                          />
                          <input
                            value={editForm.nom}
                            onChange={e => setEditForm(p => ({ ...p, nom: e.target.value }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm"
                            placeholder="Nom"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-3">
                        <select
                          value={editForm.role}
                          onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                          className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="TECHNICIEN">Technicien</option>
                        </select>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">—</td>
                      <td className="px-6 py-3 text-sm text-gray-400">—</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => saveEdit(user)} disabled={savingId === user.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Valider">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={savingId === user.id} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Annuler">
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 text-sm">{user.prenom} {user.nom}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'SUPER_ADMIN' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <select
                            value={user.tenant_id ?? ''}
                            onChange={e => reassignTenant(user, e.target.value)}
                            disabled={reassigningId === user.id}
                            className={`px-2 py-1 border rounded-lg text-xs ${user.tenant_id ? 'border-gray-300 text-gray-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}
                          >
                            <option value="">Aucun tenant</option>
                            {tenants.map(t => (
                              <option key={t.id} value={t.id}>{t.nom}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            user.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {user.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {user.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => startEdit(user)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => deleteUser(user)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
