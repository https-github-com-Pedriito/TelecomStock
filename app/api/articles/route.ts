import { NextRequest } from 'next/server';
import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Article } from '@/entities/Article';
import { UserRole } from '@/entities/User';
import { publishChange } from '@/lib/realtime';

export const GET = withAuth(async (_request, auth) => {
  const tenantId = requireTenant(auth);
  const db = await getDb();
  const articles = await db.getRepository(Article).find({
    where: tenantId ? { tenant_id: tenantId } : {},
  });
  return Response.json(articles);
});

export const POST = withAuth(async (request: NextRequest, auth) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  if (!tenantId) return Response.json({ message: 'Aucun tenant sélectionné' }, { status: 403 });

  const body = await request.json();
  if (!body.nom) return Response.json({ message: 'Le nom est requis' }, { status: 400 });

  const db = await getDb();
  const repo = db.getRepository(Article);

  const article = repo.create({
    tenant_id: tenantId,
    nom: body.nom,
    categorie: body.categorie,
    fournisseur: body.fournisseur,
    localisation: body.localisation,
    seuil_minimum: body.seuil_minimum ?? 0,
    quantite_stock: body.quantite_stock ?? 0,
    prix_unitaire: body.prix_unitaire,
    code_barres: body.code_barres,
    image_url: body.image_url,
  });

  const saved = await repo.save(article);
  await publishChange(tenantId, 'article', 'create', saved);
  return Response.json(saved, { status: 201 });
});
