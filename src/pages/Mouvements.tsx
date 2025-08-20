import React, { useState } from 'react';
import { Article, Mouvement } from '../types';
import { MouvementModal } from '../components/MouvementModal';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanLine, ArrowUp, ArrowDown, Package } from 'lucide-react';

interface MouvementsProps {
  articles: Article[];
  onAddMouvement: (mouvement: Omit<Mouvement, 'id' | 'dateHeure'>) => Mouvement;
  getArticleByCodeBarres: (codeBarres: string) => Article | undefined;
}

export function Mouvements({ articles, onAddMouvement, getArticleByCodeBarres }: MouvementsProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | undefined>();
  const [mouvementType, setMouvementType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [showMouvementModal, setShowMouvementModal] = useState(false);

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const article = getArticleByCodeBarres(barcode);
    
    if (article) {
      setSelectedArticle(article);
      setShowMouvementModal(true);
    } else {
      alert(`Article non trouvé pour le code-barres: ${barcode}`);
    }
  };

  const handleSaveMouvement = (mouvementData: Omit<Mouvement, 'id' | 'dateHeure'>) => {
    onAddMouvement(mouvementData);
    setSelectedArticle(undefined);
    alert('Mouvement enregistré avec succès !');
  };

  const startScanForType = (type: 'ENTREE' | 'SORTIE') => {
    setMouvementType(type);
    setShowScanner(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mouvements de Stock</h1>
        <p className="text-gray-600">Enregistrez les entrées et sorties de stock</p>
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

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques Rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
            <p className="text-sm text-gray-600">Articles</p>
          </div>
          <div className="text-center">
            <div className="bg-teal-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {articles.reduce((sum, a) => sum + a.quantiteStock, 0)}
            </p>
            <p className="text-sm text-gray-600">Stock Total</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <ArrowUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-600">Entrées du jour</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <ArrowDown className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">0</p>
            <p className="text-sm text-gray-600">Sorties du jour</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Comment ça marche ?</h3>
        <div className="space-y-2 text-blue-800">
          <p>• <strong>Entrée:</strong> Scanner → Saisir la quantité → Valider</p>
          <p>• <strong>Sortie:</strong> Scanner → Saisir la quantité → Choisir projet/technicien → Valider</p>
          <p>• <strong>Scanner:</strong> Utilisez la caméra ou saisissez le code-barres manuellement</p>
        </div>
      </div>

      {/* Scanner Modal */}
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
        onSave={handleSaveMouvement}
        article={selectedArticle}
        type={mouvementType}
      />
    </div>
  );
}