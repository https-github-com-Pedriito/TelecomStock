'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { api } from '@/lib/api';
import { Suspense } from 'react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, signIn } = useAuth();
  const [loginError, setLoginError] = useState('');
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const registered = searchParams.get('registered');

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError('');
      setPortalUrl(null);
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error: any) {
      const data = error?.response?.data;
      if (data?.code === 'SUBSCRIPTION_INACTIVE') {
        setLoginError(data.message);
        if (data.portalUrl) setPortalUrl(data.portalUrl);
      } else {
        setLoginError(error instanceof Error ? error.message : 'Erreur de connexion');
      }
      throw error;
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await api.forgotPassword(email);
    } catch {
      // Réponse générique — ne pas exposer si l'email existe
    }
  };

  return (
    <div className=”relative”>
      {registered && (
        <div className=”fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg text-sm font-medium”>
          Compte créé ! Vérifiez votre email pour vos identifiants.
        </div>
      )}
      <LoginForm
        onLogin={handleLogin}
        onForgotPassword={handleForgotPassword}
        error={loginError}
        portalUrl={portalUrl}
        onBack={() => router.push('/')}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
