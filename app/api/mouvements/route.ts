import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Mouvement, MouvementType } from '@/entities/Mouvement';
import { Article } from '@/entities/Article';
import { User, UserRole } from '@/entities/User';
import { Tenant } from '@/entities/Tenant';
import { publishChange } from '@/lib/realtime';
import { sendStockAlertEmail } from '@/lib/mailer';
import { getStockLevel } from '@/lib/stock';

export const GET = withAuth(async (_request, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const mouvements = await db.getRepository(Mouvement).find({
    where: tenantId ? { tenant_id: tenantId } : {},
    relations: { article: true },
    order: { created_at: 'DESC' },
  });
  return Response.json(mouvements);
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

  const niveau = getStockLevel(article.quantite_stock, article.seuil_minimum);
  if (niveau !== 'ok') {
    try {
      const [tenant, recipients] = await Promise.all([
        db.getRepository(Tenant).findOne({ where: { id: tenantId } }),
        db.getRepository(User).find({
          where: [
            { tenant_id: tenantId, role: UserRole.ADMIN, is_active: true },
            { tenant_id: tenantId, role: UserRole.MANAGER, is_active: true },
          ],
        }),
      ]);
      const emails = recipients.map(u => u.email).filter(Boolean);
      if (tenant && emails.length > 0) {
        await sendStockAlertEmail(emails, tenant.nom, article.nom, article.quantite_stock, niveau);
      }
    } catch (e) {
      console.error('Erreur envoi email alerte stock:', e);
    }
  }

  return Response.json(saved, { status: 201 });
});
