import { useState } from 'react';
import { Article, CreateMouvementData } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { MouvementModal } from '../components/MouvementModal';
import { ArrowUp, ArrowDown, ScanLine, Keyboard, CheckCircle } from 'lucide-react';

interface ScannerProps {
  articles: Article[];
  getArticleByCodeBarres: (codeBarres: string) => Article | undefined;
  onAddMouvement: (mouvement: CreateMouvementData) => void;
  onAddArticle: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => Article;
  addNotification?: (notif: { type: string; title: string; message: string; duration?: number }) => void;
  fournisseurs: Array<{ id: string; nom: string; }>;
  currentUser: { id: string; nom: string; prenom: string; };
}

export function Scanner(props: ScannerProps) {
  const { getArticleByCodeBarres, onAddMouvement, onAddArticle, fournisseurs = [], currentUser } = props;
  /* Removed unused Article loading state */
  // Use addNotification from props
  const [showScanner, setShowScanner] = useState(false);
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | undefined>();
  const [mouvementType, setMouvementType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    console.log('🔍 Code-barres scanné:', barcode);
    const article = getArticleByCodeBarres(barcode);
    console.log('📦 Article trouvé:', article);

    setSelectedArticle(article || {
      id: 'new',
      nom: '',
      categorie: '',
      fournisseur: '',
      localisation: '',
      seuil_minimum: 0,
      quantite_stock: 0,
      code_barres: barcode,
      created_at: new Date(),
      updated_at: new Date()
    });
    setShowMouvementModal(true);
  };

  const handleSave = (data: any) => {
    if (data.nom) {
      try {
        const nouvelArticle = onAddArticle({
          ...data,
          code_barres: selectedArticle?.code_barres || ''
        });
        setSelectedArticle(nouvelArticle);
        if (typeof (props as any).addNotification === 'function') {
          (props as any).addNotification({
            type: 'success',
            title: 'Article créé',
            message: `L'article "${nouvelArticle.nom}" a été ajouté avec succès.`,
            duration: 5000,
          });
        }
      } catch (err) {
        console.error('Erreur lors de l\'ajout de l\'article:', err);
      }
    } else if (data.article_id && data.quantite) {
      const utilisateurNom = currentUser ? `${currentUser.prenom} ${currentUser.nom}` : 'Utilisateur inconnu';
      onAddMouvement({
        article_id: data.article_id,
        quantite: data.quantite,
        type: data.type || 'ENTREE',
        utilisateur: utilisateurNom,
        commentaire: data.commentaire
      });
      if (typeof (props as any).addNotification === 'function') {
        (props as any).addNotification({
          type: 'success',
          title: 'Mouvement enregistré',
          message: 'Mouvement enregistré avec succès !',
          duration: 4000,
        });
      }
    }
    setSelectedArticle(undefined);
    setShowMouvementModal(false);
  };

  const startScanForType = (type: 'ENTREE' | 'SORTIE') => {
    setMouvementType(type);
    setShowScanner(true);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            Scanner <span className="text-blue-600">Optique</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Gestion intelligente des entrées et sorties via code-barres</p>
        </div>

        <div className="flex items-center gap-4 bg-white/40 dark:bg-gray-950/40 backdrop-blur-xl p-2 rounded-2xl border border-white/40 dark:border-gray-800/50 shadow-sm">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <ScanLine className="w-6 h-6 text-blue-600" />
          </div>
          <div className="pr-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanner Ready</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">Capteur Actif</div>
          </div>
        </div>
      </div>

      {/* Premium Instructions */}
      <div className="glass p-10 rounded-[2.5rem] border-white/40 dark:border-gray-800/50 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-inner">
              <ScanLine size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Cadrage Précis</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">Centrez le code-barres dans le viseur pour un scan instantané.</p>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-500/20 shadow-inner">
              <CheckCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Stabilité</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">Maintenez l'appareil stable pour éviter les erreurs de lecture optique.</p>
            </div>
          </div>

          <div className="flex items-start gap-5">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-500/20 shadow-inner">
              <Keyboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-1">Mode Manuel</h4>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">En cas de code endommagé, utilisez la saisie manuelle via le clavier.</p>
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button
          onClick={() => startScanForType('ENTREE')}
          className="relative group overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16 group-hover:bg-emerald-500/20 transition-colors" />
          <div className="relative p-10 flex flex-col h-full">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
              <ArrowUp className="w-8 h-8 text-emerald-600" strokeWidth={3} />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Flux Entrant</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">JE DÉPOSE</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                Livraison, retour ou réintégration d'équipement en stock de manière sécurisée.
              </p>
            </div>

            <div className="flex items-center justify-between text-emerald-600 font-black text-sm uppercase tracking-widest mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
              <span>Lancer le scan</span>
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center group-hover:translate-x-2 transition-transform shadow-lg shadow-emerald-600/20">
                <ScanLine size={20} strokeWidth={3} />
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => startScanForType('SORTIE')}
          className="relative group overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-white/40 dark:border-gray-800/50 shadow-xl shadow-gray-200/50 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 text-left"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16 group-hover:bg-orange-500/20 transition-colors" />
          <div className="relative p-10 flex flex-col h-full">
            <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-8 border border-orange-500/20 group-hover:scale-110 transition-transform duration-500">
              <ArrowDown className="w-8 h-8 text-orange-600" strokeWidth={3} />
            </div>

            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Flux Sortant</span>
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">JE RETIRE</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8">
                Sortie de matériel pour installation, maintenance ou transfert inter-dépôts.
              </p>
            </div>

            <div className="flex items-center justify-between text-orange-600 font-black text-sm uppercase tracking-widest mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
              <span>Lancer le scan</span>
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center group-hover:translate-x-2 transition-transform shadow-lg shadow-orange-600/20">
                <ScanLine size={20} strokeWidth={3} />
              </div>
            </div>
          </div>
        </button>
      </div>


      {/* Scanner Component */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Mouvement Modal */}
      <MouvementModal
        isOpen={showMouvementModal}
        onClose={() => {
          setShowMouvementModal(false);
          setSelectedArticle(undefined);
        }}
        onSave={handleSave}
        article={selectedArticle}
        type={mouvementType}
        fournisseurs={fournisseurs}
        currentUser={currentUser}
      />
    </div>
  );
}