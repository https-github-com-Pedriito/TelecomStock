'use client';
import { useAuth } from '@/hooks/useAuth';
import { Historique } from '@/src-pages/Historique';

export default function HistoriquePage() {
  const { user } = useAuth();
  if (!user) return null;
  return <Historique />;
}
