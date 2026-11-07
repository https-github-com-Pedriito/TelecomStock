import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => {
  class FakeIdentify {
    props: Record<string, unknown> = {};
    set(key: string, value: unknown) {
      this.props[key] = value;
      return this;
    }
  }
  return {
    init: vi.fn(),
    track: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    reset: vi.fn(),
    setUserId: vi.fn(),
    setGroup: vi.fn(),
    identify: vi.fn(),
    Identify: FakeIdentify,
  };
});
const replayPlugin = vi.hoisted(() => vi.fn(() => ({ name: 'Session Replay Plugin' })));

vi.mock('@amplitude/analytics-browser', () => sdk);
vi.mock('@amplitude/plugin-session-replay-browser', () => ({ sessionReplayPlugin: replayPlugin }));

type Amplitude = typeof import('./amplitude');

function stubBrowser(initialConsent?: string) {
  const store = new Map<string, string>();
  if (initialConsent) store.set('telecomstock-cookie-consent', initialConsent);
  const listeners: Array<() => void> = [];
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => listeners.forEach(l => l()),
    addEventListener: (_: string, l: () => void) => void listeners.push(l),
  });
  vi.stubGlobal('document', { cookie: '' });
  return store;
}

async function load(initialConsent?: string): Promise<{ mod: Amplitude; store: Map<string, string> }> {
  vi.resetModules();
  const store = stubBrowser(initialConsent);
  return { mod: await import('./amplitude'), store };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('amplitude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_AMPLITUDE_API_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('sans cle API', () => {
    it("n'initialise rien et track() ne fait rien", async () => {
      vi.stubEnv('NEXT_PUBLIC_AMPLITUDE_API_KEY', '');
      const { mod } = await load('accepted');
      mod.initAmplitude();
      mod.track('Login Succeeded');
      expect(sdk.init).not.toHaveBeenCalled();
      expect(sdk.track).not.toHaveBeenCalled();
    });
  });

  describe('sans accord (anonyme)', () => {
    it.each([undefined, 'declined'])('demarre sans stockage, sans IP, sans attribution (choix: %s)', async choice => {
      const { mod } = await load(choice);
      mod.initAmplitude();
      await flush();

      expect(sdk.init).toHaveBeenCalledTimes(1);
      const [key, userId, config] = sdk.init.mock.calls[0];
      expect(key).toBe('test-key');
      expect(userId).toBeUndefined();
      expect(config).toMatchObject({
        serverZone: 'US',
        identityStorage: 'none',
        trackingOptions: { ipAddress: false },
        autocapture: {
          sessions: true,
          pageViews: { trackHistoryChanges: 'pathOnly' },
          attribution: false,
          formInteractions: false,
          elementInteractions: false,
        },
      });
      expect(replayPlugin).not.toHaveBeenCalled();
      expect(sdk.add).not.toHaveBeenCalled();
    });

    it("n'associe jamais d'utilisateur tant qu'il n'a pas accepte", async () => {
      const { mod } = await load('declined');
      mod.initAmplitude();
      mod.identifyUser({ id: 'user-12345', role: 'ADMIN', tenantId: 'tenant-1' });
      expect(sdk.setUserId).not.toHaveBeenCalled();
      expect(sdk.identify).not.toHaveBeenCalled();
      expect(sdk.setGroup).not.toHaveBeenCalled();
    });

    it('envoie quand meme les evenements (statistiques anonymes)', async () => {
      const { mod } = await load();
      mod.initAmplitude();
      mod.track('Article Created', { has_initial_stock: true });
      expect(sdk.track).toHaveBeenCalledWith('Article Created', { has_initial_stock: true });
    });
  });

  describe('avec accord (identifie)', () => {
    it('demarre avec cookie, IP, attribution et Session Replay masque a 10 %', async () => {
      const { mod } = await load('accepted');
      mod.initAmplitude();
      await flush();

      expect(sdk.init.mock.calls[0][2]).toMatchObject({
        serverZone: 'US',
        identityStorage: 'cookie',
        trackingOptions: { ipAddress: true },
        autocapture: { attribution: true },
      });
      expect(replayPlugin).toHaveBeenCalledWith({
        sampleRate: 0.1,
        privacyConfig: { defaultMaskLevel: 'conservative' },
      });
      expect(sdk.add).toHaveBeenCalledTimes(1);
    });

    it("identifie l'utilisateur avec ID interne, role et tenant, sans email ni nom", async () => {
      const { mod } = await load('accepted');
      mod.initAmplitude();
      mod.identifyUser({ id: 'user-12345', role: 'ADMIN', tenantId: 'tenant-1' });

      expect(sdk.setUserId).toHaveBeenCalledWith('user-12345');
      expect(sdk.setGroup).toHaveBeenCalledWith('tenant', 'tenant-1');
      const identify = sdk.identify.mock.calls[0][0] as { props: Record<string, unknown> };
      expect(identify.props).toEqual({ role: 'ADMIN' });
    });

    it("n'appelle pas setGroup sans tenant (super admin)", async () => {
      const { mod } = await load('accepted');
      mod.initAmplitude();
      mod.identifyUser({ id: 'user-12345', role: 'SUPER_ADMIN', tenantId: null });
      expect(sdk.setUserId).toHaveBeenCalledWith('user-12345');
      expect(sdk.setGroup).not.toHaveBeenCalled();
    });

    it("n'initialise Amplitude qu'une seule fois", async () => {
      const { mod } = await load('accepted');
      mod.initAmplitude();
      mod.initAmplitude();
      expect(sdk.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('changement de consentement en cours de session', () => {
    it("accepter apres connexion identifie l'utilisateur et active le replay", async () => {
      const { mod, store } = await load();
      mod.initAmplitude();
      mod.identifyUser({ id: 'user-12345', role: 'MANAGER', tenantId: 'tenant-1' });
      expect(sdk.setUserId).not.toHaveBeenCalled();

      mod.setConsent('accepted');
      await flush();

      expect(store.get('telecomstock-cookie-consent')).toBe('accepted');
      expect(sdk.setUserId).toHaveBeenCalledWith('user-12345');
      expect(sdk.setGroup).toHaveBeenCalledWith('tenant', 'tenant-1');
      expect(sdk.add).toHaveBeenCalledTimes(1);
    });

    it('retirer le consentement coupe le replay, remet a zero et efface les cookies AMP_', async () => {
      const { mod, store } = await load('accepted');
      mod.initAmplitude();
      await flush();
      document.cookie = 'AMP_abc=1; amp_def=2; token=keepme';
      const cookieWrites: string[] = [];
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => 'AMP_abc=1; amp_def=2; token=keepme',
        set: (v: string) => void cookieWrites.push(v),
      });

      mod.setConsent('declined');

      expect(store.get('telecomstock-cookie-consent')).toBe('declined');
      expect(sdk.remove).toHaveBeenCalledWith('Session Replay Plugin');
      expect(sdk.reset).toHaveBeenCalled();
      expect(cookieWrites).toEqual(['AMP_abc=; path=/; max-age=0', 'amp_def=; path=/; max-age=0']);
    });

    it('setConsent(null) efface le choix et repasse en anonyme', async () => {
      const { mod, store } = await load('accepted');
      mod.initAmplitude();
      mod.setConsent(null);
      expect(store.has('telecomstock-cookie-consent')).toBe(false);
      expect(mod.getConsent()).toBe('unknown');
      mod.identifyUser({ id: 'user-12345', role: 'ADMIN' });
      expect(sdk.setUserId).not.toHaveBeenCalled();
    });

    it('resetIdentity remet a zero seulement en mode identifie', async () => {
      const { mod } = await load('accepted');
      mod.initAmplitude();
      mod.resetIdentity();
      expect(sdk.reset).toHaveBeenCalledTimes(1);

      const anon = await load('declined');
      sdk.reset.mockClear();
      anon.mod.initAmplitude();
      anon.mod.resetIdentity();
      expect(sdk.reset).not.toHaveBeenCalled();
    });

    it('notifie les ecouteurs quand le choix change (bandeau)', async () => {
      const { mod } = await load();
      const listener = vi.fn();
      window.addEventListener(mod.CONSENT_CHANGE_EVENT, listener);
      mod.setConsent('declined');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConsent', () => {
    it('ignore les valeurs inconnues', async () => {
      const { mod } = await load('whatever');
      expect(mod.getConsent()).toBe('unknown');
    });

    it('survit a un localStorage indisponible', async () => {
      const { mod } = await load();
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => {
            throw new Error('denied');
          },
          setItem: () => {
            throw new Error('denied');
          },
        },
        dispatchEvent: () => true,
      });
      expect(mod.getConsent()).toBe('unknown');
      expect(() => mod.setConsent('accepted')).not.toThrow();
    });
  });
});
