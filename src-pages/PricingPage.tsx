'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, Zap, Smartphone, Cloud, ArrowRight } from 'lucide-react';

interface PricingPageProps {
  onBack: () => void;
  onLogin: () => void;
}

const PLAN_SLUGS: Record<string, string> = {
  'Pro Mobile': 'pro_mobile',
  'Business': 'business',
};

export function PricingPage({ onBack, onLogin }: PricingPageProps) {
  const router = useRouter();
  const plans = [
    {
      name: "Pro Mobile",
      price: "19€",
      period: "/utilisateur/mois",
      description: "Idéal pour les artisans et petites équipes sur le terrain.",
      features: [
        "Jusqu'à 5 utilisateurs",
        "Gestion d'inventaire mobile",
        "Scanner de codes-barres",
        "Alertes de stock critique",
        "Support par email"
      ],
      icon: Smartphone,
      color: "blue",
      active: false
    },
    {
      name: "Business",
      price: "29€",
      period: "/utilisateur/mois",
      description: "Le plan le plus populaire pour les PME en croissance.",
      features: [
        "Utilisateurs illimités",
        "Gestion multi-entrepôts",
        "Historique complet des mouvements",
        "Exports de données CSV/Excel",
        "Support prioritaire 24/7",
        "Tableau de bord avancé"
      ],
      icon: Zap,
      color: "indigo",
      active: true
    },
    {
      name: "Premium Cloud",
      price: "Sur devis",
      period: "",
      description: "Solution sur mesure pour les grandes entreprises.",
      features: [
        "À partir de 20 utilisateurs",
        "Intégration ERP (Odoo, SAP, Sage)",
        "API dédiée",
        "Hébergement dédié possible",
        "Account Manager dédié",
        "SLA personnalisé"
      ],
      icon: Cloud,
      color: "purple",
      active: false
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button
              onClick={onBack}
              className="flex items-center gap-2 group text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Retour</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <Image src="/decimalestock.png" alt="Logo" fill sizes="32px" className="rounded-lg object-cover" />
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block text-gray-900 dark:text-white">Telecom Stock</span>
            </div>
            <button
              onClick={onLogin}
              className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              Se connecter
            </button>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-20 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">Une tarification simple et transparente</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choisissez le plan qui correspond à vos besoins et commencez à optimiser vos stocks dès aujourd'hui.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-8 rounded-[2.5rem] border transition-all hover:shadow-2xl flex flex-col ${plan.active
                ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 shadow-xl scale-105"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-blue-200 dark:hover:border-blue-800"
                }`}
            >
              {plan.active && (
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Recommandé
                </div>
              )}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${plan.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                plan.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'
                }`}>
                <plan.icon size={28} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 min-h-[40px]">{plan.description}</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm">
                    <Check size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  if (plan.price === 'Sur devis') {
                    window.location.href = 'mailto:promer@decimale.net?subject=Demande de devis - Telecom Stock';
                  } else {
                    const slug = PLAN_SLUGS[plan.name];
                    if (slug) router.push(`/signup?plan=${slug}`);
                  }
                }}
                className={`w-full py-4 rounded-2xl font-bold transition-all ${plan.active
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
              >
                {plan.price === 'Sur devis' ? 'Contacter l\'équipe' : 'Commencer — payer par carte'}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-[3rem] p-8 md:p-16 border border-gray-100 dark:border-gray-800">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Services professionnels</h2>
            <p className="text-gray-600 dark:text-gray-400">Besoin d'un accompagnement personnalisé ?</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowRight size={28} className="rotate-45" />
              </div>
              <h4 className="font-bold mb-2">Migration de données</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Transfert sécurisé de votre ancien système vers Telecom Stock sans interruption.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap size={28} />
              </div>
              <h4 className="font-bold mb-2">Intégration ERP</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Connectez Telecom Stock à vos outils existants : Odoo, SAP, Sage...
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Smartphone size={28} />
              </div>
              <h4 className="font-bold mb-2">Formation équipe</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Onboarding personnalisé et formation vidéo enregistrée pour vos techniciens.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/20 inline-block px-6 py-2 rounded-full">
              💡 Vous avez besoin d'une intégration personnalisée ? Contactez-nous pour un devis.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        © {new Date().getFullYear()} Telecom Stock. Tous droits réservés.
      </footer>
    </div>
  );
}
