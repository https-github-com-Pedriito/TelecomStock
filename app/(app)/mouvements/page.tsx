'use client';
import { useAuth } from '@/hooks/useAuth';
import { Mouvements } from '@/src-pages/Mouvements';

export default function MouvementsPage() {
  const { user } = useAuth();

  if (!user) return null;
  return <Mouvements />;
}
