'use client';

import { ArrowLeft, FileCheck, Scale, AlertCircle, Ban, Clock, Gavel } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
  onLogin: () => void;
}

export function TermsPage({ onBack, onLogin }: TermsPageProps) {
  const sections = [
    {
      title: "1. Description du Service",
      content: "Telecom Stock est une plateforme SaaS de gestion d'inventaire et de suivi de matériel technique. Le service comprend l'accès à une interface web, des fonctionnalités mobiles et des outils de reporting.",
      icon: FileCheck
    },
    {
      title: "2. Obligations de l'Utilisateur",
      content: "L'utilisateur s'engage à fournir des informations exactes lors de son inscription, à maintenir la confidentialité de ses identifiants de connexion et à utiliser le service conformément aux lois en vigueur.",
      icon: Scale
    },
    {
      title: "3. Propriété Intellectuelle",
      content: "Tous les éléments de la plateforme Telecom Stock (logiciel, design, marques, logos) sont la propriété exclusive de Telecom Stock. L'utilisation du service ne confère aucun droit de propriété intellectuelle.",
      icon: Gavel
    },
    {
      title: "4. Responsabilité et Garantie",
      content: "Telecom Stock s'efforce d'assurer une disponibilité maximale du service. Toutefois, nous ne saurions être tenus responsables des interruptions de service dues à des cas de force majeure ou à des problèmes techniques imprévus.",
      icon: AlertCircle
    },
    {
      title: "5. Résiliation et Suspension",
      content: "Vous pouvez résilier votre abonnement à tout moment via votre interface client. Telecom Stock se réserve le droit de suspendre tout compte en cas de violation grave des présentes conditions d'utilisation.",
      icon: Ban
    },
    {
      title: "6. Droit Applicable",
      content: "Les présentes conditions sont soumises au droit français. Tout litige relatif à l'interprétation ou à l'exécution des présentes sera de la compétence exclusive des tribunaux du siège social de Telecom Stock.",
      icon: Clock
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
              <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center p-1 shadow-sm border border-gray-100 dark:border-gray-800">
                <img src="/decimalestock.png" alt="Logo" className="w-full h-full object-contain" />
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

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-16 animate-fade-in text-center sm:text-left">
          <h1 className="text-4xl font-extrabold mb-6">Conditions d'utilisation</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            En utilisant Telecom Stock, vous acceptez l'intégralité des conditions détaillées ci-dessous.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Dernière modification : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800/50 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 p-8 md:p-12 mb-12 shadow-sm">
          <div className="grid gap-12">
            {sections.map((section, i) => (
              <section key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                    <section.icon size={22} />
                  </div>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed ml-14">
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex items-start gap-4">
          <AlertCircle className="text-amber-600 mt-1 flex-shrink-0" size={24} />
          <p className="text-sm text-amber-800 dark:text-amber-400">
            <strong>Important :</strong> Les présentes conditions générales peuvent être modifiées à tout moment. Les utilisateurs seront informés par e-mail ou via la plateforme en cas de modification substantielle.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        © {new Date().getFullYear()} Telecom Stock. Tous droits réservés.
      </footer>
    </div>
  );
}
