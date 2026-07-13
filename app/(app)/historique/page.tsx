'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Historique } from '@/src-pages/Historique';

export default function HistoriquePage() {
  const { user } = useAuth();
  const { mouvements } = useStock(user ?? null);
  if (!user) return null;
  return <Historique mouvements={mouvements} />;
}
