'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nom_societe: '', slug: '', admin_prenom: '', admin_nom: '', admin_email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'nom_societe' ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setSuccess(true);
    } catch { setError('Erreur réseau.'); } finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Compte créé !</h2>
        <p className="text-gray-600 mb-6">Vos identifiants ont été envoyés par email.</p>
        <button onClick={() => router.push('/login')} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Se connecter</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Créer votre espace</h1>
        <p className="text-gray-500 text-sm mb-6">Démarrez sans carte bancaire</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société</label><input name="nom_societe" value={form.nom_societe} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-gray-400 font-normal">(identifiant unique)</span></label><input name="slug" value={form.slug} onChange={handleChange} required pattern="[a-z0-9-]+" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label><input name="admin_prenom" value={form.admin_prenom} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input name="admin_nom" value={form.admin_nom} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email administrateur</label><input name="admin_email" type="email" value={form.admin_email} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60">{loading ? 'Création...' : 'Créer mon espace'}</button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">Déjà un compte ? <Link href="/login" className="text-indigo-600 hover:underline">Se connecter</Link></p>
      </div>
    </div>
  );
}
