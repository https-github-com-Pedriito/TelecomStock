import React, { useState } from 'react';
import { Article, Mouvement } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { MouvementModal } from '../components/MouvementModal';
import { ScanLine, Package, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface ScannerProps {
  articles: Article[];
  getArticleByCodeBarres: (codeBarres: string) => Article | undefined;
  onAddMouvement: (mouvement: Omit<Mouvement, 'id' | 'dateHeure'>) => Mouvement;
}

export function Scanner({ articles, getArticleByCodeBarres, onAddMouvement }: ScannerProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | undefined>();
  const [mouvementType, setMouvementType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [scanResult, setScanResult] = useState<{
    article: Article | null;
    barcode: string;
    timestamp: Date;
  } | null>(null);

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const article = getArticleByCodeBarres(barcode);
    
    if (article) {
      setSelectedArticle(article);
      setShowMouvementModal(true);
      setScanResult({
        article,
        barcode,
        timestamp: new Date(),
      });
    } else {
      // Créer un article de démonstration si le code-barres n'existe pas
      const demoArticle = {
        id: `demo-${Date.now()}`,
        nom: `Article scanné ${barcode.slice(-4)}`,
        categorie: 'Équipements réseau',
        fournisseur: 'TelecomParts Pro',
        localisation: 'Entrepôt principal',
        seuilMinimum: 5,
        quantiteStock: 10,
        codeBarres: barcode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setScanResult({
        article: demoArticle,
        barcode,
        timestamp: new Date(),
      });
      
      setSelectedArticle(demoArticle);
      setShowMouvementModal(true);
    }
  };

  const handleSaveMouvement = (mouvementData: Omit<Mouvement, 'id' | 'dateHeure'>) => {
    onAddMouvement(mouvementData);
    setSelectedArticle(undefined);
    setShowMouvementModal(false);
    alert('Mouvement enregistré avec succès !');
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

      {/* Scan Result */}
      {scanResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold">Résultat du scan</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Code-barres scanné:</p>
              <p className="font-mono text-lg">{scanResult.barcode}</p>
              <p className="text-xs text-gray-500 mt-1">
                {scanResult.timestamp.toLocaleString('fr-FR')}
              </p>
            </div>

            {scanResult.article ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">{scanResult.article.nom}</h3>
                    <p className="text-sm text-green-700">{scanResult.article.categorie}</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p><span className="text-green-600">Stock:</span> {scanResult.article.quantiteStock}</p>
                      <p><span className="text-green-600">Localisation:</span> {scanResult.article.localisation}</p>
                      <p><span className="text-green-600">Fournisseur:</span> {scanResult.article.fournisseur}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-900">Article non trouvé</h3>
                    <p className="text-sm text-red-700">
                      Aucun article ne correspond à ce code-barres dans votre base de données.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => startScanForType('ENTREE')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Entrée
              </button>
              <button
                onClick={() => startScanForType('SORTIE')}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Sortie
              </button>
            </div>
          </div>
        </div>
      )}

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
        onSave={handleSaveMouvement}
        article={selectedArticle}
        type={mouvementType}
      />
    </div>
  );
}