'use client';
import { useRouter } from 'next/navigation';
import { PricingPage } from '@/src-pages/PricingPage';

export default function PricingRoute() {
  const router = useRouter();
  return <PricingPage onBack={() => router.back()} onLogin={() => router.push('/login')} />;
}
