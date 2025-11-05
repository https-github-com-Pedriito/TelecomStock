import React, { useState, useEffect, useRef } from 'react';
import { 
  ScanLine, 
  Search, 
  Check, 
  X, 
  ChevronRight, 
  RotateCcw,
  Package,
  Hash,
  CheckCircle2
} from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { useStockFeedback, useFeedback } from './UXFeedback';
import { Article } from '../types';


interface InventaireMobileFlowProps {
  articles: Article[];
  currentInventaire: any;
  onAddEntry: (data: {
    article_id: string;
    quantite_comptee: number;
    commentaire?: string;
  }) => Promise<void>;
  onComplete?: () => void;
  getArticleByCodeBarres: (code: string) => Article | undefined;
}

type FlowStep = 'search' | 'scan' | 'quantity' | 'confirm' | 'next';

interface InventoryEntry {
  article: Article;
  quantiteComptee: number;
  commentaire?: string;
}

export function InventaireMobileFlow({
  articles,
  currentInventaire,
  onAddEntry,
  onComplete,
  getArticleByCodeBarres
}: InventaireMobileFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('search');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completedEntries, setCompletedEntries] = useState<InventoryEntry[]>([]);
  
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const stockFeedback = useStockFeedback();
  const { showFeedback, hideLoading } = useFeedback();

  // Auto-focus sur l'input quantité
  useEffect(() => {
    if (currentStep === 'quantity' && quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  }, [currentStep]);

  const filteredArticles = articles.filter(article =>
    article.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.code_barres?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
    setCurrentStep('quantity');
    setQuantity(article.quantite_stock.toString()); // Pré-remplir avec stock actuel
  };

  const handleScan = async (scannedCode: string) => {
    const loadingId = stockFeedback.scanningBarcode();
    
    try {
      const article = getArticleByCodeBarres(scannedCode);
      
      if (article) {
        hideLoading(loadingId);
        setSelectedArticle(article);
        setCurrentStep('quantity');
        setQuantity(article.quantite_stock.toString());
        setShowScanner(false);
        
        showFeedback({
          type: 'success',
          title: 'Article trouvé',
          message: `${article.nom} scanné avec succès`
        });
      } else {
        hideLoading(loadingId);
        stockFeedback.scanError(() => setShowScanner(true));
      }
    } catch (error) {
      hideLoading(loadingId);
      stockFeedback.scanError(() => setShowScanner(true));
    }
  };

  const handleQuantitySubmit = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      showFeedback({
        type: 'error',
        title: 'Quantité invalide',
        message: 'Veuillez saisir un nombre valide'
      });
      return;
    }
    setCurrentStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selectedArticle) return;

    setProcessing(true);
    const loadingId = stockFeedback.savingInventory();

    try {
      await onAddEntry({
        article_id: selectedArticle.id,
        quantite_comptee: parseInt(quantity),
        commentaire: comment || undefined
      });

      hideLoading(loadingId);
      
      // Ajouter à la liste des entrées complétées
      const newEntry: InventoryEntry = {
        article: selectedArticle,
        quantiteComptee: parseInt(quantity),
        commentaire: comment || undefined
      };
      setCompletedEntries(prev => [...prev, newEntry]);

      stockFeedback.inventoryScanned(selectedArticle.nom, parseInt(quantity));
      
      // Reset pour article suivant
      setCurrentStep('next');
      
    } catch (error) {
      hideLoading(loadingId);
      showFeedback({
        type: 'error',
        title: 'Erreur de sauvegarde',
        message: 'Impossible d\'enregistrer l\'entrée'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleNext = () => {
    setSelectedArticle(null);
    setQuantity('');
    setComment('');
    setSearchQuery('');
    setCurrentStep('search');
  };

  const handleRestart = () => {
    setSelectedArticle(null);
    setQuantity('');
    setComment('');
    setCurrentStep('search');
  };

  if (!currentInventaire) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun inventaire actif
          </h3>
          <p className="text-gray-600">
            Créez un nouvel inventaire pour commencer le comptage
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 pb-20">
      {/* Header avec progression */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-900">
            {currentInventaire.nom}
          </h1>
          <div className="text-sm text-gray-500">
            {completedEntries.length} articles comptés
          </div>
        </div>
        
        {/* Barre de progression */}
        <div className="flex items-center space-x-2 text-xs">
          <div className={`flex items-center ${currentStep === 'search' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              ['search', 'scan'].includes(currentStep) ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {['search', 'scan'].includes(currentStep) ? '1' : <Check className="h-3 w-3" />}
            </div>
            <span className="ml-1">Article</span>
          </div>
          
          <ChevronRight className="h-4 w-4 text-gray-400" />
          
          <div className={`flex items-center ${currentStep === 'quantity' ? 'text-blue-600' : 
            ['confirm', 'next'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              currentStep === 'quantity' ? 'bg-blue-100' : 
              ['confirm', 'next'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {currentStep === 'quantity' ? '2' : 
               ['confirm', 'next'].includes(currentStep) ? <Check className="h-3 w-3" /> : '2'}
            </div>
            <span className="ml-1">Quantité</span>
          </div>
          
          <ChevronRight className="h-4 w-4 text-gray-400" />
          
          <div className={`flex items-center ${['confirm', 'next'].includes(currentStep) ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              ['confirm', 'next'].includes(currentStep) ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              {currentStep === 'next' ? <Check className="h-3 w-3" /> : '3'}
            </div>
            <span className="ml-1">Confirmer</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-4">
        {/* Étape 1: Recherche/Scan */}
        {['search', 'scan'].includes(currentStep) && (
          <div className="space-y-4">
            {/* Actions rapides */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex flex-col items-center space-y-2 active:scale-95 transition-transform"
              >
                <ScanLine className="h-8 w-8" />
                <span className="font-medium">Scanner code-barres</span>
              </button>
              
              <button
                onClick={() => setCurrentStep('search')}
                className="p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg flex flex-col items-center space-y-2 active:scale-95 transition-transform"
              >
                <Search className="h-8 w-8" />
                <span className="font-medium">Rechercher article</span>
              </button>
            </div>

            {/* Recherche manuelle */}
            {currentStep === 'search' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nom ou code-barres de l'article..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  />
                </div>

                {/* Liste des articles */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredArticles.slice(0, 20).map(article => (
                    <button
                      key={article.id}
                      onClick={() => handleArticleSelect(article)}
                      className="w-full p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-left active:scale-98 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{article.nom}</h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            {article.code_barres && (
                              <span className="flex items-center">
                                <Hash className="h-3 w-3 mr-1" />
                                {article.code_barres}
                              </span>
                            )}
                            <span>Stock: {article.quantite_stock}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Étape 2: Saisie quantité */}
        {currentStep === 'quantity' && selectedArticle && (
          <div className="space-y-6">
            {/* Article sélectionné */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedArticle.nom}</h3>
                  <p className="text-sm text-gray-500">
                    Stock théorique: {selectedArticle.quantite_stock} unités
                  </p>
                </div>
              </div>
            </div>

            {/* Saisie quantité */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Quantité comptée
              </label>
              <input
                ref={quantityInputRef}
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleQuantitySubmit()}
                placeholder="0"
                className="w-full px-4 py-4 text-2xl text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              
              {/* Clavier numérique rapide */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => setQuantity(prev => prev + num.toString())}
                    className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-xl font-semibold active:scale-95 transition-transform"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setQuantity('')}
                  className="p-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg active:scale-95 transition-transform"
                >
                  <RotateCcw className="h-6 w-6 mx-auto" />
                </button>
                <button
                  onClick={() => setQuantity(prev => prev + '0')}
                  className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-xl font-semibold active:scale-95 transition-transform"
                >
                  0
                </button>
                <button
                  onClick={() => setQuantity(prev => prev.slice(0, -1))}
                  className="p-4 bg-gray-100 hover:bg-gray-200 rounded-lg active:scale-95 transition-transform"
                >
                  <X className="h-6 w-6 mx-auto" />
                </button>
              </div>

              {/* Commentaire optionnel */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Remarques sur l'état, l'emplacement..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleRestart}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium active:scale-95 transition-transform"
              >
                Changer d'article
              </button>
              <button
                onClick={handleQuantitySubmit}
                disabled={!quantity || isNaN(parseInt(quantity))}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium active:scale-95 transition-transform"
              >
                Valider quantité
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Confirmation */}
        {currentStep === 'confirm' && selectedArticle && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirmer l'entrée
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Article:</strong> {selectedArticle.nom}</p>
                  <p><strong>Quantité comptée:</strong> {quantity} unités</p>
                  <p><strong>Stock théorique:</strong> {selectedArticle.quantite_stock} unités</p>
                  {parseInt(quantity) !== selectedArticle.quantite_stock && (
                    <p className={`font-medium ${parseInt(quantity) > selectedArticle.quantite_stock ? 'text-blue-600' : 'text-red-600'}`}>
                      <strong>Écart:</strong> {parseInt(quantity) - selectedArticle.quantite_stock} unités
                    </p>
                  )}
                  {comment && <p><strong>Commentaire:</strong> {comment}</p>}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentStep('quantity')}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium active:scale-95 transition-transform"
              >
                Modifier
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-medium active:scale-95 transition-transform"
              >
                {processing ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {/* Étape 4: Article suivant */}
        {currentStep === 'next' && (
          <div className="space-y-6">
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="text-center">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Entrée enregistrée !
                </h3>
                <p className="text-green-700">
                  L'article a été ajouté à l'inventaire
                </p>
              </div>
            </div>

            {/* Résumé des entrées récentes */}
            {completedEntries.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">
                  Dernières entrées ({completedEntries.length})
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {completedEntries.slice(-3).reverse().map((entry, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-900">{entry.article.nom}</span>
                      <span className="text-gray-600">{entry.quantiteComptee} unités</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={onComplete}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium active:scale-95 transition-transform"
              >
                Terminer inventaire
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium active:scale-95 transition-transform"
              >
                Article suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 m-4 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Scanner code-barres</h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <BarcodeScanner 
              onScan={handleScan} 
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}