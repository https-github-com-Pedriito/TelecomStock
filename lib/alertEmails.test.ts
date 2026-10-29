import { describe, it, expect } from 'vitest';
import { MAX_ALERT_EMAILS, mergeRecipients, parseAlertEmails } from './alertEmails';

describe('parseAlertEmails', () => {
  it('accepts an empty list', () => {
    expect(parseAlertEmails([])).toEqual({ ok: true, emails: [] });
  });

  it('accepts one or two valid addresses', () => {
    expect(parseAlertEmails(['achats@acme.fr'])).toEqual({ ok: true, emails: ['achats@acme.fr'] });
    expect(parseAlertEmails(['a@acme.fr', 'b@acme.fr'])).toEqual({ ok: true, emails: ['a@acme.fr', 'b@acme.fr'] });
  });

  it('allows MAX_ALERT_EMAILS addresses and rejects one more', () => {
    expect(MAX_ALERT_EMAILS).toBe(2);
    const result = parseAlertEmails(['a@acme.fr', 'b@acme.fr', 'c@acme.fr']);
    expect(result.ok).toBe(false);
  });

  it('trims spaces, lowercases and drops empty fields', () => {
    expect(parseAlertEmails(['  Achats@ACME.fr ', '', '   '])).toEqual({ ok: true, emails: ['achats@acme.fr'] });
  });

  it('removes duplicates (case-insensitive) before counting the limit', () => {
    expect(parseAlertEmails(['a@acme.fr', 'A@acme.fr', 'b@acme.fr'])).toEqual({
      ok: true,
      emails: ['a@acme.fr', 'b@acme.fr'],
    });
  });

  it.each(['not-an-email', 'a@b', '@acme.fr', 'a b@acme.fr', 'a@acme.fr, b@acme.fr'])('rejects %s', (bad) => {
    const result = parseAlertEmails([bad]);
    expect(result.ok).toBe(false);
  });

  it('names the invalid address in the error message', () => {
    const result = parseAlertEmails(['ok@acme.fr', 'oups']);
    expect(result).toEqual({ ok: false, message: 'Adresse e-mail invalide : oups' });
  });

  it.each([undefined, null, 'a@acme.fr', 42, { 0: 'a@acme.fr' }, [1, 2]])('rejects non-list input %j', (bad) => {
    expect(parseAlertEmails(bad).ok).toBe(false);
  });

  it('rejects an address longer than 254 characters', () => {
    const long = `${'a'.repeat(250)}@acme.fr`;
    expect(parseAlertEmails([long]).ok).toBe(false);
  });
});

describe('mergeRecipients', () => {
  it('puts account emails first, then the extra addresses', () => {
    expect(mergeRecipients(['admin@acme.fr'], ['achats@acme.fr'])).toEqual(['admin@acme.fr', 'achats@acme.fr']);
  });

  it('does not repeat an extra address already used by an account (case-insensitive)', () => {
    expect(mergeRecipients(['Admin@acme.fr', 'mgr@acme.fr'], ['admin@ACME.fr', 'achats@acme.fr'])).toEqual([
      'Admin@acme.fr',
      'mgr@acme.fr',
      'achats@acme.fr',
    ]);
  });

  it('works without extra addresses and ignores blank entries', () => {
    expect(mergeRecipients(['admin@acme.fr', ''])).toEqual(['admin@acme.fr']);
  });
});
