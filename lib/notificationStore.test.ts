import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addNotification,
  clearNotifications,
  getSnapshot,
  removeNotification,
  showStockNotification,
  subscribe,
} from './notificationStore';

beforeEach(() => clearNotifications());

describe('notificationStore', () => {
  it('partage une seule liste entre tous les appelants', () => {
    addNotification({ type: 'success', title: 'A', message: 'a' });
    addNotification({ type: 'info', title: 'B', message: 'b' });
    expect(getSnapshot().map(n => n.title)).toEqual(['A', 'B']);
  });

  it('prévient les abonnés a chaque changement et respecte le désabonnement', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    const id = addNotification({ type: 'success', title: 'A', message: 'a' });
    removeNotification(id);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    addNotification({ type: 'success', title: 'B', message: 'b' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('retire une notification précise et ignore un id inconnu sans émettre', () => {
    const listener = vi.fn();
    const a = addNotification({ type: 'success', title: 'A', message: 'a' });
    addNotification({ type: 'success', title: 'B', message: 'b' });
    subscribe(listener);
    removeNotification('inconnu');
    expect(listener).not.toHaveBeenCalled();
    removeNotification(a);
    expect(getSnapshot().map(n => n.title)).toEqual(['B']);
  });

  it('renvoie une référence stable tant que rien ne change (useSyncExternalStore)', () => {
    addNotification({ type: 'success', title: 'A', message: 'a' });
    expect(getSnapshot()).toBe(getSnapshot());
  });
});

describe('showStockNotification', () => {
  it('confirme une entrée normale en succès', () => {
    showStockNotification('Câble', 20, 'ENTREE', 5);
    expect(getSnapshot()[0]).toMatchObject({ type: 'success', title: 'Entrée confirmée' });
  });

  it('alerte en niveau critique et en rupture', () => {
    showStockNotification('Câble', 3, 'SORTIE', 5);
    showStockNotification('Prise', 0, 'SORTIE', 5);
    const [critique, rupture] = getSnapshot();
    expect(critique).toMatchObject({ type: 'warning', title: 'Sortie confirmée' });
    expect(critique.message).toContain('critique');
    expect(rupture.type).toBe('error');
    expect(rupture.message).toContain('Rupture');
  });
});
