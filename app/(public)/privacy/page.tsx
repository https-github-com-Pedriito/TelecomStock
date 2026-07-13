'use client';
import { useRouter } from 'next/navigation';
import { PrivacyPage } from '@/src-pages/PrivacyPage';

export default function PrivacyRoute() {
  const router = useRouter();
  return <PrivacyPage onBack={() => router.back()} onLogin={() => router.push('/login')} />;
}
