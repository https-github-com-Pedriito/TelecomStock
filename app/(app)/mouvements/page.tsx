'use client';
import { useAuth } from '@/hooks/useAuth';
import { useStock } from '@/hooks/useStock';
import { Mouvements } from '@/src-pages/Mouvements';

export default function MouvementsPage() {
  const { user } = useAuth();
  const { mouvements } = useStock(user ?? null);

  if (!user) return null;
  return <Mouvements mouvements={mouvements} />;
}
