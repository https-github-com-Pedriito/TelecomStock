/**
 * Amplitude Analytics (client uniquement).
 *
 * Deux niveaux de collecte, selon le choix du bandeau cookies :
 *
 * - Anonyme (par defaut, ou si l'utilisateur refuse) : aucun cookie, aucun
 *   stockage navigateur, pas d'adresse IP, pas d'identifiant utilisateur, pas
 *   d'attribution marketing, pas de Session Replay. Seules des statistiques
 *   agregees (pages vues, sessions, evenements metier) sont envoyees.
 * - Identifie (apres « Accepter ») : cookie Amplitude, ID interne + role +
 *   tenant (jamais d'email, nom ou prenom), attribution et Session Replay
 *   masque. Le choix est conserve dans localStorage.
 *
 * Sans NEXT_PUBLIC_AMPLITUDE_API_KEY, tout est desactive (no-op).
 * Donnees hebergees aux Etats-Unis (serverZone: 'US'), region du projet Amplitude.
 * Cette region doit rester identique a celle du projet : un SDK en 'EU' face a un
 * projet 'US' envoie des evenements qui n'apparaissent jamais.
 */
import * as amplitude from '@amplitude/analytics-browser';

export const CONSENT_STORAGE_KEY = 'telecomstock-cookie-consent';
export const CONSENT_CHANGE_EVENT = 'telecomstock:consent-change';

/** Part des sessions enregistrees par Session Replay (apres accord). */
const REPLAY_SAMPLE_RATE = 0.1;

export type ConsentState = 'accepted' | 'declined' | 'unknown';

export type AnalyticsEventName =
  | 'Plan Selected'
  | 'Checkout Started'
  | 'Login Succeeded'
  | 'Logout'
  | 'Barcode Scanned'
  | 'Article Created'
  | 'Article Deleted'
  | 'Stock Movement Created'
  | 'Supplier Created'
  | 'Kit Created'
  | 'Inventory Created'
  | 'Inventory Entry Added'
  | 'Kit Movement Created'
  | 'Stock Alert Raised'
  | 'Insufficient Stock Rejected'
  | 'Data Exported'
  | 'Data Imported'
  | 'User Created';

/** Proprietes d'evenement : uniquement des valeurs simples, jamais de donnees personnelles. */
export type AnalyticsEventProps = Record<string, string | number | boolean>;

export interface AnalyticsIdentity {
  id: string;
  role: string;
  tenantId?: string | null;
}

let initialized = false;
let identifiedMode = false;
let identity: AnalyticsIdentity | null = null;
let replayAttached = false;

function getApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || undefined;
}

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'declined' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Supprime les cookies poses par Amplitude (retrait du consentement). */
function clearAmplitudeCookies() {
  if (typeof document === 'undefined') return;
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name && (name.startsWith('AMP_') || name.startsWith('amp_'))) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  }
}

async function attachSessionReplay() {
  if (replayAttached || !initialized) return;
  replayAttached = true;
  try {
    const { sessionReplayPlugin } = await import('@amplitude/plugin-session-replay-browser');
    // Le consentement a pu etre retire pendant le chargement du plugin.
    if (!identifiedMode) {
      replayAttached = false;
      return;
    }
    amplitude.add(
      sessionReplayPlugin({
        sampleRate: REPLAY_SAMPLE_RATE,
        privacyConfig: { defaultMaskLevel: 'conservative' },
      }),
    );
  } catch {
    replayAttached = false;
  }
}

function detachSessionReplay() {
  if (!replayAttached) return;
  replayAttached = false;
  try {
    amplitude.remove('Session Replay Plugin');
  } catch {
    /* plugin absent */
  }
}

function applyIdentity() {
  if (!initialized || !identifiedMode || !identity) return;
  amplitude.setUserId(identity.id);
  const props = new amplitude.Identify();
  props.set('role', identity.role);
  amplitude.identify(props);
  if (identity.tenantId) amplitude.setGroup('tenant', identity.tenantId);
}

/** Demarre Amplitude une seule fois. Le mode depend du consentement deja enregistre. */
export function initAmplitude(): void {
  if (typeof window === 'undefined' || initialized) return;
  const apiKey = getApiKey();
  if (!apiKey) return;

  identifiedMode = getConsent() === 'accepted';

  amplitude.init(apiKey, undefined, {
    serverZone: 'US',
    // Sans accord : rien n'est ecrit dans le navigateur.
    identityStorage: identifiedMode ? 'cookie' : 'none',
    trackingOptions: { ipAddress: identifiedMode },
    autocapture: {
      sessions: true,
      // Next.js navigue via history.pushState : on suit les changements de chemin.
      pageViews: { trackHistoryChanges: 'pathOnly' },
      attribution: identifiedMode,
      fileDownloads: false,
      formInteractions: false,
      elementInteractions: false,
    },
  });
  initialized = true;

  applyIdentity();
  if (identifiedMode) void attachSessionReplay();
}

/**
 * Enregistre le choix de l'utilisateur et adapte la collecte immediatement.
 * `null` efface le choix (le bandeau reapparait, la collecte repasse en anonyme).
 */
export function setConsent(value: 'accepted' | 'declined' | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    else window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* stockage indisponible (navigation privee) : le choix vaut pour la session */
  }

  if (initialized) {
    if (value === 'accepted') {
      identifiedMode = true;
      applyIdentity();
      void attachSessionReplay();
    } else {
      identifiedMode = false;
      detachSessionReplay();
      amplitude.reset();
      clearAmplitudeCookies();
    }
  }

  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

/** Associe les evenements a l'utilisateur connecte (uniquement si l'accord est donne). */
export function identifyUser(next: AnalyticsIdentity): void {
  identity = next;
  applyIdentity();
}

/** A appeler a la deconnexion. */
export function resetIdentity(): void {
  identity = null;
  if (initialized && identifiedMode) amplitude.reset();
}

export function track(event: AnalyticsEventName, props?: AnalyticsEventProps): void {
  if (!initialized) return;
  amplitude.track(event, props);
}
