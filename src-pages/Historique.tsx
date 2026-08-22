'use client';

import { Mouvements } from '@/src-pages/Mouvements';

export function Historique() {
  // On délègue tout l'affichage à Mouvements (chargement paginé par date géré en interne)
  return <Mouvements />;
}
