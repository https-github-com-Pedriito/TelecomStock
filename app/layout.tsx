import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TelecomStock',
  description: 'Gestion de stock pour les professionnels du télécom',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
