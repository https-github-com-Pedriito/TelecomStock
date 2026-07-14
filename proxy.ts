import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/pricing', '/faq', '/privacy', '/terms'];
const API_PUBLIC = ['/api/auth/login', '/api/auth/forgot-password', '/api/auth/register-tenant'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes API publiques — laisser passer
  if (API_PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Routes API protégées — vérifier le token dans le header Authorization
  if (pathname.startsWith('/api/')) {
    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    try {
      verifyToken(token);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ message: 'Token invalide' }, { status: 401 });
    }
  }

  // Pages publiques — laisser passer
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // Pages app — vérifier la session cookie
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', request.url));
  try {
    verifyToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
