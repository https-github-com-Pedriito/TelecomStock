import { NextRequest } from 'next/server';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Mouvement, MouvementType } from '@/entities/Mouvement';
import { Article } from '@/entities/Article';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';
import { notifyStockAlerts } from '@/lib/stockAlerts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const GET = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const db = await getDb();

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  const where: Record<string, unknown> = tenantId ? { tenant_id: tenantId } : {};
  if (startDateParam && endDateParam) {
    where.created_at = Between(new Date(startDateParam), new Date(endDateParam));
  } else if (startDateParam) {
    where.created_at = MoreThanOrEqual(new Date(startDateParam));
  } else if (endDateParam) {
    where.created_at = LessThanOrEqual(new Date(endDateParam));
  }

  const [mouvements, total] = await db.getRepository(Mouvement).findAndCount({
    where,
    relations: { article: true },
    order: { created_at: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return Response.json({
    items: mouvements,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });
  const body = await request.json();

  const { type, quantite, article_id, utilisateur, projet, technicien, commentaire } = body;
  if (!type || !quantite || !article_id || !utilisateur) {
    return Response.json({ message: 'Champs requis manquants' }, { status: 400 });
  }
  if (!Object.values(MouvementType).includes(type)) {
    return Response.json({ message: 'Type de mouvement invalide' }, { status: 400 });
  }

  const db = await getDb();
  const articleRepo = db.getRepository(Article);
  const article = await articleRepo.findOne({ where: { id: article_id, tenant_id: tenantId } });
  if (!article) return Response.json({ message: 'Article introuvable' }, { status: 404 });

  if (type === MouvementType.SORTIE) {
    const newQty = (article.quantite_stock ?? 0) - Number(quantite);
    article.quantite_stock = Math.max(0, newQty);
  } else {
    article.quantite_stock = (article.quantite_stock ?? 0) + Number(quantite);
  }
  await articleRepo.save(article);

  const mouvement = db.getRepository(Mouvement).create({
    tenant_id: tenantId,
    article,
    type,
    quantite: Number(quantite),
    utilisateur,
    projet,
    technicien,
    commentaire,
  });
  const saved = await db.getRepository(Mouvement).save(mouvement);

  await Promise.all([
    publishChange(tenantId, 'mouvement', 'create', saved),
    publishChange(tenantId, 'article', 'update', article),
  ]);

  await notifyStockAlerts(db, tenantId, [article]);

  return Response.json(saved, { status: 201 });
});
