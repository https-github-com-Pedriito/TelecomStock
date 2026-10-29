import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeRepo } from '../test/helpers/fakeDb';
import { UserRole } from '@/entities/User';

vi.mock('@/lib/mailer', () => ({ sendStockAlertEmail: vi.fn().mockResolvedValue(undefined) }));

import { sendStockAlertEmail } from '@/lib/mailer';
import { notifyStockAlerts } from './stockAlerts';

const TENANT = 't1';

function makeDb(opts: { tenant?: any; users?: any[] }) {
  const tenantRepo = createFakeRepo(opts.tenant ? [opts.tenant] : []);
  const userRepo = createFakeRepo(opts.users ?? []);
  return {
    getRepository: (entity: any) => {
      if (entity.name === 'Tenant') return tenantRepo;
      if (entity.name === 'User') return userRepo;
      throw new Error(`Unexpected repo: ${entity.name}`);
    },
  } as any;
}

const accounts = [
  { id: 'u1', tenant_id: TENANT, role: UserRole.ADMIN, is_active: true, email: 'admin@acme.fr' },
  { id: 'u2', tenant_id: TENANT, role: UserRole.MANAGER, is_active: true, email: 'mgr@acme.fr' },
  { id: 'u3', tenant_id: TENANT, role: UserRole.TECHNICIEN, is_active: true, email: 'tech@acme.fr' },
  { id: 'u4', tenant_id: TENANT, role: UserRole.ADMIN, is_active: false, email: 'gone@acme.fr' },
];
const lowStock = { id: 'a1', nom: 'Câble RJ45', quantite_stock: 2, seuil_minimum: 5 } as any;
const okStock = { id: 'a2', nom: 'Switch', quantite_stock: 50, seuil_minimum: 5 } as any;
const outOfStock = { id: 'a3', nom: 'Antenne', quantite_stock: 0, seuil_minimum: 5 } as any;

beforeEach(() => vi.mocked(sendStockAlertEmail).mockClear());

describe('notifyStockAlerts — extra recipients', () => {
  it('adds the two extra addresses to the account emails', async () => {
    const db = makeDb({
      tenant: { id: TENANT, nom: 'ACME', alert_emails: ['achats@acme.fr', 'dir@acme.fr'] },
      users: accounts,
    });
    await notifyStockAlerts(db, TENANT, [lowStock]);

    expect(sendStockAlertEmail).toHaveBeenCalledTimes(1);
    const [emails, tenantNom, articleNom, quantite, niveau] = vi.mocked(sendStockAlertEmail).mock.calls[0];
    expect(emails).toEqual(['admin@acme.fr', 'mgr@acme.fr', 'achats@acme.fr', 'dir@acme.fr']);
    expect([tenantNom, articleNom, quantite, niveau]).toEqual(['ACME', 'Câble RJ45', 2, 'critique']);
  });

  it('still alerts only the accounts when no extra address is set (null or missing)', async () => {
    for (const alert_emails of [null, undefined, []]) {
      vi.mocked(sendStockAlertEmail).mockClear();
      const db = makeDb({ tenant: { id: TENANT, nom: 'ACME', alert_emails }, users: accounts });
      await notifyStockAlerts(db, TENANT, [lowStock]);
      expect(vi.mocked(sendStockAlertEmail).mock.calls[0][0]).toEqual(['admin@acme.fr', 'mgr@acme.fr']);
    }
  });

  it('does not send twice to an extra address that is also an account email', async () => {
    const db = makeDb({
      tenant: { id: TENANT, nom: 'ACME', alert_emails: ['ADMIN@acme.fr', 'achats@acme.fr'] },
      users: accounts,
    });
    await notifyStockAlerts(db, TENANT, [lowStock]);
    expect(vi.mocked(sendStockAlertEmail).mock.calls[0][0]).toEqual(['admin@acme.fr', 'mgr@acme.fr', 'achats@acme.fr']);
  });

  it('alerts the extra addresses even when the tenant has no active admin or manager', async () => {
    const db = makeDb({
      tenant: { id: TENANT, nom: 'ACME', alert_emails: ['achats@acme.fr'] },
      users: [accounts[2], accounts[3]],
    });
    await notifyStockAlerts(db, TENANT, [lowStock]);
    expect(vi.mocked(sendStockAlertEmail).mock.calls[0][0]).toEqual(['achats@acme.fr']);
  });

  it('sends one alert per article in alert, to the same recipients, and skips articles that are fine', async () => {
    const db = makeDb({
      tenant: { id: TENANT, nom: 'ACME', alert_emails: ['achats@acme.fr'] },
      users: accounts,
    });
    await notifyStockAlerts(db, TENANT, [lowStock, okStock, outOfStock]);

    const calls = vi.mocked(sendStockAlertEmail).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls.map(c => [c[2], c[4]])).toEqual([['Câble RJ45', 'critique'], ['Antenne', 'rupture']]);
    for (const call of calls) expect(call[0]).toEqual(['admin@acme.fr', 'mgr@acme.fr', 'achats@acme.fr']);
  });

  it('sends nothing when no article is in alert', async () => {
    const db = makeDb({ tenant: { id: TENANT, nom: 'ACME', alert_emails: ['achats@acme.fr'] }, users: accounts });
    await notifyStockAlerts(db, TENANT, [okStock]);
    expect(sendStockAlertEmail).not.toHaveBeenCalled();
  });

  it('never throws when the mailer fails (the stock movement must not be cancelled)', async () => {
    vi.mocked(sendStockAlertEmail).mockRejectedValueOnce(new Error('Resend : down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = makeDb({ tenant: { id: TENANT, nom: 'ACME', alert_emails: ['achats@acme.fr'] }, users: accounts });
    await expect(notifyStockAlerts(db, TENANT, [lowStock])).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
