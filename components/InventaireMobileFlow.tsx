'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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
import { useStockFeedback, useFeedback } from '@/components/UXFeedback';
import { Article } from '@/types';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner').then(m => m.BarcodeScanner), { ssr: false });


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
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">
            {currentInventaire.nom}
          </h1>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
            {completedEntries.length} comptés
          </div>
        </div>
        
        {/* Barre de progression visuelle */}
        <div className="bg-white/20 rounded-full h-2 mb-3 overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${currentStep === 'search' || currentStep === 'scan' ? '33%' : 
                      currentStep === 'quantity' ? '66%' : '100%'}` 
            }}
          />
        </div>
        
        {/* Étapes avec icônes */}
        <div className="flex items-center justify-between text-xs">
          <div className={`flex flex-col items-center ${
            ['search', 'scan'].includes(currentStep) ? 'opacity-100' : 'opacity-60'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              ['search', 'scan'].includes(currentStep) 
                ? 'bg-white text-blue-600 ring-2 ring-white/50' 
                : 'bg-white/30 text-white'
            }`}>
              {['quantity', 'confirm', 'next'].includes(currentStep) ? 
                <Check className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </div>
            <span className="font-medium">Sélection</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-white/30 mx-2 mt-[-16px]" />
          
          <div className={`flex flex-col items-center ${
            currentStep === 'quantity' ? 'opacity-100' : 'opacity-60'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              currentStep === 'quantity' 
                ? 'bg-white text-blue-600 ring-2 ring-white/50' 
                : ['confirm', 'next'].includes(currentStep)
                  ? 'bg-white/30 text-white'
                  : 'bg-white/20 text-white/60'
            }`}>
              {['confirm', 'next'].includes(currentStep) ? 
                <Check className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
            </div>
            <span className="font-medium">Comptage</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-white/30 mx-2 mt-[-16px]" />
          
          <div className={`flex flex-col items-center ${
            ['confirm', 'next'].includes(currentStep) ? 'opacity-100' : 'opacity-60'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              ['confirm', 'next'].includes(currentStep) 
                ? 'bg-white text-blue-600 ring-2 ring-white/50' 
                : 'bg-white/20 text-white/60'
            }`}>
              {currentStep === 'next' ? 
                <Check className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <span className="font-medium">Validation</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-4">
        {/* Étape 1: Recherche/Scan */}
        {['search', 'scan'].includes(currentStep) && (
          <div className="space-y-4">
            {/* Guide utilisateur */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg flex-shrink-0">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Comment commencer ?
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Scannez le code-barres de l'article ou recherchez-le manuellement dans la liste ci-dessous.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl flex flex-col items-center space-y-2 active:scale-95 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="bg-white/20 p-3 rounded-full">
                  <ScanLine className="h-8 w-8" />
                </div>
                <span className="font-semibold">Scanner</span>
                <span className="text-xs opacity-90">Code-barres</span>
              </button>
              
              <button
                onClick={() => setCurrentStep('search')}
                className="p-4 bg-white hover:bg-gray-50 text-gray-900 rounded-xl border-2 border-gray-200 flex flex-col items-center space-y-2 active:scale-95 transition-all shadow-sm hover:shadow-md"
              >
                <div className="bg-gray-100 p-3 rounded-full">
                  <Search className="h-8 w-8 text-gray-700" />
                </div>
                <span className="font-semibold">Rechercher</span>
                <span className="text-xs text-gray-600">Manuellement</span>
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
            {/* Guide utilisateur */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg flex-shrink-0">
                  <Hash className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-300 mb-1">
                    Comptez l'article
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Saisissez la quantité réelle comptée. Utilisez le clavier tactile pour plus de rapidité.
                  </p>
                </div>
              </div>
            </div>

            {/* Article sélectionné */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-md">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedArticle.nom}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedArticle.categorie}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock théorique:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedArticle.quantite_stock}</span>
                </div>
              </div>
            </div>

            {/* Saisie quantité */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-center">
                  Quantité comptée
                </label>
                <input
                  ref={quantityInputRef}
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuantitySubmit()}
                  placeholder="0"
                  className="w-full px-4 py-6 text-4xl font-bold text-center border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                
                {/* Indicateur d'écart visuel */}
                {quantity && !isNaN(parseInt(quantity)) && (
                  <div className={`mt-3 p-3 rounded-lg text-center font-medium ${
                    parseInt(quantity) === selectedArticle.quantite_stock
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : parseInt(quantity) > selectedArticle.quantite_stock
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                  }`}>
                    {parseInt(quantity) === selectedArticle.quantite_stock ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Stock conforme
                      </span>
                    ) : (
                      <span>
                        Écart: {parseInt(quantity) > selectedArticle.quantite_stock ? '+' : ''}
                        {parseInt(quantity) - selectedArticle.quantite_stock} unités
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Clavier numérique rapide */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">
                  Clavier rapide
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                      key={num}
                      onClick={() => setQuantity(prev => prev + num.toString())}
                      className="p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xl font-bold active:scale-95 transition-all shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setQuantity('')}
                    className="p-4 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg active:scale-95 transition-all shadow-sm"
                    title="Effacer tout"
                  >
                    <RotateCcw className="h-6 w-6 mx-auto" />
                  </button>
                  <button
                    onClick={() => setQuantity(prev => prev + '0')}
                    className="p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xl font-bold active:scale-95 transition-all shadow-sm"
                  >
                    0
                  </button>
                  <button
                    onClick={() => setQuantity(prev => prev.slice(0, -1))}
                    className="p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg active:scale-95 transition-all shadow-sm"
                    title="Effacer dernier chiffre"
                  >
                    <X className="h-6 w-6 mx-auto" />
                  </button>
                </div>
              </div>

              {/* Commentaire optionnel */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  💬 Commentaire (optionnel)
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex: Emplacement différent, emballage abîmé..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Ajoutez une remarque si nécessaire
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleRestart}
                className="flex-1 px-4 py-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold active:scale-95 transition-all shadow-md"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Changer</span>
                </div>
              </button>
              <button
                onClick={handleQuantitySubmit}
                disabled={!quantity || isNaN(parseInt(quantity))}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-semibold active:scale-95 transition-all shadow-lg disabled:shadow-none"
              >
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" />
                  <span>Valider</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Confirmation */}
        {currentStep === 'confirm' && selectedArticle && (
          <div className="space-y-6">
            {/* Guide utilisateur */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-1">
                    Vérifiez avant de valider
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Assurez-vous que toutes les informations sont correctes avant de confirmer.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800 shadow-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Récapitulatif de comptage
                </h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-left">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Article</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedArticle.nom}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Théorique</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedArticle.quantite_stock}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Compté</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quantity}</p>
                    </div>
                  </div>
                  
                  {parseInt(quantity) !== selectedArticle.quantite_stock && (
                    <div className={`rounded-lg p-3 ${
                      parseInt(quantity) > selectedArticle.quantite_stock 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                        : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                    }`}>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Écart détecté</p>
                      <p className={`text-xl font-bold ${
                        parseInt(quantity) > selectedArticle.quantite_stock 
                          ? 'text-green-700 dark:text-green-400' 
                          : 'text-orange-700 dark:text-orange-400'
                      }`}>
                        {parseInt(quantity) > selectedArticle.quantite_stock ? '+' : ''}
                        {parseInt(quantity) - selectedArticle.quantite_stock} unités
                      </p>
                    </div>
                  )}
                  
                  {comment && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-left">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">💬 Commentaire</p>
                      <p className="text-sm text-gray-900 dark:text-white">{comment}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentStep('quantity')}
                className="flex-1 px-4 py-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold active:scale-95 transition-all shadow-md"
              >
                <div className="flex items-center justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Modifier</span>
                </div>
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-semibold active:scale-95 transition-all shadow-lg disabled:shadow-none"
              >
                {processing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enregistrement...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Confirmer</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Étape 4: Article suivant */}
        {currentStep === 'next' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800 shadow-lg">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-green-900 dark:text-green-300 mb-2">
                  Entrée enregistrée !
                </h3>
                <p className="text-green-700 dark:text-green-400">
                  L'article a été ajouté à l'inventaire avec succès
                </p>
              </div>
            </div>

            {/* Résumé des entrées récentes */}
            {completedEntries.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Progression
                  </h4>
                  <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {completedEntries.length} articles
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {completedEntries.slice(-5).reverse().map((entry, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {entry.article.nom}
                        </p>
                        {entry.commentaire && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            💬 {entry.commentaire}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {entry.quantiteComptee}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          unités
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guide pour continuer */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg flex-shrink-0">
                  <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Et maintenant ?
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Vous pouvez compter un autre article ou terminer l'inventaire si vous avez fini.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onComplete}
                className="col-span-2 md:col-span-1 px-5 py-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold active:scale-95 transition-all shadow-md"
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Terminer inventaire</span>
                </div>
              </button>
              <button
                onClick={handleNext}
                className="col-span-2 md:col-span-1 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold active:scale-95 transition-all shadow-lg"
              >
                <div className="flex items-center justify-center gap-2">
                  <ChevronRight className="h-5 w-5" />
                  <span>Article suivant</span>
                </div>
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
