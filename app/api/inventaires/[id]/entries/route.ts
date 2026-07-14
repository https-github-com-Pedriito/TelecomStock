import { NextRequest } from 'next/server';
import { requireAuth, requireRole, requireTenant, AuthError } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { InventaireEntry } from '@/entities/InventaireEntry';
import { Inventaire } from '@/entities/Inventaire';
import { Article } from '@/entities/Article';
import { UserRole } from '@/entities/User';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
    const tenantId = requireTenant(auth);
    const { id } = await context.params;
    const db = await getDb();
    const entries = await db.getRepository(InventaireEntry).find({
      where: tenantId ? { inventaire_id: id, tenant_id: tenantId } : { inventaire_id: id },
      relations: { article: true, utilisateur: true },
    });
    return Response.json(entries);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const auth = requireAuth(request);
    requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
    const tenantId = requireTenant(auth);
    if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });
    const { id } = await context.params;
    const { article_id, quantite_comptee, commentaire } = await request.json();

    if (!article_id || quantite_comptee === undefined) {
      return Response.json({ message: 'Champs requis manquants' }, { status: 400 });
    }

    const db = await getDb();
    const inventaire = await db.getRepository(Inventaire).findOne({ where: { id, tenant_id: tenantId } });
    if (!inventaire) return Response.json({ message: 'Inventaire introuvable' }, { status: 404 });

    const article = await db.getRepository(Article).findOne({ where: { id: article_id, tenant_id: tenantId } });
    if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

    const entry = db.getRepository(InventaireEntry).create({
      tenant_id: tenantId,
      inventaire_id: id,
      article_id,
      quantite_comptee: Number(quantite_comptee),
      quantite_theorique: article.quantite_stock,
      utilisateur_id: auth.userId,
      commentaire,
    });
    const saved = await db.getRepository(InventaireEntry).save(entry);
    return Response.json(saved, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ message: err.message }, { status: err.status });
    return Response.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
