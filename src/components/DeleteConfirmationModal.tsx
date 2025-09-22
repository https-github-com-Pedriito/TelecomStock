import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  articleName: string;
  hasMovements: boolean;
  movementCount?: number;
  warningMessage?: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  articleName,
  hasMovements,
  movementCount,
  warningMessage
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Fermer</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
              hasMovements ? 'bg-red-100' : 'bg-orange-100'
            } sm:mx-0 sm:h-10 sm:w-10`}>
              <AlertTriangle className={`h-6 w-6 ${
                hasMovements ? 'text-red-600' : 'text-orange-600'
              }`} />
            </div>
            
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                {hasMovements ? 'Suppression avec mouvements associés' : 'Confirmer la suppression'}
              </h3>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer l'article{' '}
                  <span className="font-medium text-gray-900">"{articleName}"</span> ?
                </p>
                
                {hasMovements && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          <strong>Attention :</strong> Cet article a{' '}
                          <span className="font-bold">{movementCount} mouvement(s)</span> associé(s).
                        </p>
                        <p className="text-sm text-red-600 mt-1">
                          Cette action supprimera définitivement l'article ET tous ses mouvements 
                          de l'historique. Cette action est irréversible.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!hasMovements && (
                  <p className="text-sm text-gray-500 mt-2">
                    Cette action est irréversible.
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${
                hasMovements 
                  ? 'bg-red-600 hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600'
                  : 'bg-orange-600 hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600'
              }`}
              onClick={onConfirm}
            >
              {hasMovements ? 'Supprimer tout' : 'Supprimer'}
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}