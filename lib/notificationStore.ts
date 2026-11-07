/**
 * Store global des notifications (toasts).
 *
 * Avant, chaque appel de `useNotifications()` creait sa propre liste : seul le
 * conteneur rendu par le layout etait affiche, donc les notifications emises
 * depuis une page (equipements, utilisateurs...) n'apparaissaient jamais. Ici
 * toutes les pages ecrivent dans la meme liste, rendue une seule fois.
 */
import { getStockLevel } from '@/lib/stock';
import { track } from '@/lib/amplitude';

export type NotificationType = 'success' | 'warning' | 'info' | 'error' | 'creation' | 'deletion';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
}

export type NewNotification = Omit<NotificationItem, 'id'>;

let items: NotificationItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `n_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): NotificationItem[] {
  return items;
}

const EMPTY: NotificationItem[] = [];
export function getServerSnapshot(): NotificationItem[] {
  return EMPTY;
}

export function addNotification(notification: NewNotification): string {
  const id = newId();
  items = [...items, { ...notification, id }];
  emit();
  return id;
}

export function removeNotification(id: string): void {
  if (!items.some(n => n.id === id)) return;
  items = items.filter(n => n.id !== id);
  emit();
}

/** Vide le store (tests). */
export function clearNotifications(): void {
  items = [];
  emit();
}

export function showStockNotification(
  articleNom: string,
  nouvelleQuantite: number,
  type: 'ENTREE' | 'SORTIE',
  seuilMinimum?: number
): string {
  const niveau = getStockLevel(nouvelleQuantite, seuilMinimum ?? 0);
  const isRupture = niveau === 'rupture';
  const isCritique = niveau === 'critique';
  if (isRupture || isCritique) track('Stock Alert Raised', { level: niveau, source: 'article' });

  return addNotification({
    type: isRupture ? 'error' : isCritique ? 'warning' : 'success',
    title: `${type === 'ENTREE' ? 'Entrée' : 'Sortie'} confirmée`,
    message: `${articleNom}: ${nouvelleQuantite} unités actuellement en stock.${
      isRupture ? ' Rupture de stock !' : isCritique ? ' Attention: niveau critique !' : ''
    }`,
    duration: isRupture || isCritique ? 8000 : 4000,
  });
}
