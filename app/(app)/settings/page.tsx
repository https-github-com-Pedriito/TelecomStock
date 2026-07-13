'use client';
import { useAuth } from '@/hooks/useAuth';
import { SettingsPage } from '@/components/SettingsPage';

export default function SettingsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  return <SettingsPage />;
}
