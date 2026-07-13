'use client';
import { useRouter } from 'next/navigation';
import { FAQPage } from '@/src-pages/FAQPage';

export default function FAQRoute() {
  const router = useRouter();
  return <FAQPage onBack={() => router.back()} onLogin={() => router.push('/login')} />;
}
