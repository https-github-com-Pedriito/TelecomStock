'use client';

import { AlertTriangle, X, Loader2, Trash2, ChevronRight } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  articleName: string;
  hasMovements: boolean;
  movementCount?: number;
  warningMessage?: string;
  isDeleting?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  articleName,
  hasMovements,
  movementCount,
  isDeleting = false
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const themeColor = hasMovements ? 'red' : 'orange';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={isDeleting ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md glass rounded-[2.5rem] border border-white/40 dark:border-gray-800/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col">

        {/* Header */}
        <div className={`relative px-8 pt-8 pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-${themeColor}-500/5 dark:bg-${themeColor}-950/20`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 bg-${themeColor}-600 rounded-2xl shadow-lg shadow-${themeColor}-600/20 text-white`}>
              <Trash2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                Confirmation de Retrait
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 bg-${themeColor}-500 rounded-full animate-pulse`} />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Action Irréversible</span>
              </div>
            </div>
          </div>
          {!isDeleting && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90"
            >
              <X size={24} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed text-center sm:text-left">
              Êtes-vous certain de vouloir supprimer l'équipement <span className="font-black text-gray-900 dark:text-white">"{articleName}"</span> du catalogue ?
            </p>

            {hasMovements && (
              <div className="glass p-5 rounded-3xl border border-red-200/50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/20 space-y-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-colors" />
                <div className="flex gap-3 items-start relative">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-600 dark:text-red-400">
                    <AlertTriangle size={18} strokeWidth={3} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-widest">Impact Critique</h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                      Cet article possède <span className="font-black underline">{movementCount} mouvement(s)</span>.
                      Sa suppression effacera <span className="font-black">tout l'historique associé</span> définitivement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!hasMovements && (
              <div className="flex items-center gap-3 justify-center sm:justify-start px-4 py-3 glass rounded-2xl border border-white/20 dark:border-gray-800/50 bg-orange-50/20 dark:bg-orange-950/20">
                <AlertTriangle size={16} className="text-orange-500" strokeWidth={3} />
                <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                  Action définitive
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-white/20 dark:border-gray-800/50 flex flex-col sm:flex-row items-center justify-end gap-3 bg-white/20 dark:bg-gray-950/20 backdrop-blur-xl">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 glass border border-white/40 dark:border-gray-800/50 rounded-2xl font-black text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-black rounded-2xl shadow-xl shadow-${themeColor}-600/20 active:scale-95 transition-all group disabled:opacity-50`}
          >
            {isDeleting ? (
              <>
                <Loader2 size={18} strokeWidth={3} className="animate-spin" />
                <span>Traitement...</span>
              </>
            ) : (
              <>
                <span>{hasMovements ? 'Tout Supprimer' : 'Confirmer'}</span>
                <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}