import { describe, it, expect, vi, beforeEach } from 'vitest';

const batchSend = vi.hoisted(() => vi.fn());
vi.mock('resend', () => ({
  Resend: class {
    batch = { send: batchSend };
  },
}));

import { sendStockAlertEmail } from './mailer';

type Payload = { from: string; to: string[]; subject: string; html: string };
const sent = (): Payload[] => batchSend.mock.calls.flatMap(c => c[0] as Payload[]);

beforeEach(() => {
  batchSend.mockReset().mockResolvedValue({ data: { data: [] }, error: null });
  process.env.RESEND_API_KEY = 're_test';
  process.env.NEXT_PUBLIC_BASE_URL = 'https://stock.example.com';
});

describe('sendStockAlertEmail', () => {
  it('sends one separate email per recipient, so addresses are never shown to each other', async () => {
    await sendStockAlertEmail(['admin@acme.fr', 'achats@acme.fr', 'dir@acme.fr'], 'ACME', 'Câble RJ45', 2, 'critique');

    expect(batchSend).toHaveBeenCalledTimes(1);
    expect(sent().map(m => m.to)).toEqual([['admin@acme.fr'], ['achats@acme.fr'], ['dir@acme.fr']]);
  });

  it('keeps the Telecom Stock branding in every email', async () => {
    await sendStockAlertEmail(['admin@acme.fr', 'achats@acme.fr'], 'ACME', 'Câble RJ45', 2, 'critique');

    const emails = sent();
    expect(emails).toHaveLength(2);
    for (const email of emails) {
      expect(email.html).toContain('<!DOCTYPE html>');
      expect(email.html).toContain('background-color:#2563eb'); // bandeau bleu
      expect(email.html).toContain('>Telecom Stock</span>'); // nom de marque dans l'en-tete
      expect(email.html).toContain(`© ${new Date().getFullYear()} Telecom Stock`); // pied de page
      expect(email.html).toContain('https://stock.example.com/articles'); // bouton d'action
      expect(email.html).toContain('Voir les articles');
      expect(email.from).toContain('TelecomStock');
    }
  });

  it('sends exactly the same subject and content to every recipient', async () => {
    await sendStockAlertEmail(['a@acme.fr', 'b@acme.fr'], 'ACME', 'Câble RJ45', 2, 'critique');
    const [first, second] = sent();
    expect(first.subject).toBe(second.subject);
    expect(first.html).toBe(second.html);
  });

  it('writes the critical-stock message with quantity, article and tenant', async () => {
    await sendStockAlertEmail(['a@acme.fr'], 'ACME', 'Câble RJ45', 2, 'critique');
    const [email] = sent();
    expect(email.subject).toBe('⚠️ Stock critique — Câble RJ45 (ACME)');
    expect(email.html).toContain('Câble RJ45');
    expect(email.html).toContain('<strong>2 unité(s)</strong>');
    expect(email.html).toContain('Vous recevez cette alerte car votre adresse est destinataire des alertes de stock de ACME');
  });

  it('writes the out-of-stock message for a "rupture"', async () => {
    await sendStockAlertEmail(['a@acme.fr'], 'ACME', 'Antenne', 0, 'rupture');
    const [email] = sent();
    expect(email.subject).toBe('🔴 Rupture de stock — Antenne (ACME)');
    expect(email.html).toContain('rupture de stock');
  });

  it('splits into several batches above the Resend limit of 100 emails', async () => {
    const recipients = Array.from({ length: 150 }, (_, i) => `u${i}@acme.fr`);
    await sendStockAlertEmail(recipients, 'ACME', 'Câble RJ45', 2, 'critique');
    expect(batchSend.mock.calls.map(c => c[0].length)).toEqual([100, 50]);
  });

  it('throws when Resend reports an error, so the caller can log it', async () => {
    batchSend.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } });
    await expect(sendStockAlertEmail(['a@acme.fr'], 'ACME', 'X', 1, 'critique')).rejects.toThrow('domain not verified');
  });

  it('does nothing and does not crash without RESEND_API_KEY', async () => {
    // Le client Resend est mis en cache au premier appel : ce test doit rester le dernier a s'executer
    // avec une cle, d'ou le vi.resetModules() qui force un module neuf.
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fresh = await import('./mailer');
    await fresh.sendStockAlertEmail(['a@acme.fr'], 'ACME', 'X', 1, 'critique');
    expect(batchSend).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'));
    warn.mockRestore();
  });

  it('does nothing when there is no recipient', async () => {
    await sendStockAlertEmail([], 'ACME', 'X', 1, 'critique');
    expect(batchSend).not.toHaveBeenCalled();
  });
});
