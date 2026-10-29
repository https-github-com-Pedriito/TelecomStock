'use client';

import { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, X } from 'lucide-react';
import { Portal } from '@/components/Portal';
import { api } from '@/lib/api';
import { MAX_ALERT_EMAILS, parseAlertEmails } from '@/lib/alertEmails';

/**
 * Montee par le parent uniquement lorsqu'elle doit s'afficher : l'etat initial
 * (chargement en cours, formulaire vide) n'a donc pas besoin d'effet de remise a zero.
 */
interface AlertRecipientsModalProps {
  onClose: () => void;
}

const emptyFields = () => Array<string>(MAX_ALERT_EMAILS).fill('');
const toFields = (emails: string[]) => Array.from({ length: MAX_ALERT_EMAILS }, (_, i) => emails[i] ?? '');

/**
 * Adresses supplementaires (2 max) qui recoivent les alertes de stock bas, en
 * plus des comptes admin et manager du tenant.
 */
export function AlertRecipientsModal({ onClose }: AlertRecipientsModalProps) {
  const [fields, setFields] = useState<string[]>(emptyFields);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let annule = false;
    api.getTenantInfo()
      .then((data) => {
        if (!annule) setFields(toFields((data as { alert_emails?: string[] }).alert_emails ?? []));
      })
      .catch(() => !annule && setError("Impossible de charger les destinataires d'alerte."))
      .finally(() => !annule && setLoading(false));
    return () => { annule = true; };
  }, []);

  const handleChange = (index: number, value: string) => {
    setError(null);
    setSaved(false);
    setFields(prev => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseAlertEmails(fields);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { alert_emails } = await api.updateAlertEmails(parsed.emails);
      setFields(toFields(alert_emails));
      setSaved(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-6">
        <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md animate-fade-in" onClick={handleClose} />

        <div className="relative w-full max-w-lg rounded-[2rem] shadow-2xl animate-scale-in max-h-[90dvh] sm:max-h-[90vh]">
          <div className="glass rounded-[2rem] border border-white/40 dark:border-gray-800/50 overflow-hidden flex flex-col">
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b border-white/20 dark:border-gray-800/50 flex items-center justify-between bg-blue-500/5 dark:bg-blue-950/20">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
                  <BellRing size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Notifications</span>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Alertes de stock</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="p-3 hover:bg-white/40 dark:hover:bg-gray-800/40 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white active:scale-90"
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="p-6 sm:p-8 space-y-5 overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Les administrateurs et managers actifs reçoivent toujours les alertes de stock bas sur l&apos;adresse
                de leur compte. Ajoutez jusqu&apos;à {MAX_ALERT_EMAILS} adresses supplémentaires qui les recevront aussi.
              </p>

              {fields.map((value, index) => (
                <div key={index}>
                  <label
                    htmlFor={`alert-email-${index}`}
                    className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500"
                  >
                    Adresse supplémentaire {index + 1}
                  </label>
                  <input
                    id={`alert-email-${index}`}
                    type="email"
                    value={value}
                    disabled={loading || saving}
                    onChange={(e) => handleChange(index, e.target.value)}
                    placeholder="achats@entreprise.fr"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              ))}

              {error && (
                <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
              {saved && (
                <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> Destinataires enregistrés.
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={loading || saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
}
