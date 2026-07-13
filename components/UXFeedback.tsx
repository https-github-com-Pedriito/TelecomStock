'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X, Undo2, Loader2 } from 'lucide-react';

// Types pour le système de feedback
export type FeedbackType = 'success' | 'warning' | 'error' | 'info' | 'loading';

export interface UXFeedback {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  action?: {
    label: string;
    callback: () => void;
  };
  duration?: number;
  persistent?: boolean;
}

interface FeedbackContextType {
  feedbacks: UXFeedback[];
  showFeedback: (feedback: Omit<UXFeedback, 'id'>) => string;
  hideFeedback: (id: string) => void;
  clearAll: () => void;
  showLoading: (message: string, type?: 'scan' | 'save' | 'search' | 'sync') => string;
  hideLoading: (id: string) => void;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
}

// Provider pour le contexte
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedbacks, setFeedbacks] = useState<UXFeedback[]>([]);

  const showFeedback = useCallback((feedback: Omit<UXFeedback, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFeedback: UXFeedback = {
      ...feedback,
      id,
      duration: feedback.duration ?? (feedback.type === 'loading' ? 0 : 5000)
    };

    setFeedbacks(prev => [...prev, newFeedback]);

    // Auto-hide après duration (sauf si persistent ou loading)
    if ((newFeedback.duration || 0) > 0 && !newFeedback.persistent) {
      setTimeout(() => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
      }, newFeedback.duration);
    }

    return id;
  }, []);

  const hideFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setFeedbacks([]);
  }, []);

  const showLoading = useCallback((message: string, type: 'scan' | 'save' | 'search' | 'sync' = 'save') => {
    const loadingMessages = {
      scan: 'Analyse en cours...',
      save: 'Sauvegarde...',
      search: 'Recherche...',
      sync: 'Synchronisation...'
    };

    return showFeedback({
      type: 'loading',
      title: loadingMessages[type],
      message,
      persistent: true
    });
  }, [showFeedback]);

  const hideLoading = hideFeedback;

  return (
    <FeedbackContext.Provider value={{
      feedbacks,
      showFeedback,
      hideFeedback,
      clearAll,
      showLoading,
      hideLoading
    }}>
      {children}
      <FeedbackContainer />
    </FeedbackContext.Provider>
  );
}

// Composant pour afficher les feedbacks
function FeedbackContainer() {
  const { feedbacks, hideFeedback } = useFeedback();

  if (feedbacks.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm">
      {feedbacks.map(feedback => (
        <FeedbackToast
          key={feedback.id}
          feedback={feedback}
          onClose={() => hideFeedback(feedback.id)}
        />
      ))}
    </div>
  );
}

// Composant pour un toast individuel
function FeedbackToast({ 
  feedback, 
  onClose 
}: { 
  feedback: UXFeedback; 
  onClose: () => void;
}) {
  const getIcon = () => {
    switch (feedback.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (feedback.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`
      relative p-4 rounded-lg border shadow-lg transition-all duration-300 transform
      animate-in slide-in-from-right-4 fade-in
      ${getBackgroundColor()}
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {feedback.title}
          </h4>
          {feedback.message && (
            <p className="mt-1 text-sm text-gray-600">
              {feedback.message}
            </p>
          )}
          
          {feedback.action && (
            <div className="mt-3">
              <button
                onClick={feedback.action.callback}
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                <Undo2 className="h-4 w-4" />
                {feedback.action.label}
              </button>
            </div>
          )}
        </div>
        
        {feedback.type !== 'loading' && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Hook pour des feedbacks pré-configurés
export function useStockFeedback() {
  const { showFeedback, showLoading, hideLoading } = useFeedback();

  return {
    // Succès
    articleAdded: (articleName: string, undoCallback?: () => void) => 
      showFeedback({
        type: 'success',
        title: 'Article ajouté',
        message: `${articleName} a été ajouté au stock`,
        action: undoCallback ? { label: 'Annuler', callback: undoCallback } : undefined
      }),

    mouvementCreated: (type: 'ENTREE' | 'SORTIE', quantity: number, articleName: string) =>
      showFeedback({
        type: 'success',
        title: `${type.toLowerCase() === 'entree' ? 'Entrée' : 'Sortie'} enregistrée`,
        message: `${quantity} × ${articleName}`
      }),

    inventoryScanned: (articleName: string, quantity: number) =>
      showFeedback({
        type: 'success',
        title: 'Article scanné',
        message: `${articleName}: ${quantity} unités comptées`
      }),

    // Alertes
    lowStock: (articleName: string, currentStock: number, threshold: number) =>
      showFeedback({
        type: 'warning',
        title: 'Stock faible',
        message: `${articleName}: ${currentStock}/${threshold} unités`,
        persistent: true
      }),

    // Erreurs
    scanError: (retryCallback?: () => void) =>
      showFeedback({
        type: 'error',
        title: 'Erreur de scan',
        message: 'Impossible de lire le code-barres',
        action: retryCallback ? { label: 'Réessayer', callback: retryCallback } : undefined
      }),

    // Loading states
    scanningBarcode: () => showLoading('Analyse du code-barres...', 'scan'),
    savingInventory: () => showLoading('Sauvegarde de l\'inventaire...', 'save'),
    searchingArticle: () => showLoading('Recherche dans le stock...', 'search'),
    syncingData: () => showLoading('Synchronisation des données...', 'sync'),

    hideLoading
  };
}

// Export du provider et des hooks
export default FeedbackProvider;