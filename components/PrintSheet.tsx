'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Feuille destinee a l'impression : masquee a l'ecran, seule visible avec
 * window.print() (cf. regle @media print de globals.css). Rendue dans un
 * portail sous <body> pour echapper a l'en-tete, a la navigation et a la page.
 */
export function PrintSheet({ children }: { children: ReactNode }) {
  return createPortal(
    <div data-print-sheet className="hidden">
      {children}
    </div>,
    document.body,
  );
}
