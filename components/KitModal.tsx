'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Article, Kit, KitInput } from '@/types';
import { normalizeKitCode } from '@/lib/kits';

interface LigneForm {
  article_id: string;
  quantite: string;
}

interface KitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: KitInput) => Promise<void>;
  articles: Article[];
  kit?: Kit;
}

const LIGNE_VIDE: LigneForm = { article_id: '', quantite: '1' };

export function KitModal({ isOpen, onClose, onSave, articles, kit }: KitModalProps) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [estActif, setEstActif] = useState(true);
  const [lignes, setLignes] = useState<LigneForm[]>([{ ...LIGNE_VIDE }]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErreur(null);
    if (kit) {
      setCode(kit.code);
      setNom(kit.nom);
      setDescription(kit.description ?? '');
      setEstActif(kit.est_actif);
      setLignes(
        kit.lignes?.length
          ? kit.lignes.map(l => ({ article_id: l.article_id, quantite: String(l.quantite) }))
          : [{ ...LIGNE_VIDE }]
      );
    } else {
      setCode('');
      setNom('');
      setDescription('');
      setEstActif(true);
      setLignes([{ ...LIGNE_VIDE }]);
    }
  }, [isOpen, kit]);

  const articlesTries = useMemo(
    () => [...articles].sort((a, b) => a.nom.localeCompare(b.nom)),
    [articles]
  );

  if (!isOpen) return null;

  const majLigne = (index: number, patch: Partial<LigneForm>) => {
    setLignes(prev => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    const codeNormalise = normalizeKitCode(code);
    if (!codeNormalise) return setErreur('Le code du kit est requis (ex. KIT-NAT-DIR).');
    if (!nom.trim()) return setErreur('Le nom du kit est requis.');

    const lignesValides: KitInput['lignes'] = [];
    for (const ligne of lignes) {
      if (!ligne.article_id) continue;
      const quantite = Number(ligne.quantite);
      if (!Number.isInteger(quantite) || quantite <= 0) {
        return setErreur('Chaque composant doit avoir une quantité entière supérieure à 0.');
      }
      lignesValides.push({ article_id: ligne.article_id, quantite });
    }
    if (lignesValides.length === 0) {
      return setErreur('Ajoutez au moins un composant à la nomenclature.');
    }

    try {
      setEnCours(true);
      await onSave({
        code: codeNormalise,
        nom: nom.trim(),
        description: description.trim() || undefined,
        est_actif: estActif,
        lignes: lignesValides,
      });
      onClose();
    } catch (err: any) {
      setErreur(err?.response?.data?.message || err?.message || 'Enregistrement impossible.');
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            {kit ? `Modifier ${kit.code}` : 'Nouveau kit'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                Code du kit
              </label>
              <input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="KIT-NAT-DIR"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 font-mono uppercase text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-400">C&apos;est ce code qui est encodé dans le QR code.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Nom</label>
              <input
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Kit antenne directionnelle"
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Description (optionnel)
            </label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={estActif} onChange={e => setEstActif(e.target.checked)} />
            Kit actif (un kit inactif ne peut plus être scanné)
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Nomenclature — composants déduits pour 1 kit
              </h3>
              <button
                type="button"
                onClick={() => setLignes(prev => [...prev, { ...LIGNE_VIDE }])}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un composant
              </button>
            </div>

            <div className="space-y-2">
              {lignes.map((ligne, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={ligne.article_id}
                    onChange={e => majLigne(index, { article_id: e.target.value })}
                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">— Choisir un article —</option>
                    {articlesTries.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nom} (stock : {a.quantite_stock})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={ligne.quantite}
                    onChange={e => majLigne(index, { quantite: e.target.value })}
                    className="w-24 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setLignes(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {articlesTries.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                Aucun article en base : créez d&apos;abord les composants dans Équipements.
              </p>
            )}
          </div>

          {erreur && (
            <p className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">{erreur}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={enCours}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
