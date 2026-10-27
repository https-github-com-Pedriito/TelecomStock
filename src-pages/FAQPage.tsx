'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Plus, Minus, HelpCircle, MessageCircle, FileText, Smartphone } from 'lucide-react';

interface FAQPageProps {
  onBack: () => void;
  onLogin: () => void;
}

export function FAQPage({ onBack, onLogin }: FAQPageProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Comment fonctionne la facturation ?",
      answer: "La facturation est mensuelle et calculée par utilisateur actif : 19€/utilisateur pour Pro Mobile, 29€/utilisateur pour Business. Vous choisissez le nombre de sièges à l'inscription et le montant s'ajuste automatiquement."
    },
    {
      question: "Puis-je résilier ou changer de plan à tout moment ?",
      answer: "Oui, vous pouvez résilier votre abonnement à tout moment depuis Paramètres > Facturation (portail sécurisé Stripe). Pour changer de plan ou ajuster votre nombre d'utilisateurs, contactez notre support."
    },
    {
      question: "Y a-t-il un engagement minimum ?",
      answer: "Non. Aucun contrat obligatoire ou engagement à long terme n'est requis. Vous pouvez annuler votre abonnement à tout moment."
    },
    {
      question: "Que se passe-t-il avec mes données ?",
      answer: "Vos données vous appartiennent. Vous pouvez les exporter au format CSV ou Excel à tout instant, ou demander leur suppression définitive de nos serveurs."
    },
    {
      question: "Quel est le délai de déploiement ?",
      answer: "Généralement quelques minutes. Une fois votre compte créé, vous accédez immédiatement à la plateforme pour configurer vos entrepôts et articles."
    },
    {
      question: "Proposez-vous du support ?",
      answer: "Oui, selon votre plan. Nous proposons un support par email pour tous, et un chat 24/7 pour les offres Business et Premium Cloud."
    },
    {
      question: "Telecom Stock est-il conforme au RGPD ?",
      answer: "Absolument. La protection de vos données est notre priorité. Toutes les données sont chiffrées et stockées sur des serveurs sécurisés en Europe."
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

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl mb-6">
            <HelpCircle size={32} />
          </div>
          <h1 className="text-4xl font-extrabold mb-6">Questions Fréquentes</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Trouvez rapidement des réponses à vos questions sur Telecom Stock.
          </p>
        </div>

        <div className="space-y-4 mb-20">
          {faqs.map((faq, i) => (
            <div 
              key={i} 
              className={`border rounded-3xl transition-all ${
                openIndex === i 
                  ? "border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 shadow-sm" 
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700"
              }`}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left px-8 py-6 flex items-center justify-between"
              >
                <span className="font-bold text-lg">{faq.question}</span>
                <div className={`p-1 rounded-full ${openIndex === i ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                  {openIndex === i ? <Minus size={20} /> : <Plus size={20} />}
                </div>
              </button>
              {openIndex === i && (
                <div className="px-8 pb-6 animate-slide-up">
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageCircle size={24} />
            </div>
            <h4 className="font-bold mb-2">Chat en direct</h4>
            <p className="text-xs text-gray-500 mb-4">Réponse en moins de 5 min</p>
            <button className="text-blue-600 font-bold text-sm hover:underline">Démarrer une session</button>
          </div>
          <div className="bg-white dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText size={24} />
            </div>
            <h4 className="font-bold mb-2">Documentation</h4>
            <p className="text-xs text-gray-500 mb-4">Guides complets et tutoriels</p>
            <button className="text-emerald-600 font-bold text-sm hover:underline">Consulter l'aide</button>
          </div>
          <div className="bg-white dark:bg-gray-800/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Smartphone size={24} />
            </div>
            <h4 className="font-bold mb-2">Support mobile</h4>
            <p className="text-xs text-gray-500 mb-4">Assistance via WhatsApp</p>
            <button className="text-purple-600 font-bold text-sm hover:underline">Nous contacter</button>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        © {new Date().getFullYear()} Telecom Stock. Tous droits réservés.
      </footer>
    </div>
  );
}
