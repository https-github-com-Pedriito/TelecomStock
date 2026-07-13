'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/tokenManager';
import { LandingPage } from '@/src-pages/LandingPage';

type PublicView = 'landing' | 'login' | 'pricing' | 'faq' | 'privacy' | 'terms';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

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
