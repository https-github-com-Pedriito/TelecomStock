'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ArrowLeft, Plus, Users as UsersIcon, CheckCircle, XCircle, Trash2,
  RefreshCw, ChevronDown, ChevronUp, Pencil, Check, X, Copy
} from 'lucide-react';

interface TenantUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface TenantSummary {
  id: string;
  nom: string;
  seats: number;
  plan: string | null;
}

interface CreateUserForm {
  nom: string;
  prenom: string;
  email: string;
  role: string;
  is_active: boolean;
}

const emptyForm: CreateUserForm = { nom: '', prenom: '', email: '', role: 'MANAGER', is_active: true };

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  TECHNICIEN: 'Technicien',
};

export default function TenantUsersPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantSummary | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nom: string; prenom: string; role: string }>({ nom: '', prenom: '', role: 'MANAGER' });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTenantUsers(tenantId) as { tenant: TenantSummary; users: TenantUser[] };
      setTenant(data.tenant);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createTenantUser(tenantId, form) as TenantUser & { tempPassword: string };
      setSuccess(`Utilisateur "${created.prenom} ${created.nom}" créé.`);
      setTempPassword(created.tempPassword);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: TenantUser) => {
    try {
      await api.updateUser(user.id, { is_active: !user.is_active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const startEdit = (user: TenantUser) => {
    setError(null);
    setEditingId(user.id);
    setEditForm({ nom: user.nom, prenom: user.prenom, role: user.role });
  };

  const saveEdit = async (user: TenantUser) => {
    setSavingEdit(true);
    setError(null);
    try {
      await api.updateUser(user.id, editForm);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...editForm } : u));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteUser = async (user: TenantUser) => {
    if (!confirm(`Supprimer l'utilisateur "${user.prenom} ${user.nom}" ?`)) return;
    try {
      await api.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSuccess(`Utilisateur "${user.prenom} ${user.nom}" supprimé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const activeCount = users.filter(u => u.is_active).length;

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
          <h1 className="text-2xl font-bold text-gray-900">
            Utilisateurs — {tenant?.nom ?? '...'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} / {tenant?.seats ?? '—'} sièges utilisés
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nouvel utilisateur
            {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            {success}
            <button onClick={() => { setSuccess(null); setTempPassword(null); }} className="ml-auto text-green-400 hover:text-green-600">✕</button>
          </div>
          {tempPassword && (
            <div className="mt-2 flex items-center gap-2 font-mono text-xs bg-white border border-green-200 rounded-lg px-3 py-2">
              <span>Mot de passe temporaire : <strong>{tempPassword}</strong></span>
              <button
                onClick={() => navigator.clipboard.writeText(tempPassword)}
                className="ml-auto p-1 text-green-600 hover:bg-green-50 rounded"
                title="Copier"
              >
                <Copy size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Créer un utilisateur</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Prénom *</label>
              <input
                value={form.prenom}
                onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Nom *</label>
              <input
                value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="TECHNICIEN">Technicien</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium text-sm flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Créer l&apos;utilisateur
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl shadow-sm">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UsersIcon size={40} className="mb-3 opacity-40" />
            <p className="font-medium">Aucun utilisateur pour ce tenant</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rôle</th>
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
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="TECHNICIEN">Technicien</option>
                        </select>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">—</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => saveEdit(user)} disabled={savingEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Valider">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={savingEdit} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Annuler">
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
    </div>
  );
}
