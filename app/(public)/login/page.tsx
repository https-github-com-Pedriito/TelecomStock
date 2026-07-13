'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/LoginForm';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, signIn } = useAuth();
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError('');
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Erreur de connexion');
      throw error;
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await api.forgotPassword(email);
    } catch {
      // RÃ©ponse gÃ©nÃ©rique â€” ne pas exposer si l'email existe
    }
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onForgotPassword={handleForgotPassword}
      error={loginError}
      onBack={() => router.push('/')}
    />
  );
}
