import { useState } from 'react';
import { Article, CreateMouvementData } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { MouvementModal } from '../components/MouvementModal';
import { ScanLine, ArrowUp, ArrowDown } from 'lucide-react';

interface ScannerProps {
  articles: Article[];
  getArticleByCodeBarres: (codeBarres: string) => Article | undefined;
  onAddMouvement: (mouvement: CreateMouvementData) => void;
  onAddArticle: (article: Omit<Article, 'id' | 'created_at' | 'updated_at'>) => Article;
  fournisseurs: Array<{ id: string; nom: string; }>;
  currentUser: { id: string; nom: string; prenom: string; };
}

export function Scanner({ getArticleByCodeBarres, onAddMouvement, onAddArticle, fournisseurs = [], currentUser }: ScannerProps) {
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
      // Création d'un nouvel article
      const nouvelArticle = onAddArticle({
        ...data,
        code_barres: selectedArticle?.code_barres || ''
      });
      setSelectedArticle(nouvelArticle);
      alert('Article créé avec succès !');
    } else if (data.article_id && data.quantite) {
      // Mouvement de stock
      onAddMouvement({
        article_id: data.article_id,
        quantite: data.quantite,
        type: data.type || 'ENTREE',
        utilisateur: data.utilisateur || 'Utilisateur actuel',
        commentaire: data.commentaire
      });
      alert('Mouvement enregistré avec succès !');
    }
    setSelectedArticle(undefined);
    setShowMouvementModal(false);
  };

  const startScanForType = (type: 'ENTREE' | 'SORTIE') => {
    setMouvementType(type);
    setShowScanner(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Scanner</h1>
        <p className="text-gray-600">Scanner des codes-barres pour identifier les articles</p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => startScanForType('ENTREE')}
          className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow border-l-4 border-green-500 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-full group-hover:bg-green-200 transition-colors">
              <ArrowUp className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Entrée de Stock</h2>
              <p className="text-gray-600 mb-4">Scanner un article pour enregistrer une entrée</p>
              <div className="flex items-center gap-2 text-green-600">
                <ScanLine size={18} />
                <span className="text-sm font-medium">Scanner maintenant</span>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => startScanForType('SORTIE')}
          className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow border-l-4 border-orange-500 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 p-4 rounded-full group-hover:bg-orange-200 transition-colors">
              <ArrowDown className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sortie de Stock</h2>
              <p className="text-gray-600 mb-4">Scanner un article pour enregistrer une sortie</p>
              <div className="flex items-center gap-2 text-orange-600">
                <ScanLine size={18} />
                <span className="text-sm font-medium">Scanner maintenant</span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions d'utilisation</h3>
        <div className="space-y-2 text-blue-800">
          <p>• Pointez la caméra vers le code-barres</p>
          <p>• Assurez-vous que l'éclairage est suffisant</p>
          <p>• Maintenez l'appareil stable pendant le scan</p>
          <p>• Utilisez le flash si nécessaire (bouton en haut)</p>
          <p>• Vous pouvez aussi saisir le code manuellement</p>
        </div>
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