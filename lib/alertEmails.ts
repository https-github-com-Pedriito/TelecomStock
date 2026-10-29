export const MAX_ALERT_EMAILS = 2;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export type AlertEmailsResult = { ok: true; emails: string[] } | { ok: false; message: string };

/**
 * Valide la liste d'adresses supplementaires pour les alertes de stock :
 * espaces retires, casse normalisee, doublons et champs vides ignores.
 */
export function parseAlertEmails(input: unknown): AlertEmailsResult {
  if (!Array.isArray(input) || input.some(v => typeof v !== 'string')) {
    return { ok: false, message: 'alert_emails doit être une liste d\'adresses e-mail.' };
  }

  const emails: string[] = [];
  for (const raw of input as string[]) {
    const email = raw.trim().toLowerCase();
    if (!email) continue;
    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_RE.test(email)) {
      return { ok: false, message: `Adresse e-mail invalide : ${raw.trim()}` };
    }
    if (!emails.includes(email)) emails.push(email);
  }

  if (emails.length > MAX_ALERT_EMAILS) {
    return { ok: false, message: `${MAX_ALERT_EMAILS} adresses supplémentaires au maximum.` };
  }
  return { ok: true, emails };
}

/** Fusionne les e-mails des comptes et les adresses supplementaires, sans doublon (casse ignoree). */
export function mergeRecipients(accountEmails: string[], extraEmails: string[] = []): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const email of [...accountEmails, ...extraEmails]) {
    const key = email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(email.trim());
  }
  return merged;
}
