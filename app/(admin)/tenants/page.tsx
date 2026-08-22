'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Building2, Plus, CheckCircle, XCircle, Trash2, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Pencil, Check, X, Users as UsersIcon } from 'lucide-react';

interface Tenant {
  id: string;
  nom: string;
  slug: string;
  is_active: boolean;
  contact_email?: string;
  created_at: string;
  plan?: string | null;
  seats?: number;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
}

interface DeactivatedUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

const PLAN_LABELS: Record<string, string> = {
  pro_mobile: 'Pro Mobile',
  business: 'Business',
};

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' },
  trialing: { label: 'Essai', className: 'bg-blue-100 text-blue-700' },
  past_due: { label: 'Retard', className: 'bg-amber-100 text-amber-700' },
  unpaid: { label: 'Impayé', className: 'bg-red-100 text-red-700' },
  canceled: { label: 'Résilié', className: 'bg-gray-200 text-gray-700' },
  paused: { label: 'En pause', className: 'bg-gray-200 text-gray-700' },
};

interface CreateTenantForm {
  nom: string;
  slug: string;
  contact_email: string;
  admin_nom: string;
  admin_prenom: string;
  admin_email: string;
}

const emptyForm: CreateTenantForm = {
  nom: '', slug: '', contact_email: '',
  admin_nom: '', admin_prenom: '', admin_email: '',
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateTenantForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSeatsId, setEditingSeatsId] = useState<string | null>(null);
  const [seatsValue, setSeatsValue] = useState('');
  const [savingSeats, setSavingSeats] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Tenant[]>('/admin/tenants');
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/admin/tenants', form);
      setSuccess(`Tenant "${form.nom}" créé avec succès. Email de bienvenue envoyé à ${form.admin_email}.`);
      setForm(emptyForm);
      setShowForm(false);
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (tenant: Tenant) => {
    try {
      await api.put(`/admin/tenants/${tenant.id}`, { is_active: !tenant.is_active });
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, is_active: !t.is_active } : t));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour');
    }
  };

  const startEditSeats = (tenant: Tenant) => {
    setError(null);
    setEditingSeatsId(tenant.id);
    setSeatsValue(String(tenant.seats ?? 1));
  };

  const cancelEditSeats = () => {
    setEditingSeatsId(null);
    setSeatsValue('');
  };

  const saveSeats = async (tenant: Tenant) => {
    const newSeats = parseInt(seatsValue, 10);
    if (!Number.isInteger(newSeats) || newSeats < 1) {
      setError("Nombre d'utilisateurs invalide");
      return;
    }
    setSavingSeats(true);
    setError(null);
    try {
      const updated = await api.put<Tenant & { deactivatedUsers?: DeactivatedUser[] }>(`/admin/tenants/${tenant.id}`, { seats: newSeats });
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, seats: updated.seats } : t));
      setEditingSeatsId(null);
      if (updated.deactivatedUsers && updated.deactivatedUsers.length > 0) {
        const names = updated.deactivatedUsers.map(u => `${u.prenom} ${u.nom}`).join(', ');
        setSuccess(`Limite de sièges atteinte : ${updated.deactivatedUsers.length} compte(s) désactivé(s) automatiquement (les plus récemment créés) — ${names}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise à jour des sièges');
    } finally {
      setSavingSeats(false);
    }
  };

  const deleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Supprimer le tenant "${tenant.nom}" et toutes ses données ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/tenants/${tenant.id}`);
      setTenants(prev => prev.filter(t => t.id !== tenant.id));
      setSuccess(`Tenant "${tenant.nom}" supprimé.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  };

  const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">{tenants.length} entreprise(s) enregistrée(s)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadTenants} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Actualiser">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/tenants/comptes"
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm"
          >
            <UsersIcon size={16} />
            Tous les comptes
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Nouveau tenant
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
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Créer un nouveau tenant</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Nom de l&apos;entreprise *</label>
              <input
                value={form.nom}
                onChange={e => setForm(p => ({ ...p, nom: e.target.value, slug: slugify(e.target.value) }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="ACME Corp"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Slug (identifiant URL) *</label>
              <input
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: slugify(e.target.value) }))}
                required
                pattern="[a-z0-9-]+"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono"
                placeholder="acme-corp"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Email de contact entreprise</label>
              <input
                type="email"
                value={form.contact_email}
                onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="contact@acme.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Email admin *</label>
              <input
                type="email"
                value={form.admin_email}
                onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="admin@acme.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Prénom admin</label>
              <input
                value={form.admin_prenom}
                onChange={e => setForm(p => ({ ...p, admin_prenom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="Jean"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Nom admin</label>
              <input
                value={form.admin_nom}
                onChange={e => setForm(p => ({ ...p, admin_nom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                placeholder="Dupont"
              />
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
                Créer le tenant
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Building2 size={40} className="mb-3 opacity-40" />
            <p className="font-medium">Aucun tenant enregistré</p>
            <p className="text-sm mt-1">Créez le premier tenant pour commencer</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sièges</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Abonnement</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Créé le</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 size={16} className="text-blue-600" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{tenant.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{tenant.slug}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tenant.contact_email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {tenant.plan && PLAN_LABELS[tenant.plan] ? PLAN_LABELS[tenant.plan] : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {editingSeatsId === tenant.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          value={seatsValue}
                          onChange={e => setSeatsValue(e.target.value)}
                          autoFocus
                          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <button
                          onClick={() => saveSeats(tenant)}
                          disabled={savingSeats}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Valider"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={cancelEditSeats}
                          disabled={savingSeats}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annuler"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditSeats(tenant)}
                        className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group"
                        title="Modifier le nombre de sièges"
                      >
                        {tenant.seats ?? '—'}
                        <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {tenant.subscription_status && STATUS_DISPLAY[tenant.subscription_status] ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_DISPLAY[tenant.subscription_status].className}`}>
                        {STATUS_DISPLAY[tenant.subscription_status].label}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(tenant)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {tenant.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {tenant.is_active ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/tenants/${tenant.id}/users`}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Gérer les utilisateurs"
                      >
                        <UsersIcon size={16} />
                      </Link>
                      {tenant.stripe_customer_id && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${tenant.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Voir le client dans Stripe"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => deleteTenant(tenant)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
