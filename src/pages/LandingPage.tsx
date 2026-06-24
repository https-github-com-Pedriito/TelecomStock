import { Shield, Zap, Smartphone, ArrowRight, BarChart3, Database, HeadphonesIcon } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onNavigate: (view: 'landing' | 'login' | 'pricing' | 'faq' | 'privacy' | 'terms') => void;
}

export function LandingPage({ onLoginClick, onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center p-1.5 shadow-md border border-gray-100 dark:border-gray-700">
                <img src="/decimalestock.png" alt="Telecom Stock Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Telecom Stock</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={onLoginClick}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Espace client
              </button>
              <button 
                onClick={onLoginClick}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 gap-2"
              >
                Se connecter <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-sm mb-8 border border-blue-100 dark:border-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              V1.2.0 maintenant disponible
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-gray-900 dark:text-white">
              Gérez vos stocks avec <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                précision et agilité
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Rentabilisez vos équipes • Maîtrisez vos stocks • Simplifiez votre opérationnel avec notre plateforme moderne.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold text-lg shadow-xl hover:scale-105 transition-transform"
                onClick={onLoginClick}
              >
                Démarrer maintenant
              </button>
              <a 
                href="mailto:contact@telecomstock.fr"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 rounded-full font-bold text-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                Contacter l'équipe
              </a>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Pourquoi choisir notre plateforme</h2>
              <p className="text-gray-600 dark:text-gray-400">Des outils pensés pour votre productivité quotidienne</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: Zap, title: "Mise en place rapide", desc: "Déployé en minutes, pas de configuration complexe", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-500/10" },
                { icon: Smartphone, title: "Mobile-first", desc: "Optimisé pour tous les appareils mobiles", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-500/10" },
                { icon: Shield, title: "Sécurisé", desc: "Vos données sont protégées et chiffrées selon la norme RGPD", color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
                { icon: HeadphonesIcon, title: "Support réactif", desc: "L'équipe est disponible pour vous aider 24/7 sur les offres payantes", color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-500/10" },
                { icon: Database, title: "Flexible", desc: "Changez de plan ou annulez à tout moment", color: "text-pink-500", bg: "bg-pink-100 dark:bg-pink-500/10" },
                { icon: BarChart3, title: "Analytics", desc: "Suivez vos stocks et vos mouvements en temps réel", color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-500/10" }
              ].map((f, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
                  <div className={`w-14 h-14 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center mb-6`}>
                    <f.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{f.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600 dark:bg-blue-700 pointer-events-none"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400/20 to-transparent pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8">
              Prêt à transformer votre gestion de stock ?
            </h2>
            <p className="text-xl text-blue-100 mb-12 opacity-90">
              Rejoignez les entreprises qui font confiance à Telecom Stock pour leur efficacité opérationnelle.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={onLoginClick}
                className="w-full sm:w-auto px-10 py-5 bg-white text-blue-600 rounded-full font-bold text-xl shadow-2xl hover:scale-105 transition-all active:scale-95"
              >
                Démarrer l'essai gratuit
              </button>
              <a 
                href="mailto:contact@telecomstock.fr?subject=Demande d'information - Telecom Stock"
                className="w-full sm:w-auto px-10 py-5 bg-blue-500/20 hover:bg-blue-500/40 text-white border-2 border-white/30 backdrop-blur-md rounded-full font-bold text-xl transition-all hover:scale-105 active:scale-95"
              >
                Contacter l'équipe
              </a>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 bg-white dark:bg-[#0f172a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                   <img src="/decimalestock.png" alt="Logo mini" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">Telecom Stock</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Simplifiez votre gestion d'inventaire, protégez vos données et rentabilisez vos équipes avec Telecom Stock.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                <li><button onClick={() => onNavigate('pricing')} className="hover:text-blue-600 dark:hover:text-blue-400">Tarification</button></li>
                <li><button onClick={() => onNavigate('faq')} className="hover:text-blue-600 dark:hover:text-blue-400">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-500 dark:text-gray-400">
                <li><button onClick={() => onNavigate('privacy')} className="hover:text-blue-600 dark:hover:text-blue-400">Politique de confidentialité</button></li>
                <li><button onClick={() => onNavigate('terms')} className="hover:text-blue-600 dark:hover:text-blue-400">Conditions d'utilisation</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Telecom Stock. Tous droits réservés.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 rounded-full">
              <Shield size={16} className="text-emerald-500" />
              <span>Conforme au RGPD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
