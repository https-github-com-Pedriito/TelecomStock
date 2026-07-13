import { ArrowLeft, Shield, Lock, Eye, Database, Share2, Mail } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
  onLogin: () => void;
}

export function PrivacyPage({ onBack, onLogin }: PrivacyPageProps) {
  const sections = [
    {
      title: "1. Collecte des données",
      content: "Nous collectons les informations que vous nous fournissez directement lors de la création de votre compte : nom, prénom, adresse e-mail professionnelle et informations sur votre entreprise. Nous collectons également des données d'utilisation pour améliorer nos services.",
      icon: Database
    },
    {
      title: "2. Utilisation des données",
      content: "Vos données sont utilisées exclusivement pour fournir et améliorer le service Telecom Stock, gérer votre compte, traiter vos paiements et vous envoyer des notifications importantes relatives à la gestion de vos stocks.",
      icon: Eye
    },
    {
      title: "3. Protection des données",
      content: "La sécurité est notre priorité. Toutes les données sont chiffrées en transit (SSL/TLS) et au repos. Nous utilisons des serveurs sécurisés situés au sein de l'Union Européenne et conformes aux plus hauts standards de sécurité.",
      icon: Lock
    },
    {
      title: "4. Partage des données",
      content: "Telecom Stock ne vend jamais vos données personnelles à des tiers. Les données ne sont partagées qu'avec nos prestataires de confiance nécessaires au fonctionnement du service (hébergement, paiement) et uniquement dans la mesure nécessaire.",
      icon: Share2
    },
    {
      title: "5. Vos droits (RGPD)",
      content: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données. Vous pouvez exercer ces droits à tout moment depuis les paramètres de votre compte ou en nous contactant.",
      icon: Shield
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
          <h1 className="text-4xl font-extrabold mb-6">Politique de confidentialité</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="space-y-12 mb-20">
          {sections.map((section, i) => (
            <section key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                  <section.icon size={24} />
                </div>
                <h2 className="text-2xl font-bold">{section.title}</h2>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed ml-14">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 md:p-12 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/20 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-grow">
            <h3 className="text-xl font-bold mb-2">Une question sur vos données ?</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Notre Délégué à la Protection des Données (DPO) est à votre disposition pour toute demande concernant vos informations personnelles.
            </p>
          </div>
          <a 
            href="mailto:privacy@telecomstock.com"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full font-bold shadow-sm hover:shadow-md transition-shadow border border-blue-100 dark:border-blue-800"
          >
            <Mail size={18} />
            Nous contacter
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
        © {new Date().getFullYear()} Telecom Stock. Tous droits réservés.
      </footer>
    </div>
  );
}
