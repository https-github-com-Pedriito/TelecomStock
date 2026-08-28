'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { LandingPage } from '@/src-pages/LandingPage';

type PublicView = 'landing' | 'login' | 'pricing' | 'faq' | 'privacy' | 'terms';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace(getDefaultRouteForRole(user.role));
  }, [user, loading, router]);

  const handleNavigate = (view: PublicView) => {
    if (view === 'login') router.push('/login');
    else if (view === 'pricing') router.push('/pricing');
    else if (view === 'faq') router.push('/faq');
    else if (view === 'privacy') router.push('/privacy');
    else if (view === 'terms') router.push('/terms');
  };

  return (
    <LandingPage
      onLoginClick={() => router.push('/login')}
      onNavigate={handleNavigate}
    />
  );
}
