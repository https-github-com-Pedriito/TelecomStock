'use client';

import { useMemo, useState } from 'react';
import { Boxes, Pencil, Plus, Printer, QrCode, ScanLine, Trash2 } from 'lucide-react';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { KitModal } from '@/components/KitModal';
import { KitMouvementModal } from '@/components/KitMouvementModal';
import { buildKitQrPayload } from '@/lib/kits';
import type { Article, Kit, KitInput, KitMouvementData } from '@/types';

interface KitsProps {
  kits: Kit[];
  articles: Article[];
  loading: boolean;
  canManage: boolean;
  utilisateur: string;
  onCreate: (input: KitInput) => Promise<unknown>;
  onUpdate: (id: string, input: Partial<KitInput>) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  onMove: (data: KitMouvementData) => Promise<void>;
}

export function Kits({
  kits,
  articles,
  loading,
  canManage,
  utilisateur,
  onCreate,
  onUpdate,
  onDelete,
  onMove,
}: KitsProps) {
  const [kitEnEdition, setKitEnEdition] = useState<Kit | undefined>();
  const [modalOuverte, setModalOuverte] = useState(false);
  const [kitEnMouvement, setKitEnMouvement] = useState<Kit | undefined>();
  const [impression, setImpression] = useState<Kit[] | null>(null);

  const articlesParId = useMemo(() => new Map(articles.map(a => [a.id, a])), [articles]);

  const ouvrirCreation = () => {
    setKitEnEdition(undefined);
    setModalOuverte(true);
  };

  const ouvrirEdition = (kit: Kit) => {
    setKitEnEdition(kit);
    setModalOuverte(true);
  };

  /**
   * Rend la feuille de QR codes puis declenche l'impression. Le delai laisse
   * aux canvas QR le temps d'etre dessines : window.print() capture le DOM tel
   * qu'il est a l'instant de l'appel.
   */
  const imprimer = (aImprimer: Kit[]) => {
    setImpression(aImprimer);
    setTimeout(() => {
      window.print();
      setImpression(null);
    }, 300);
  };

  const supprimer = async (kit: Kit) => {
    if (!window.confirm(`Supprimer le kit ${kit.code} ? Les mouvements déjà enregistrés sont conservés.`)) return;
    await onDelete(kit.id);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="mb-2 text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Kits <span className="text-blue-600">&amp; nomenclatures</span>
          </h1>
          <p className="font-medium text-gray-500 dark:text-gray-400">
            Un scan de QR code déduit automatiquement tous les composants du kit.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {kits.length > 0 && (
            <button
              onClick={() => imprimer(kits)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="h-4 w-4" /> Imprimer tous les QR
            </button>
          )}
          {canManage && (
            <button
              onClick={ouvrirCreation}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouveau kit
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-gray-500 print:hidden">Chargement des kits…</p>}

      {!loading && kits.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center print:hidden">
          <Boxes className="mx-auto mb-4 h-10 w-10 text-gray-300" />
          <h2 className="mb-1 text-lg font-black text-gray-900 dark:text-white">Aucun kit défini</h2>
          <p className="mx-auto max-w-md text-sm text-gray-500">
            Créez un kit (par exemple <span className="font-mono">KIT-NAT-DIR</span>), listez les composants qu&apos;il
            consomme, puis imprimez son QR code.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:hidden">
        {kits.map(kit => {
          const lignes = kit.lignes ?? [];
          return (
            <div
              key={kit.id}
              className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-gray-900 dark:text-white">{kit.nom}</p>
                  <p className="font-mono text-xs text-gray-500">{kit.code}</p>
                  {!kit.est_actif && (
                    <span className="mt-1 inline-block rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      Inactif
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  <BarcodeGenerator value={buildKitQrPayload(kit.code)} size={72} />
                </div>
              </div>

              <ul className="mb-4 flex-1 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {lignes.map(ligne => (
                  <li key={ligne.id ?? ligne.article_id} className="flex justify-between gap-3">
                    <span className="truncate">
                      {ligne.article?.nom ?? articlesParId.get(ligne.article_id)?.nom ?? ligne.article_id}
                    </span>
                    <span className="font-bold">×{ligne.quantite}</span>
                  </li>
                ))}
                {lignes.length === 0 && <li className="text-amber-600">Nomenclature vide</li>}
              </ul>

              <div className="flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                <button
                  onClick={() => setKitEnMouvement(kit)}
                  disabled={!kit.est_actif || lignes.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 disabled:opacity-40"
                >
                  <ScanLine className="h-3.5 w-3.5" /> Entrée / Sortie
                </button>
                <button
                  onClick={() => imprimer([kit])}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <QrCode className="h-3.5 w-3.5" /> Imprimer
                </button>
                {canManage && (
                  <>
                    <button
                      onClick={() => ouvrirEdition(kit)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button
                      onClick={() => supprimer(kit)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <KitModal
        isOpen={modalOuverte}
        onClose={() => setModalOuverte(false)}
        articles={articles}
        kit={kitEnEdition}
        onSave={async input => {
          if (kitEnEdition) await onUpdate(kitEnEdition.id, input);
          else await onCreate(input);
        }}
      />

      <KitMouvementModal
        isOpen={!!kitEnMouvement}
        onClose={() => setKitEnMouvement(undefined)}
        kit={kitEnMouvement}
        utilisateur={utilisateur}
        onSubmit={onMove}
      />

      {/* Feuille de QR codes : masquee a l'ecran, seule visible a l'impression. */}
      {impression && (
        <div className="fixed inset-0 z-50 hidden bg-white print:relative print:z-auto print:block">
          <div className="grid grid-cols-2 gap-6 p-8">
            {impression.map(kit => (
              <div key={kit.id} className="break-inside-avoid rounded-lg border border-gray-300 p-6 text-center">
                <h2 className="mb-1 text-lg font-bold text-black">{kit.nom}</h2>
                <p className="mb-3 font-mono text-sm text-gray-700">{kit.code}</p>
                <div className="flex justify-center">
                  <BarcodeGenerator value={buildKitQrPayload(kit.code)} size={180} errorCorrectionLevel="H" />
                </div>
                <ul className="mt-3 text-left text-[11px] leading-snug text-gray-700">
                  {(kit.lignes ?? []).map(ligne => (
                    <li key={ligne.id ?? ligne.article_id}>
                      {ligne.quantite} × {ligne.article?.nom ?? articlesParId.get(ligne.article_id)?.nom ?? ligne.article_id}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
