import { withAuth, requireRole, requireTenant } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Inventaire } from '@/entities/Inventaire';
import { InventaireEntry } from '@/entities/InventaireEntry';
import { UserRole } from '@/entities/User';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>(async (_request, auth, { params }) => {
  requireRole(auth, UserRole.ADMIN, UserRole.MANAGER);
  const tenantId = requireTenant(auth);
  const { id } = await params;
  const db = await getDb();

  const inventaire = await db.getRepository(Inventaire).findOne({
    where: tenantId ? { id, tenant_id: tenantId } : { id },
  });
  if (!inventaire) return Response.json({ message: 'Inventaire introuvable' }, { status: 404 });

  const entries = await db.getRepository(InventaireEntry).find({
    where: tenantId ? { inventaire_id: id, tenant_id: tenantId } : { inventaire_id: id },
    relations: { article: true },
  });

  // CSV export
  const header = 'Article,Catégorie,Quantité théorique,Quantité comptée,Écart,Commentaire\n';
  const rows = entries.map(e => {
    const ecart = e.quantite_comptee - e.quantite_theorique;
    const nom = `"${e.article?.nom ?? ''}"`;
    const cat = `"${e.article?.categorie ?? ''}"`;
    return `${nom},${cat},${e.quantite_theorique},${e.quantite_comptee},${ecart},"${e.commentaire ?? ''}"`;
  });
  const csv = header + rows.join('\n');
  const filename = `inventaire-${inventaire.nom.replace(/\s+/g, '-')}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
