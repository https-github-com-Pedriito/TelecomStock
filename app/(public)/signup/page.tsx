'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { Suspense } from 'react';

const PLAN_INFO: Record<string, { label: string; unitPrice: number; maxSeats: number | null; features: string[] }> = {
  pro_mobile: {
    label: 'Pro Mobile',
    unitPrice: 19,
    maxSeats: 5,
    features: ["Jusqu'à 5 utilisateurs", 'Scanner de codes-barres', 'Alertes de stock critique'],
  },
  business: {
    label: 'Business',
    unitPrice: 29,
    maxSeats: null,
    features: ['Utilisateurs illimités', 'Multi-entrepôts', 'Exports CSV/Excel', 'Support prioritaire'],
  },
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') ?? '';

  const [form, setForm] = useState({
    nom_societe: '',
    slug: '',
    admin_prenom: '',
    admin_nom: '',
    admin_email: '',
  });
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const planInfo = PLAN_INFO[plan];

  const updateSeats = (next: number) => {
    const clamped = Math.max(1, planInfo?.maxSeats ? Math.min(next, planInfo.maxSeats) : next);
    setSeats(clamped);
  };

  useEffect(() => {
    if (!plan || !planInfo) router.replace('/pricing');
  }, [plan, planInfo, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'nom_societe'
        ? { slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }
        : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, plan, seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  if (!planInfo) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">

        {/* Récapitulatif du plan */}
        <div className="bg-blue-600 rounded-[2rem] p-8 text-white flex flex-col justify-between">
          <div>
            <button
              onClick={() => router.push('/pricing')}
              className="flex items-center gap-2 text-blue-200 hover:text-white mb-8 text-sm transition-colors"
            >
              <ArrowLeft size={16} />
              Changer de plan
            </button>
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
              {planInfo.label}
            </div>
            <div className="text-sm text-blue-200 mb-1">{planInfo.unitPrice}€ / utilisateur / mois</div>
            <div className="text-5xl font-extrabold mb-1">
              {planInfo.unitPrice * seats}€<span className="text-lg font-medium">/mois</span>
            </div>
            <p className="text-blue-200 text-sm mb-6">
              Abonnement mensuel, résiliable à tout moment
            </p>

            <div className="mb-8">
              <label className="block text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">
                Nombre d&apos;utilisateurs
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateSeats(seats - 1)}
                  disabled={seats <= 1}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 flex items-center justify-center transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="text-xl font-bold w-8 text-center">{seats}</span>
                <button
                  type="button"
                  onClick={() => updateSeats(seats + 1)}
                  disabled={planInfo.maxSeats !== null && seats >= planInfo.maxSeats}
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 flex items-center justify-center transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              {planInfo.maxSeats && (
                <p className="text-blue-200 text-xs mt-2">Plafonné à {planInfo.maxSeats} utilisateurs sur ce plan</p>
              )}
            </div>

            <ul className="space-y-3">
              {planInfo.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Check size={12} />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8 flex items-center gap-2 text-blue-200 text-xs">
            <CreditCard size={14} />
            Paiement sécurisé via Stripe
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white dark:bg-gray-800/50 rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700/50">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Créer votre espace</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Renseignez vos informations, vous serez ensuite redirigé vers le paiement.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom de la société
              </label>
              <input
                name="nom_societe"
                value={form.nom_societe}
                onChange={handleChange}
                required
                placeholder="Acme Telecom"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Identifiant unique{' '}
                <span className="text-gray-400 font-normal">(slug)</span>
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
                pattern="[a-z0-9-]+"
                placeholder="acme-telecom"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-mono bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
                <input
                  name="admin_prenom"
                  value={form.admin_prenom}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
                <input
                  name="admin_nom"
                  value={form.admin_nom}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email administrateur
              </label>
              <input
                name="admin_email"
                type="email"
                value={form.admin_email}
                onChange={handleChange}
                required
                placeholder="vous@societe.com"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={18} />
                  Payer {planInfo.unitPrice * seats}€/mois →
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
