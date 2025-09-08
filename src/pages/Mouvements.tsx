import { useState } from 'react';
import { Article, Mouvement } from '../types';
import { MouvementModal } from '../components/MouvementModal';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ScanLine, ArrowUp, ArrowDown, Package } from 'lucide-react';

interface MouvementsProps {
  articles: Article[];
  mouvements: Mouvement[];
  currentUser: { id: string; nom: string; prenom: string; };
  onAddMouvement: (mouvement: Omit<Mouvement, 'id' | 'dateHeure'>) => Mouvement;
  getArticleByCodeBarres: (codeBarres: string) => Article | undefined;
}

export function Mouvements({ articles, mouvements, currentUser, onAddMouvement, getArticleByCodeBarres }: MouvementsProps) {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | undefined>();
  const [mouvementType, setMouvementType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  // Stats pour les mouvements du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vérifier que mouvements existe et initialiser les statistiques
  const mouvementsDuJour = mouvements?.filter(m => {
    const mDate = new Date(m.dateHeure);
    return mDate >= today;
  }) || [];

  const entreesJour = mouvements 
    ? mouvementsDuJour.filter(m => m.type === 'ENTREE').reduce((sum, m) => sum + m.quantite, 0)
    : 0;
    
  const sortiesJour = mouvements
    ? mouvementsDuJour.filter(m => m.type === 'SORTIE').reduce((sum, m) => sum + m.quantite, 0)
    : 0;

  const handleScan = (barcode: string) => {
    setShowScanner(false);
    const article = getArticleByCodeBarres(barcode);
    
    if (article) {
      setSelectedArticle(article);
      setShowMouvementModal(true);
    } else {
      // Créer un article de démonstration pour la démo
      const demoArticle = {
        id: `demo-${Date.now()}`,
        nom: `Article scanné ${barcode.slice(-4)}`,
        categorie: 'Équipements réseau',
        fournisseur: 'TelecomParts Pro',
        localisation: 'Entrepôt principal',
        seuilMinimum: 5,
        quantiteStock: 15,
        codeBarres: barcode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      setSelectedArticle(demoArticle);
      setShowMouvementModal(true);
    }
  };

  // Accept the generic payload from MouvementModal (either article creation fields or movement fields)
  const handleSaveMouvement = (data: {
    nom?: string;
    categorie?: string;
    fournisseur?: string;
    localisation?: string;
    seuilMinimum?: number;
    quantiteStock?: number;
    articleId?: string;
    quantite?: number;
    type?: 'ENTREE' | 'SORTIE';
    utilisateur?: string;
    commentaire?: string;
  }) => {
    if (data.articleId && typeof data.quantite === 'number') {
      // Utiliser le nom complet de l'utilisateur actuel
      onAddMouvement({
        articleId: data.articleId,
        quantite: data.quantite,
        type: data.type || 'ENTREE',
        utilisateur: `${currentUser.prenom} ${currentUser.nom}`,
        commentaire: data.commentaire,
      });
      setSelectedArticle(undefined);
      alert('Mouvement enregistré avec succès !');
    } else {
      // If the modal returned article creation data in this page, you might want to handle it here.
      // For now, just close and refresh.
      alert('Article créé (ou donnée reçue).');
    }

    // force a refresh after saving
    setRefreshKey(k => k + 1);
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
            <p className="text-2xl font-bold text-green-600">{entreesJour}</p>
            <p className="text-sm text-gray-600">Entrées du jour</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <ArrowDown className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{sortiesJour}</p>
            <p className="text-sm text-gray-600">Sorties du jour</p>
          </div>
        </div>
      </div>

      {/* Liste des mouvements récents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mouvements Récents</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Heure</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Article</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!mouvements || mouvements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                mouvements
                  .sort((a, b) => new Date(b.dateHeure).getTime() - new Date(a.dateHeure).getTime())
                  .map((mouvement) => {
                    const article = articles.find(a => a.id === mouvement.articleId);
                    return (
                      <tr key={mouvement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(mouvement.dateHeure).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{article?.nom || 'Article inconnu'}</div>
                          <div className="text-sm text-gray-500">{article?.codeBarres || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mouvement.type === 'ENTREE' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {mouvement.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mouvement.quantite}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mouvement.utilisateur}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {mouvement.commentaire || '-'}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
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
      {showMouvementModal && (
        <MouvementModal
          isOpen={showMouvementModal}
          onClose={() => {
            setShowMouvementModal(false);
            setSelectedArticle(undefined);
          }}
          onSave={handleSaveMouvement}
          article={selectedArticle}
          type={mouvementType}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}