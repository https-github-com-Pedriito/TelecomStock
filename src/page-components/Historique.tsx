import { Mouvements } from './Mouvements';
import { Mouvement } from '../types';

interface HistoriqueProps {
  mouvements: Mouvement[];
}

export function Historique({ mouvements }: HistoriqueProps) {
  // On délègue tout l'affichage à Mouvements
  return <Mouvements mouvements={mouvements} />;
}