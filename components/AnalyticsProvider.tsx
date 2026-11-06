'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CookieBanner } from '@/components/CookieBanner';
import {
  CONSENT_CHANGE_EVENT,
  getConsent,
  identifyUser,
  initAmplitude,
  resetIdentity,
  setConsent,
  type ConsentState,
} from '@/lib/amplitude';

/**
 * Demarre Amplitude, relie les evenements a l'utilisateur connecte (apres
 * accord) et affiche le bandeau cookies tant qu'aucun choix n'a ete fait.
 */
export function AnalyticsProvider() {
  const router = useRouter();
  const { user } = useAuth();
  // null avant le montage : evite tout ecart d'hydratation avec le rendu serveur.
  const [consent, setConsentState] = useState<ConsentState | null>(null);

  useEffect(() => {
    initAmplitude();
    setConsentState(getConsent());
    const sync = () => setConsentState(getConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  const userId = user?.id;
  const userRole = user?.role;
  const tenantId = user?.tenant_id;
  // `consent` fait partie des dependances : si l'accord est donne apres la
  // connexion, l'identification est rejouee.
  useEffect(() => {
    if (userId && userRole) identifyUser({ id: userId, role: userRole, tenantId });
    else resetIdentity();
  }, [userId, userRole, tenantId, consent]);

  if (consent !== 'unknown') return null;

  return (
    <CookieBanner
      onAccept={() => setConsent('accepted')}
      onDecline={() => setConsent('declined')}
      onViewPrivacy={() => router.push('/privacy')}
    />
  );
}
