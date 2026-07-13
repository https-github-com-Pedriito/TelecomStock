import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { UserRole } from '@/entities/User';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be defined');
  return secret;
}

export interface JwtPayload {
  userId: string;
  tenantId: string | null;
  email: string;
  role: UserRole;
  nom: string;
  prenom: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  const cookie = request.cookies.get('token');
  if (cookie) return cookie.value;
  return null;
}

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
  }
}

export function requireAuth(request: NextRequest): JwtPayload {
  const token = extractToken(request);
  if (!token) throw new AuthError('Token manquant');
  try {
    return verifyToken(token);
  } catch {
    throw new AuthError('Token invalide');
  }
}

export function requireRole(payload: JwtPayload, ...roles: UserRole[]): void {
  if (!roles.includes(payload.role)) {
    throw new AuthError('Permissions insuffisantes', 403);
  }
}

export function requireTenant(payload: JwtPayload): string {
  if (!payload.tenantId) throw new AuthError('Aucun tenant associé', 403);
  return payload.tenantId;
}

// Wrapper qui gère automatiquement les erreurs d'auth.
// Le context est transmis tel quel pour supporter les routes dynamiques Next.js.
export function withAuth<C = unknown>(
  handler: (request: NextRequest, auth: JwtPayload, context: C) => Promise<Response>
) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      const auth = requireAuth(request);
      return await handler(request, auth, context);
    } catch (err) {
      if (err instanceof AuthError) {
        return Response.json({ message: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ message: 'Erreur serveur' }, { status: 500 });
    }
  };
}
