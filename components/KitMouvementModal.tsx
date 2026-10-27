'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, PackageCheck, X } from 'lucide-react';
import type { Kit, KitMouvementData, ManqueStock } from '@/types';
import { explodeKit } from '@/lib/kits';

/**
 * Montee par le parent uniquement quand un kit est selectionne : l'etat part
 * des props, sans effet de remise a zero (react-hooks/set-state-in-effect).
 */
interface KitMouvementModalProps {
  onClose: () => void;
  kit: Kit;
  /** Type pre-selectionne quand le scan a ete lance depuis un bouton Entree/Sortie. */
  typeInitial?: 'ENTREE' | 'SORTIE';
  utilisateur: string;
  onSubmit: (data: KitMouvementData) => Promise<void>;
}

export function KitMouvementModal({
  onClose,
  kit,
  typeInitial = 'SORTIE',
  utilisateur,
  onSubmit,
}: KitMouvementModalProps) {
  const [type, setType] = useState<'ENTREE' | 'SORTIE'>(typeInitial);
  const [nbKits, setNbKits] = useState('1');
  const [projet, setProjet] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [manques, setManques] = useState<ManqueStock[] | null>(null);
  const [enCours, setEnCours] = useState(false);

  // Apercu de ce qui sera deduit : la meme fonction que le serveur, pour que
  // l'ecran ne puisse pas annoncer autre chose que ce qui sera applique.
  const apercu = useMemo(() => {
    if (!kit.lignes?.length) return [];
    const n = Number(nbKits);
    if (!Number.isInteger(n) || n <= 0) return [];
    const parArticle = new Map(kit.lignes.map(l => [l.article_id, l.article?.nom ?? l.article_id]));
    return explodeKit(kit.lignes, n).map(l => ({
      nom: parArticle.get(l.article_id) ?? l.article_id,
      quantite: l.quantite,
    }));
  }, [kit, nbKits]);

  const envoyer = async (force: boolean) => {
    const n = Number(nbKits);
    if (!Number.isInteger(n) || n <= 0) {
      setErreur('Indiquez un nombre entier de kits supérieur à 0.');
      return;
    }
    try {
      setEnCours(true);
      setErreur(null);
      await onSubmit({
        kit_id: kit.id,
        quantite: n,
        type,
        utilisateur,
        projet: projet.trim() || undefined,
        commentaire: commentaire.trim() || undefined,
        ...(force ? { force: true } : {}),
      });
      onClose();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'STOCK_INSUFFISANT') {
        setManques(data.manques ?? []);
        setErreur(data.message);
      } else {
        setErreur(data?.message || err?.message || 'Mouvement impossible.');
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2">
              <PackageCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 dark:text-white">{kit.nom}</h2>
              <p className="font-mono text-xs text-gray-500">{kit.code}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-2">
            {(['SORTIE', 'ENTREE'] as const).map(t => {
              const actif = type === t;
              const Icon = t === 'SORTIE' ? ArrowUp : ArrowDown;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    actif
                      ? t === 'SORTIE'
                        ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10'
                        : 'border-green-500 bg-green-50 text-green-600 dark:bg-green-500/10'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t === 'SORTIE' ? 'Sortie' : 'Entrée'}
                </button>
              );
            })}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Nombre de kits
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={nbKits}
              onChange={e => setNbKits(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-3 text-lg font-black text-gray-900 dark:text-white"
            />
          </div>

          {apercu.length > 0 && (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                {type === 'SORTIE' ? 'Sera déduit du stock' : 'Sera ajouté au stock'}
              </p>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {apercu.map(l => (
                  <li key={l.nom} className="flex justify-between">
                    <span>{l.nom}</span>
                    <span className="font-bold">{l.quantite}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={projet}
              onChange={e => setProjet(e.target.value)}
              placeholder="Projet / chantier (optionnel)"
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
            <input
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              placeholder="Commentaire (optionnel)"
              className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>

          {erreur && (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3">
              <p className="text-sm font-bold text-red-600">{erreur}</p>
              {manques && manques.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-600">
                  {manques.map(m => (
                    <li key={m.article_id}>
                      {m.nom} — requis {m.requis}, disponible {m.disponible}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            {manques && manques.length > 0 && (
              <button
                type="button"
                onClick={() => envoyer(true)}
                disabled={enCours}
                className="rounded-xl border border-red-500 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Forcer la sortie
              </button>
            )}
            <button
              type="button"
              onClick={() => envoyer(false)}
              disabled={enCours}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {enCours ? 'Enregistrement…' : 'Valider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
